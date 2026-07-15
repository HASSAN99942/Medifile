from django.test import TestCase
from django.urls import reverse

from accounts.models import Etablissement, Service, User


class AdminServiceTests(TestCase):
    def setUp(self):
        self.etablissement = Etablissement.objects.create(nom="CHU Test", ville="Douala")
        self.admin = User.objects.create_user(
            username="admin@chu.cm",
            email="admin@chu.cm",
            password="MotDePasseAdmin123",
            prenom="Admin",
            nom="Principal",
            role=User.Role.ADMIN,
            actif=True,
        )
        self.client.login(username="admin@chu.cm", password="MotDePasseAdmin123")

    def test_page_accessible(self):
        response = self.client.get(reverse("medical:admin_etablissement"))
        self.assertEqual(response.status_code, 200)

    def test_creer_service(self):
        response = self.client.post(
            reverse("medical:admin_service_creer"),
            {"nom": "Cardiologie", "statut": "ouvert", "description": "Service cardio"},
        )
        self.assertRedirects(response, reverse("medical:admin_etablissement"))
        service = Service.objects.get(nom="Cardiologie")
        self.assertEqual(service.statut, "ouvert")
        self.assertEqual(service.etablissement, self.etablissement)

    def test_creer_service_sans_nom_ignore(self):
        self.client.post(reverse("medical:admin_service_creer"), {"nom": "", "statut": "ouvert"})
        self.assertEqual(Service.objects.count(), 0)

    def test_modifier_service_change_statut(self):
        service = Service.objects.create(etablissement=self.etablissement, nom="Urgences", statut="ouvert")
        response = self.client.post(
            reverse("medical:admin_service_modifier", args=[service.pk]),
            {"nom": "Urgences", "statut": "maintenance", "description": "En travaux"},
        )
        self.assertRedirects(response, reverse("medical:admin_etablissement"))
        service.refresh_from_db()
        self.assertEqual(service.statut, "maintenance")
        self.assertEqual(service.description, "En travaux")

    def test_supprimer_service(self):
        service = Service.objects.create(etablissement=self.etablissement, nom="Pédiatrie")
        response = self.client.post(reverse("medical:admin_service_supprimer", args=[service.pk]))
        self.assertRedirects(response, reverse("medical:admin_etablissement"))
        self.assertFalse(Service.objects.filter(pk=service.pk).exists())

    def test_medecin_ne_peut_pas_gerer(self):
        medecin = User.objects.create_user(
            username="doc@chu.cm",
            email="doc@chu.cm",
            password="MotDePasseMedecin123",
            role=User.Role.MEDECIN,
            actif=True,
        )
        self.client.logout()
        self.client.login(username="doc@chu.cm", password="MotDePasseMedecin123")
        self.assertEqual(self.client.get(reverse("medical:admin_etablissement")).status_code, 403)
        response = self.client.post(
            reverse("medical:admin_service_creer"), {"nom": "Interdit", "statut": "ouvert"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Service.objects.count(), 0)
