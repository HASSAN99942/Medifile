from django.urls import path

from . import views

app_name = "consent"

urlpatterns = [
    path("mon-dossier/", views.dossier_patient, name="dossier_patient"),
    path("mes-ordonnances/", views.mes_ordonnances, name="mes_ordonnances"),
    path("mes-acces/", views.mes_acces, name="mes_acces"),
    path("mes-acces/<int:pk>/approuver/", views.approuver_demande, name="approuver_demande"),
    path("mes-acces/<int:pk>/refuser/", views.refuser_demande, name="refuser_demande"),
    path("mes-acces/<int:pk>/revoquer/", views.revoquer_acces, name="revoquer_acces"),
    path("journal/", views.journal, name="journal"),
    path("ordonnances/", views.medecin_ordonnances, name="medecin_ordonnances"),
    path("dossier/<int:pk>/", views.dossier_medecin, name="dossier_medecin"),
    path("dossier/<int:pk>/verrouille/", views.dossier_verrouille, name="dossier_verrouille"),
    path("dossier/<int:pk>/consultation/", views.ajouter_consultation, name="ajouter_consultation"),
    path("dossier/<int:pk>/ordonnance/", views.ajouter_ordonnance, name="ajouter_ordonnance"),
]
