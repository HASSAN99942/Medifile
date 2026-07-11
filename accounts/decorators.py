from functools import wraps

from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied


def role_required(*roles):
    """Restreint une vue aux utilisateurs connectés ayant l'un des rôles donnés."""

    def decorateur(vue):
        @wraps(vue)
        @login_required
        def enveloppe(request, *args, **kwargs):
            if request.user.role not in roles:
                raise PermissionDenied
            return vue(request, *args, **kwargs)

        return enveloppe

    return decorateur
