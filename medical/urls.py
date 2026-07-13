from django.urls import path

from . import views

app_name = "medical"

urlpatterns = [
    path("medecins/", views.admin_medecins, name="admin_medecins"),
    path("medecins/creer/", views.admin_medecin_creer, name="admin_medecin_creer"),
    path(
        "medecins/<int:pk>/confirmation/",
        views.admin_medecin_confirmation,
        name="admin_medecin_confirmation",
    ),
    path("medecins/<int:pk>/valider/", views.admin_medecin_valider, name="admin_medecin_valider"),
    path(
        "medecins/<int:pk>/suspendre/",
        views.admin_medecin_suspendre,
        name="admin_medecin_suspendre",
    ),
    path("patients-inscrits/", views.admin_patients, name="admin_patients"),
    path("statistiques/", views.admin_stats, name="admin_stats"),
    path("mes-patients/", views.medecin_patients, name="medecin_patients"),
    path("mes-patients/creer/", views.medecin_patient_creer, name="medecin_patient_creer"),
    path(
        "mes-patients/<int:pk>/fiche/",
        views.medecin_patient_fiche,
        name="medecin_patient_fiche",
    ),
]

