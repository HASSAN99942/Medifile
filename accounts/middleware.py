from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse


class ForcerChangementMdpMiddleware:
    """Redirige vers le changement de mot de passe tant que doit_changer_mdp est vrai.
    Vérifié à chaque requête, dans le même esprit que l'expiration des accès patient."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated and user.doit_changer_mdp:
            exempts = {reverse("accounts:changer_mdp"), reverse("accounts:logout")}
            if request.path not in exempts and not request.path.startswith(settings.STATIC_URL):
                return redirect("accounts:changer_mdp")
        return self.get_response(request)
