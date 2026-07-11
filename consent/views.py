from datetime import timedelta

from django.contrib.auth.hashers import check_password
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.decorators import role_required
from audit.models import AuditLog, log_action
from medical.models import Patient

from .access import a_acces_valide, exige_acces
from .models import DUREE_CHOICES, Acces, CodeAutorisation, Consultation
from .utils import creer_code_autorisation

# ── PATIENT ────────────────────────────────────────────────


@role_required("patient")
def generer_code(request):
    patient = request.user.patient
    if request.method == "POST":
        try:
            duree_heures = int(request.POST.get("duree_heures", 24))
        except ValueError:
            duree_heures = 24
        if duree_heures not in dict(DUREE_CHOICES):
            duree_heures = 24
        code_obj, code_clair = creer_code_autorisation(patient, duree_heures)
        log_action(
            AuditLog.Action.GENERATION_CODE,
            request=request,
            user=request.user,
            patient_concerne=patient,
            detail=f"Durée d'accès choisie : {duree_heures}h",
        )
        request.session[f"code_clair_{code_obj.pk}"] = code_clair
        return redirect("consent:code_resultat", pk=code_obj.pk)

    return render(
        request,
        "consent/generer_code.html",
        {"page_title": "Générer un code", "active": "p-acces", "durees": DUREE_CHOICES},
    )


@role_required("patient")
def code_resultat(request, pk):
    code_obj = get_object_or_404(CodeAutorisation, pk=pk, patient=request.user.patient)
    code_clair = request.session.pop(f"code_clair_{code_obj.pk}", None)
    return render(
        request,
        "consent/code_resultat.html",
        {
            "page_title": "Code temporaire",
            "active": "p-acces",
            "code_obj": code_obj,
            "code_clair": code_clair,
        },
    )


@role_required("patient")
def mes_acces(request):
    patient = request.user.patient
    acces_list = Acces.objects.select_related("medecin").filter(patient=patient).order_by("-accorde_le")
    return render(
        request,
        "consent/mes_acces.html",
        {
            "page_title": "Accès & Consentements",
            "active": "p-acces",
            "acces_list": acces_list,
            "maintenant": timezone.now(),
        },
    )


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


# ── MÉDECIN ────────────────────────────────────────────────


@role_required("medecin")
def dossier_verrouille(request, pk):
    patient = get_object_or_404(Patient.objects.select_related("user"), pk=pk)
    if a_acces_valide(patient, request.user):
        return redirect("consent:dossier_medecin", pk=pk)

    erreur = None
    if request.method == "POST":
        numero_mf = request.POST.get("numero_mf", "").strip()
        code = request.POST.get("code", "").strip()

        candidats = CodeAutorisation.objects.filter(patient=patient, utilise=False, expire_le__gt=timezone.now())
        code_obj = next((c for c in candidats if code and check_password(code, c.code_hash)), None)
        mf_ok = bool(numero_mf) and bool(patient.numero_mf) and numero_mf.upper() == patient.numero_mf.upper()

        if mf_ok and code_obj is not None:
            Acces.objects.create(
                patient=patient,
                medecin=request.user,
                source=Acces.Source.CODE,
                expire_le=timezone.now() + timedelta(hours=code_obj.duree_heures),
            )
            code_obj.utilise = True
            code_obj.utilise_par = request.user
            code_obj.utilise_le = timezone.now()
            code_obj.save(update_fields=["utilise", "utilise_par", "utilise_le"])
            log_action(
                AuditLog.Action.ACCES_ACCORDE,
                request=request,
                user=request.user,
                patient_concerne=patient,
                detail=f"Code utilisé — accès {code_obj.duree_heures}h",
            )
            return redirect("consent:dossier_medecin", pk=pk)

        erreur = "Numéro MF ou code invalide, ou code expiré."
        log_action(
            AuditLog.Action.CODE_ECHEC,
            request=request,
            user=request.user,
            patient_concerne=patient,
            identifiant_saisi=numero_mf,
            detail="Échec de validation du code",
        )

    return render(
        request,
        "consent/dossier_verrouille.html",
        {"page_title": "Dossier patient", "active": "d-patients", "patient": patient, "erreur": erreur},
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
    return render(
        request,
        "consent/dossier_medecin.html",
        {
            "page_title": "Dossier patient",
            "active": "d-patients",
            "patient": patient,
            "consultations": consultations,
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
