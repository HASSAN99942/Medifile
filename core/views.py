from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from accounts.models import Etablissement

SIDEBAR_TEMPLATES = {
    "admin": "partials/sidebar_admin.html",
    "medecin": "partials/sidebar_medecin.html",
    "patient": "partials/sidebar_patient.html",
}

ACTIVE_HOME = {
    "admin": "a-home",
    "medecin": "d-home",
    "patient": "p-home",
}


@login_required
def home(request):
    """Tableau de bord — sidebar et libellés varient selon le rôle connecté."""
    user = request.user
    etablissement = Etablissement.get()
    initiales = (user.prenom[:1] + user.nom[:1]).upper() if user.prenom and user.nom else user.username[:2].upper()
    context = {
        "page_title": "Tableau de bord",
        "active": ACTIVE_HOME.get(user.role, "d-home"),
        "sidebar_template": SIDEBAR_TEMPLATES.get(user.role, "partials/sidebar_medecin.html"),
        "nom_complet": str(user),
        "etablissement": etablissement.nom if etablissement else "",
        "avatar": initiales,
    }
    return render(request, "core/home.html", context)
