from django.test import TestCase
from django.urls import reverse

from audit.models import AuditLog

from .models import Etablissement, User


class LoginRoleTests(TestCase):
    def setUp(self):
        Etablissement.objects.create(nom="CHU Test", ville="Douala")
        self.medecin = User.objects.create_user(
            username="doc@chu.cm",
            email="doc@chu.cm",
            password="MotDePasseMedecin123",
            prenom="Amara",
            nom="Kone",
            role=User.Role.MEDECIN,
            actif=True,
        )

    def test_connexion_refusee_si_role_ne_correspond_pas(self):
        response = self.client.post(
            reverse("accounts:login"),
            {"identifiant": "doc@chu.cm", "password": "MotDePasseMedecin123", "role": "patient"},
        )
        # Pas de redirection : on reste sur la page de login avec l'erreur.
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "pas un compte patient")
        # L'utilisateur n'est PAS connecté.
        self.assertNotIn("_auth_user_id", self.client.session)
        # Trace LOGIN_ECHEC avec le détail « mauvais rôle ».
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.LOGIN_ECHEC, detail="mauvais rôle", utilisateur=self.medecin
            ).exists()
        )

    def test_connexion_reussie_si_role_correspond(self):
        response = self.client.post(
            reverse("accounts:login"),
            {"identifiant": "doc@chu.cm", "password": "MotDePasseMedecin123", "role": "medecin"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("core:home"))
        self.assertEqual(str(self.client.session["_auth_user_id"]), str(self.medecin.pk))
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.LOGIN, utilisateur=self.medecin).exists()
        )

    def test_mauvais_mot_de_passe_message_generique(self):
        # Ne révèle jamais si l'identifiant existe : message générique, pas de message de rôle.
        response = self.client.post(
            reverse("accounts:login"),
            {"identifiant": "doc@chu.cm", "password": "MauvaisMdp", "role": "medecin"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Identifiant ou mot de passe incorrect")
        self.assertNotContains(response, "pas un compte")
        self.assertNotIn("_auth_user_id", self.client.session)
