import secrets
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.utils import timezone

from .models import CodeAutorisation

DUREE_CODE_MINUTES = 15


def generer_code_6_chiffres():
    return f"{secrets.randbelow(1_000_000):06d}"


def creer_code_autorisation(patient, duree_heures):
    """Crée un code d'accès temporaire pour le patient. Retourne (objet, code en clair)."""
    code_clair = generer_code_6_chiffres()
    code_obj = CodeAutorisation.objects.create(
        patient=patient,
        code_hash=make_password(code_clair),
        duree_heures=duree_heures,
        expire_le=timezone.now() + timedelta(minutes=DUREE_CODE_MINUTES),
    )
    return code_obj, code_clair
