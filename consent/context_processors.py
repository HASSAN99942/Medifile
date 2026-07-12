from .models import DemandeAcces


def demandes_en_attente(request):
    """Expose nb_demandes partout — utilisé par le badge de la sidebar patient."""
    user = getattr(request, "user", None)
    if user is not None and user.is_authenticated and getattr(user, "role", None) == "patient":
        patient = getattr(user, "patient", None)
        if patient is not None:
            return {
                "nb_demandes": DemandeAcces.objects.filter(
                    patient=patient, statut=DemandeAcces.Statut.EN_ATTENTE
                ).count()
            }
    return {}
