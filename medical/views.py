from datetime import timedelta

from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.decorators import role_required
from accounts.models import User
from audit.models import AuditLog, log_action
from consent.access import a_acces_valide
from consent.models import Acces

from .models import GROUPES_SANGUINS, Medecin, Patient
from .utils import generer_mot_de_passe_provisoire, generer_numero_mf

DUREE_ACCES_CREATION_HEURES = 72

SPECIALITES = [
    "Médecine Générale",
    "Cardiologie",
    "Pédiatrie",
    "Gynécologie",
    "Chirurgie",
    "Neurologie",
    "Autre",
]


# ── ADMIN : GESTION DES MÉDECINS ──────────────────────────


@role_required("admin")
def admin_medecins(request):
    medecins = Medecin.objects.select_related("user").order_by("-date_creation")
    return render(
        request,
        "medical/admin_medecins.html",
        {"page_title": "Médecins", "active": "a-medecins", "medecins": medecins},
    )


@role_required("admin")
def admin_medecin_creer(request):
    errors = []
    data = {"prenom": "", "nom": "", "email": "", "numero_ordre": "", "specialite": SPECIALITES[0]}

    if request.method == "POST":
        for champ in ("prenom", "nom", "email", "numero_ordre"):
            data[champ] = request.POST.get(champ, "").strip()
        data["specialite"] = request.POST.get("specialite", SPECIALITES[0])

        if not data["prenom"] or not data["nom"]:
            errors.append("Le prénom et le nom sont requis.")
        if not data["email"]:
            errors.append("L'email professionnel est requis.")
        elif User.objects.filter(email__iexact=data["email"]).exists():
            errors.append("Cet email est déjà utilisé.")
        if not data["numero_ordre"]:
            errors.append("Le numéro d'ordre est requis.")
        elif Medecin.objects.filter(numero_ordre=data["numero_ordre"]).exists():
            errors.append("Ce numéro d'ordre est déjà enregistré.")

        if not errors:
            mot_de_passe = generer_mot_de_passe_provisoire()
            user = User.objects.create_user(
                username=data["email"],
                email=data["email"],
                password=mot_de_passe,
                prenom=data["prenom"],
                nom=data["nom"],
                role=User.Role.MEDECIN,
                actif=False,
                doit_changer_mdp=True,
            )
            medecin = Medecin.objects.create(
                user=user,
                numero_ordre=data["numero_ordre"],
                specialite=data["specialite"],
            )
            log_action(
                AuditLog.Action.CREATION_MEDECIN,
                request=request,
                user=request.user,
                detail=f"Dr. {user.prenom} {user.nom} ({data['email']})",
            )
            request.session[f"fiche_medecin_{medecin.pk}"] = {"mot_de_passe": mot_de_passe}
            return redirect("medical:admin_medecin_confirmation", pk=medecin.pk)

    return render(
        request,
        "medical/admin_medecin_creer.html",
        {
            "page_title": "Ajouter un médecin",
            "active": "a-medecins",
            "errors": errors,
            "data": data,
            "specialites": SPECIALITES,
        },
    )


@role_required("admin")
def admin_medecin_confirmation(request, pk):
    medecin = get_object_or_404(Medecin.objects.select_related("user"), pk=pk)
    fiche = request.session.pop(f"fiche_medecin_{medecin.pk}", None)
    return render(
        request,
        "medical/admin_medecin_confirmation.html",
        {
            "page_title": "Médecin créé",
            "active": "a-medecins",
            "medecin": medecin,
            "mot_de_passe": fiche["mot_de_passe"] if fiche else None,
        },
    )


@role_required("admin")
def admin_medecin_valider(request, pk):
    medecin = get_object_or_404(Medecin.objects.select_related("user"), pk=pk)
    if request.method == "POST":
        medecin.statut = Medecin.Statut.ACTIF
        medecin.save(update_fields=["statut"])
        medecin.user.actif = True
        medecin.user.save(update_fields=["actif"])
        log_action(
            AuditLog.Action.VALIDATION_MEDECIN,
            request=request,
            user=request.user,
            detail=f"Dr. {medecin.user.prenom} {medecin.user.nom}",
        )
    return redirect("medical:admin_medecins")


@role_required("admin")
def admin_medecin_suspendre(request, pk):
    medecin = get_object_or_404(Medecin.objects.select_related("user"), pk=pk)
    if request.method == "POST":
        medecin.statut = Medecin.Statut.SUSPENDU
        medecin.save(update_fields=["statut"])
        medecin.user.actif = False
        medecin.user.save(update_fields=["actif"])
        log_action(
            AuditLog.Action.SUSPENSION_MEDECIN,
            request=request,
            user=request.user,
            detail=f"Dr. {medecin.user.prenom} {medecin.user.nom}",
        )
    return redirect("medical:admin_medecins")


# ── ADMIN : PATIENTS (identité + méta seulement, jamais le médical) ──


@role_required("admin")
def admin_patients(request):
    patients = Patient.objects.select_related("user", "cree_par").order_by("-date_creation")
    return render(
        request,
        "medical/admin_patients.html",
        {"page_title": "Patients inscrits", "active": "a-patients", "patients": patients},
    )


# ── ADMIN : STATISTIQUES ──


@role_required("admin")
def admin_stats(request):
    medecins = Medecin.objects.all()
    patients = Patient.objects.all()
    context = {
        "page_title": "Statistiques",
        "active": "a-stats",
        "nb_medecins_actifs": medecins.filter(statut=Medecin.Statut.ACTIF).count(),
        "nb_medecins_attente": medecins.filter(statut=Medecin.Statut.EN_ATTENTE).count(),
        "nb_medecins_suspendus": medecins.filter(statut=Medecin.Statut.SUSPENDU).count(),
        "nb_patients": patients.count(),
        "nb_patients_actifs": patients.filter(user__actif=True).count(),
        "audit_recent": AuditLog.objects.select_related("utilisateur").order_by("-horodatage")[:10],
        "nb_audit_total": AuditLog.objects.count(),
    }
    return render(request, "medical/admin_stats.html", context)


# ── MÉDECIN : PATIENTS ──


@role_required("medecin")
def medecin_patients(request):
    patients = list(Patient.objects.select_related("user").order_by("-date_creation"))
    for patient in patients:
        patient.a_acces = a_acces_valide(patient, request.user)
    return render(
        request,
        "medical/medecin_patients.html",
        {"page_title": "Patients", "active": "d-patients", "patients": patients},
    )


@role_required("medecin")
def medecin_patient_creer(request):
    errors = []
    data = {
        "prenom": "",
        "nom": "",
        "ddn": "",
        "sexe": "M",
        "groupe_sanguin": "O+",
        "allergies": "",
        "antecedents": "",
    }

    if request.method == "POST":
        for champ in ("prenom", "nom", "ddn", "allergies", "antecedents"):
            data[champ] = request.POST.get(champ, "").strip()
        data["sexe"] = request.POST.get("sexe", "M")
        data["groupe_sanguin"] = request.POST.get("groupe_sanguin", "O+")

        if not data["prenom"] or not data["nom"]:
            errors.append("Le prénom et le nom sont requis.")
        if not data["ddn"]:
            errors.append("La date de naissance est requise.")

        if not errors:
            numero_mf = generer_numero_mf()
            mot_de_passe = generer_mot_de_passe_provisoire()
            user = User.objects.create_user(
                username=numero_mf,
                identifiant=numero_mf,
                password=mot_de_passe,
                prenom=data["prenom"],
                nom=data["nom"],
                role=User.Role.PATIENT,
                actif=True,
                doit_changer_mdp=True,
            )
            patient = Patient.objects.create(
                user=user,
                ddn=data["ddn"],
                sexe=data["sexe"],
                groupe_sanguin=data["groupe_sanguin"],
                allergies=[a.strip() for a in data["allergies"].split(",") if a.strip()],
                antecedents=[a.strip() for a in data["antecedents"].split(",") if a.strip()],
                cree_par=request.user,
            )
            # Le médecin qui crée un dossier a un accès de 72h (CLAUDE.md) ; ensuite code obligatoire.
            Acces.objects.create(
                patient=patient,
                medecin=request.user,
                source=Acces.Source.CREATION,
                expire_le=timezone.now() + timedelta(hours=DUREE_ACCES_CREATION_HEURES),
            )
            log_action(
                AuditLog.Action.CREATION_DOSSIER,
                request=request,
                user=request.user,
                patient_concerne=patient,
                detail=f"{user.prenom} {user.nom} ({numero_mf})",
            )
            request.session[f"fiche_patient_{patient.pk}"] = {"mot_de_passe": mot_de_passe}
            return redirect("medical:medecin_patient_fiche", pk=patient.pk)

    return render(
        request,
        "medical/medecin_patient_creer.html",
        {
            "page_title": "Nouveau patient",
            "active": "d-patients",
            "errors": errors,
            "data": data,
            "groupes_sanguins": GROUPES_SANGUINS,
        },
    )


@role_required("medecin")
def medecin_patient_fiche(request, pk):
    patient = get_object_or_404(
        Patient.objects.select_related("user"), pk=pk, cree_par=request.user
    )
    fiche = request.session.pop(f"fiche_patient_{patient.pk}", None)
    return render(
        request,
        "medical/patient_fiche.html",
        {
            "page_title": "Fiche patient",
            "active": "d-patients",
            "patient": patient,
            "mot_de_passe": fiche["mot_de_passe"] if fiche else None,
        },
    )
