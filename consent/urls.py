from django.urls import path

from . import views

app_name = "consent"

urlpatterns = [
    path("mon-dossier/", views.dossier_patient, name="dossier_patient"),
    path("generer-code/", views.generer_code, name="generer_code"),
    path("code/<int:pk>/", views.code_resultat, name="code_resultat"),
    path("mes-acces/", views.mes_acces, name="mes_acces"),
    path("mes-acces/<int:pk>/revoquer/", views.revoquer_acces, name="revoquer_acces"),
    path("journal/", views.journal, name="journal"),
    path("dossier/<int:pk>/", views.dossier_medecin, name="dossier_medecin"),
    path("dossier/<int:pk>/verrouille/", views.dossier_verrouille, name="dossier_verrouille"),
    path("dossier/<int:pk>/consultation/", views.ajouter_consultation, name="ajouter_consultation"),
]
