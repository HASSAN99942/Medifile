from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("installation/", views.installation, name="installation"),
    path("connexion/", views.login_view, name="login"),
    path("deconnexion/", views.logout_view, name="logout"),
    path("mot-de-passe/", views.changer_mot_de_passe, name="changer_mdp"),
]
