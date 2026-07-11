from django.shortcuts import render


def home(request):
    """Page d'accueil de test du socle (layout sidebar + topbar du legacy)."""
    context = {
        "page_title": "Tableau de bord",
        "active": "d-home",
        "nom_complet": "Dr. Démo",
        "specialite": "Médecine générale",
        "etablissement": "Établissement de test",
        "avatar": "DD",
    }
    return render(request, "core/home.html", context)
