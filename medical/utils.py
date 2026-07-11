import datetime

from django.utils.crypto import get_random_string

from accounts.models import User

# Alphabet sans caractères ambigus (0/O, 1/I/l) pour un mot de passe imprimé lisible.
ALPHABET_MDP = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generer_mot_de_passe_provisoire():
    return get_random_string(10, allowed_chars=ALPHABET_MDP)


def generer_numero_mf():
    """Génère le prochain numéro MF-<année>-XXXXXX, séquentiel par année."""
    annee = datetime.date.today().year
    prefixe = f"MF-{annee}-"
    dernier = (
        User.objects.filter(identifiant__startswith=prefixe)
        .order_by("-identifiant")
        .first()
    )
    dernier_num = int(dernier.identifiant.rsplit("-", 1)[-1]) if dernier and dernier.identifiant else 0
    return f"{prefixe}{dernier_num + 1:06d}"
