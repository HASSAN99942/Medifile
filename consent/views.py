from datetime import timedelta

from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.decorators import role_required
from audit.models import AuditLog, log_action
from medical.models import Patient

from .access import a_acces_valide, exige_acces
from .models import DUREE_CHOICES, Acces, Consultation, DemandeAcces

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


# ── MÉDECIN ────────────────────────────────────────────────


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
