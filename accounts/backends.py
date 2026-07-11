from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

from .models import User


class IdentifiantBackend(ModelBackend):
    """Authentifie par nom d'utilisateur, email (médecin/admin) ou numéro MF (patient)."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None
        try:
            user = User.objects.get(
                Q(username__iexact=username)
                | Q(email__iexact=username)
                | Q(identifiant__iexact=username)
            )
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            return None
        if user.check_password(password):
            return user
        return None
