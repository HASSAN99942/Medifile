from django.conf import settings
from django.test import TestCase
from django.urls import reverse

from audit.models import AuditLog
from medical.models import Medecin

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


class ParametresMedecinTests(TestCase):
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
            langue="fr",
        )
        Medecin.objects.create(user=self.medecin, numero_ordre="ORD-001", specialite="Cardiologie")
        self.client.login(username="doc@chu.cm", password="MotDePasseMedecin123")

    def test_page_accessible_au_medecin(self):
        response = self.client.get(reverse("accounts:parametres"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Mon profil médecin")

    def test_patient_ne_peut_pas_acceder(self):
        User.objects.create_user(
            username="MF-2026-000001",
            identifiant="MF-2026-000001",
            password="MotDePassePatient123",
            role=User.Role.PATIENT,
            actif=True,
        )
        self.client.logout()
        self.client.login(username="MF-2026-000001", password="MotDePassePatient123")
        response = self.client.get(reverse("accounts:parametres"))
        self.assertEqual(response.status_code, 403)

    def test_modifier_profil_et_langue(self):
        response = self.client.post(
            reverse("accounts:parametres"),
            {"form": "profil", "prenom": "Awa", "nom": "Ngoma", "email": "awa@chu.cm", "langue": "en"},
        )
        self.assertRedirects(response, reverse("accounts:parametres"))
        self.medecin.refresh_from_db()
        self.assertEqual(self.medecin.prenom, "Awa")
        self.assertEqual(self.medecin.nom, "Ngoma")
        self.assertEqual(self.medecin.email, "awa@chu.cm")
        self.assertEqual(self.medecin.langue, "en")
        # La langue est appliquée immédiatement via le cookie lu par LocaleMiddleware.
        self.assertEqual(response.cookies[settings.LANGUAGE_COOKIE_NAME].value, "en")
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.MODIFICATION_PROFIL, utilisateur=self.medecin
            ).exists()
        )

    def test_email_deja_utilise_refuse(self):
        User.objects.create_user(
            username="autre@chu.cm", email="autre@chu.cm", password="x", role=User.Role.MEDECIN, actif=True
        )
        response = self.client.post(
            reverse("accounts:parametres"),
            {"form": "profil", "prenom": "Amara", "nom": "Kone", "email": "autre@chu.cm", "langue": "fr"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "déjà utilisé")
        self.medecin.refresh_from_db()
        self.assertEqual(self.medecin.email, "doc@chu.cm")

    def test_changer_mot_de_passe_correct(self):
        response = self.client.post(
            reverse("accounts:parametres"),
            {
                "form": "motdepasse",
                "mdp_actuel": "MotDePasseMedecin123",
                "mdp_nouveau": "NouveauMdp2026",
                "mdp_confirmation": "NouveauMdp2026",
            },
        )
        self.assertRedirects(response, reverse("accounts:parametres"))
        self.medecin.refresh_from_db()
        self.assertTrue(self.medecin.check_password("NouveauMdp2026"))
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.CHANGEMENT_MDP, utilisateur=self.medecin
            ).exists()
        )

    def test_changer_mot_de_passe_mauvais_actuel(self):
        response = self.client.post(
            reverse("accounts:parametres"),
            {
                "form": "motdepasse",
                "mdp_actuel": "FauxMotDePasse",
                "mdp_nouveau": "NouveauMdp2026",
                "mdp_confirmation": "NouveauMdp2026",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "actuel est incorrect")
        self.medecin.refresh_from_db()
        self.assertTrue(self.medecin.check_password("MotDePasseMedecin123"))
