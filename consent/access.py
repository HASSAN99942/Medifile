from functools import wraps

from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone

from accounts.decorators import role_required
from audit.models import AuditLog, log_action
from medical.models import Patient

from .models import Acces


def a_acces_valide(patient, medecin):
    """SSI un Acces non révoqué ET non expiré existe pour ce couple patient/médecin.
    Interrogé à chaque appel — aucun état mis en cache, aucune tâche planifiée requise."""
    return Acces.objects.filter(
        patient=patient, medecin=medecin, revoque=False, expire_le__gt=timezone.now()
    ).exists()


def exige_acces(vue):
    """Protège une vue (request, pk, ...) : redirige vers le dossier verrouillé si l'accès
    n'est pas valide, en traçant le refus. Injecte le patient déjà résolu dans la vue."""

    @wraps(vue)
    @role_required("medecin")
    def enveloppe(request, pk, *args, **kwargs):
        patient = get_object_or_404(Patient.objects.select_related("user"), pk=pk)
        if not a_acces_valide(patient, request.user):
            log_action(
                AuditLog.Action.ACCES_REFUSE,
                request=request,
                user=request.user,
                patient_concerne=patient,
                detail=f"{patient.user.prenom} {patient.user.nom}",
            )
            return redirect("consent:dossier_verrouille", pk=pk)
        return vue(request, patient, *args, **kwargs)

    return enveloppe
