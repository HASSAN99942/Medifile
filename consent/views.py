import datetime
from datetime import timedelta

from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.decorators import role_required
from audit.models import AuditLog, log_action
from medical.models import Ordonnance, OrdonnanceLigne, Patient, RendezVous, Resultat

from .access import a_acces_valide, exige_acces
from .models import DUREE_CHOICES, Acces, Consultation, DemandeAcces

DUREE_VALIDITE_ORDONNANCE_JOURS = 90


def _patients_accessibles_ids(medecin):
    """IDs des patients auxquels le médecin a un accès valide en ce moment
    (vérifié à chaque requête, comme la règle de consentement)."""
    return Acces.objects.filter(
        medecin=medecin, revoque=False, expire_le__gt=timezone.now()
    ).values_list("patient_id", flat=True)

# ── PATIENT ────────────────────────────────────────────────


@role_required("patient")
def mes_acces(request):
    patient = request.user.patient
    demandes_en_attente = (
        DemandeAcces.objects.select_related("medecin")
        .filter(patient=patient, statut=DemandeAcces.Statut.EN_ATTENTE)
        .order_by("-cree_le")
    )
    acces_list = Acces.objects.select_related("medecin").filter(patient=patient).order_by("-accorde_le")
    return render(
        request,
        "consent/mes_acces.html",
        {
            "page_title": "Accès & Consentements",
            "active": "p-acces",
            "demandes_en_attente": demandes_en_attente,
            "acces_list": acces_list,
            "maintenant": timezone.now(),
        },
    )


@role_required("patient")
def approuver_demande(request, pk):
    patient = request.user.patient
    demande = get_object_or_404(DemandeAcces, pk=pk, patient=patient, statut=DemandeAcces.Statut.EN_ATTENTE)
    if request.method == "POST":
        demande.statut = DemandeAcces.Statut.APPROUVEE
        demande.repondu_le = timezone.now()
        demande.save(update_fields=["statut", "repondu_le"])
        Acces.objects.create(
            patient=patient,
            medecin=demande.medecin,
            source=Acces.Source.DEMANDE,
            expire_le=timezone.now() + timedelta(hours=demande.duree_heures),
        )
        log_action(
            AuditLog.Action.APPROBATION_ACCES,
            request=request,
            user=request.user,
            patient_concerne=patient,
            detail=f"{demande.medecin.prenom} {demande.medecin.nom} — {demande.duree_heures}h",
        )
    return redirect("consent:mes_acces")


@role_required("patient")
def refuser_demande(request, pk):
    patient = request.user.patient
    demande = get_object_or_404(DemandeAcces, pk=pk, patient=patient, statut=DemandeAcces.Statut.EN_ATTENTE)
    if request.method == "POST":
        demande.statut = DemandeAcces.Statut.REFUSEE
        demande.repondu_le = timezone.now()
        demande.save(update_fields=["statut", "repondu_le"])
        log_action(
            AuditLog.Action.REFUS_ACCES,
            request=request,
            user=request.user,
            patient_concerne=patient,
            detail=f"{demande.medecin.prenom} {demande.medecin.nom}",
        )
    return redirect("consent:mes_acces")


@role_required("patient")
def revoquer_acces(request, pk):
    patient = request.user.patient
    acces = get_object_or_404(Acces, pk=pk, patient=patient)
    if request.method == "POST" and not acces.revoque:
        acces.revoque = True
        acces.revoque_le = timezone.now()
        acces.save(update_fields=["revoque", "revoque_le"])
        log_action(
            AuditLog.Action.REVOCATION_ACCES,
            request=request,
            user=request.user,
            patient_concerne=patient,
            detail=f"{acces.medecin.prenom} {acces.medecin.nom}",
        )
    return redirect("consent:mes_acces")


@role_required("patient")
def journal(request):
    patient = request.user.patient
    entries = AuditLog.objects.select_related("utilisateur").filter(patient_concerne=patient).order_by("-horodatage")
    return render(
        request,
        "consent/journal.html",
        {"page_title": "Journal d'audit", "active": "p-acces", "entries": entries},
    )


@role_required("patient")
def dossier_patient(request):
    patient = request.user.patient
    consultations = Consultation.objects.select_related("medecin").filter(patient=patient).order_by(
        "-date_consultation"
    )
    return render(
        request,
        "consent/dossier_patient.html",
        {"page_title": "Mon historique médical", "active": "p-histo", "patient": patient, "consultations": consultations},
    )


@role_required("patient")
def mes_ordonnances(request):
    patient = request.user.patient
    ordonnances = (
        Ordonnance.objects.select_related("medecin")
        .prefetch_related("lignes")
        .filter(patient=patient)
        .order_by("-date", "-id")
    )
    return render(
        request,
        "consent/mes_ordonnances.html",
        {"page_title": "Mes ordonnances", "active": "p-ordos", "ordonnances": ordonnances},
    )


@role_required("patient")
def mes_resultats(request):
    patient = request.user.patient
    resultats = Resultat.objects.filter(patient=patient).order_by("-date", "-id")
    return render(
        request,
        "consent/mes_resultats.html",
        {"page_title": "Mes résultats", "active": "p-results", "resultats": resultats},
    )


@role_required("patient")
def mes_rdv(request):
    patient = request.user.patient
    rdvs = RendezVous.objects.select_related("medecin").filter(patient=patient).order_by("-date", "-heure")
    return render(
        request,
        "consent/mes_rdv.html",
        {"page_title": "Mes rendez-vous", "active": "p-rdv", "rdvs": rdvs},
    )


# ── MÉDECIN ────────────────────────────────────────────────


@role_required("medecin")
def medecin_ordonnances(request):
    # Scopé aux patients auxquels le médecin a un accès valide en ce moment.
    ordonnances = (
        Ordonnance.objects.select_related("patient__user", "medecin")
        .prefetch_related("lignes")
        .filter(patient_id__in=_patients_accessibles_ids(request.user))
        .order_by("-date", "-id")
    )
    return render(
        request,
        "consent/medecin_ordonnances.html",
        {"page_title": "Ordonnances", "active": "d-ordos", "ordonnances": ordonnances},
    )


@role_required("medecin")
def medecin_resultats(request):
    patients_accessibles = Patient.objects.select_related("user").filter(
        id__in=_patients_accessibles_ids(request.user)
    )
    erreurs = []
    if request.method == "POST":
        intitule = request.POST.get("intitule", "").strip()
        try:
            patient = patients_accessibles.get(pk=request.POST.get("patient"))
        except (Patient.DoesNotExist, ValueError, TypeError):
            patient = None
            erreurs.append("Patient invalide ou accès non autorisé.")
        if not intitule:
            erreurs.append("L'intitulé de l'examen est requis.")
        if patient and intitule:
            type_examen = request.POST.get("type", Resultat.Type.BIOLOGIE)
            statut = request.POST.get("statut", Resultat.Statut.NORMAL)
            if type_examen not in dict(Resultat.Type.choices):
                type_examen = Resultat.Type.BIOLOGIE
            if statut not in dict(Resultat.Statut.choices):
                statut = Resultat.Statut.NORMAL
            Resultat.objects.create(
                patient=patient,
                medecin=request.user,
                type=type_examen,
                intitule=intitule,
                valeur=request.POST.get("valeur", "").strip(),
                reference=request.POST.get("reference", "").strip(),
                statut=statut,
                laboratoire=request.POST.get("laboratoire", "").strip(),
            )
            log_action(
                AuditLog.Action.AJOUT_RESULTAT,
                request=request,
                user=request.user,
                patient_concerne=patient,
                detail=f"{patient.user.prenom} {patient.user.nom} — {intitule}",
            )
            return redirect("consent:medecin_resultats")

    resultats = (
        Resultat.objects.select_related("patient__user")
        .filter(patient_id__in=_patients_accessibles_ids(request.user))
        .order_by("-date", "-id")
    )
    return render(
        request,
        "consent/medecin_resultats.html",
        {
            "page_title": "Résultats",
            "active": "d-results",
            "resultats": resultats,
            "patients": patients_accessibles,
            "types": Resultat.Type.choices,
            "statuts": Resultat.Statut.choices,
            "erreurs": erreurs,
        },
    )


@role_required("medecin")
def medecin_rdv(request):
    patients_accessibles = Patient.objects.select_related("user").filter(
        id__in=_patients_accessibles_ids(request.user)
    )
    erreurs = []
    if request.method == "POST":
        try:
            patient = patients_accessibles.get(pk=request.POST.get("patient"))
        except (Patient.DoesNotExist, ValueError, TypeError):
            patient = None
            erreurs.append("Patient invalide ou accès non autorisé.")
        try:
            date = datetime.date.fromisoformat(request.POST.get("date", ""))
            heure = datetime.time.fromisoformat(request.POST.get("heure", ""))
        except ValueError:
            date = heure = None
            erreurs.append("Date et heure valides requises.")
        if patient and date and heure:
            RendezVous.objects.create(
                patient=patient,
                medecin=request.user,
                date=date,
                heure=heure,
                motif=request.POST.get("motif", "").strip(),
                salle=request.POST.get("salle", "").strip(),
            )
            log_action(
                AuditLog.Action.AJOUT_RENDEZVOUS,
                request=request,
                user=request.user,
                patient_concerne=patient,
                detail=f"{patient.user.prenom} {patient.user.nom} — {date:%d/%m/%Y} {heure:%H:%M}",
            )
            return redirect("consent:medecin_rdv")

    rdvs = (
        RendezVous.objects.select_related("patient__user")
        .filter(patient_id__in=_patients_accessibles_ids(request.user))
        .order_by("-date", "-heure")
    )
    return render(
        request,
        "consent/medecin_rdv.html",
        {
            "page_title": "Rendez-vous",
            "active": "d-rdv",
            "rdvs": rdvs,
            "patients": patients_accessibles,
            "erreurs": erreurs,
            "aujourdhui": datetime.date.today().isoformat(),
        },
    )


@role_required("medecin")
def dossier_verrouille(request, pk):
    patient = get_object_or_404(Patient.objects.select_related("user"), pk=pk)
    if a_acces_valide(patient, request.user):
        return redirect("consent:dossier_medecin", pk=pk)

    demande_en_attente = DemandeAcces.objects.filter(
        medecin=request.user, patient=patient, statut=DemandeAcces.Statut.EN_ATTENTE
    ).first()

    erreurs = []
    if request.method == "POST" and demande_en_attente is None:
        motif = request.POST.get("motif", "")
        try:
            duree_heures = int(request.POST.get("duree_heures", 0))
        except ValueError:
            duree_heures = 0

        if motif not in dict(DemandeAcces.Motif.choices):
            erreurs.append("Motif invalide.")
        if duree_heures not in dict(DUREE_CHOICES):
            erreurs.append("Durée invalide.")

        if not erreurs:
            DemandeAcces.objects.create(
                medecin=request.user,
                patient=patient,
                motif=motif,
                duree_heures=duree_heures,
            )
            log_action(
                AuditLog.Action.DEMANDE_ACCES,
                request=request,
                user=request.user,
                patient_concerne=patient,
                detail=f"{patient.user.prenom} {patient.user.nom} — {motif} ({duree_heures}h)",
            )
            demande_en_attente = DemandeAcces.objects.filter(
                medecin=request.user, patient=patient, statut=DemandeAcces.Statut.EN_ATTENTE
            ).first()

    return render(
        request,
        "consent/dossier_verrouille.html",
        {
            "page_title": "Dossier patient",
            "active": "d-patients",
            "patient": patient,
            "demande_en_attente": demande_en_attente,
            "erreurs": erreurs,
            "motifs": DemandeAcces.Motif.choices,
            "durees": DUREE_CHOICES,
        },
    )


@exige_acces
def dossier_medecin(request, patient):
    log_action(
        AuditLog.Action.ACCES_DOSSIER,
        request=request,
        user=request.user,
        patient_concerne=patient,
        detail=f"{patient.user.prenom} {patient.user.nom}",
    )
    consultations = Consultation.objects.select_related("medecin").filter(patient=patient).order_by(
        "-date_consultation"
    )
    ordonnances = (
        Ordonnance.objects.select_related("medecin")
        .prefetch_related("lignes")
        .filter(patient=patient)
        .order_by("-date", "-id")
    )
    return render(
        request,
        "consent/dossier_medecin.html",
        {
            "page_title": "Dossier patient",
            "active": "d-patients",
            "patient": patient,
            "consultations": consultations,
            "ordonnances": ordonnances,
        },
    )


@exige_acces
def ajouter_consultation(request, patient):
    if request.method == "POST":
        Consultation.objects.create(
            patient=patient,
            medecin=request.user,
            motif=request.POST.get("motif", "").strip(),
            diagnostic=request.POST.get("diagnostic", "").strip(),
            traitement=request.POST.get("traitement", "").strip(),
            notes=request.POST.get("notes", "").strip(),
            ta=request.POST.get("ta", "").strip(),
            spo2=request.POST.get("spo2") or None,
        )
    return redirect("consent:dossier_medecin", pk=patient.pk)


@exige_acces
def ajouter_ordonnance(request, patient):
    if request.method == "POST":
        try:
            validite = int(request.POST.get("validite_jours", DUREE_VALIDITE_ORDONNANCE_JOURS))
        except (ValueError, TypeError):
            validite = DUREE_VALIDITE_ORDONNANCE_JOURS
        if validite < 1:
            validite = DUREE_VALIDITE_ORDONNANCE_JOURS

        medicaments = request.POST.getlist("medicament")
        dosages = request.POST.getlist("dosage")
        frequences = request.POST.getlist("frequence")
        durees = request.POST.getlist("duree")
        lignes = [
            (m.strip(), d.strip(), f.strip(), du.strip())
            for m, d, f, du in zip(medicaments, dosages, frequences, durees)
            if m.strip()
        ]

        if lignes:
            ordonnance = Ordonnance.objects.create(
                patient=patient,
                medecin=request.user,
                date_expiration=timezone.now().date() + timedelta(days=validite),
            )
            OrdonnanceLigne.objects.bulk_create(
                [
                    OrdonnanceLigne(
                        ordonnance=ordonnance, medicament=m, dosage=d, frequence=f, duree=du
                    )
                    for m, d, f, du in lignes
                ]
            )
            log_action(
                AuditLog.Action.AJOUT_ORDONNANCE,
                request=request,
                user=request.user,
                patient_concerne=patient,
                detail=f"{patient.user.prenom} {patient.user.nom} — {len(lignes)} médicament(s)",
            )
    return redirect("consent:dossier_medecin", pk=patient.pk)
