import datetime

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from accounts.models import Etablissement, User
from consent.models import Acces, Consultation, DemandeAcces
from medical.models import Medecin, Ordonnance, Patient, RendezVous


def creer_medecin(prenom="Amara", nom="Kone", email="amara@chu.cm", numero_ordre="ORD-001", statut=Medecin.Statut.ACTIF):
    user = User.objects.create_user(
        username=email,
        email=email,
        password="MotDePasseMedecin123",
        prenom=prenom,
        nom=nom,
        role=User.Role.MEDECIN,
        actif=True,
    )
    medecin = Medecin.objects.create(user=user, numero_ordre=numero_ordre, specialite="Cardiologie", statut=statut)
    return user, medecin


def creer_patient(numero_mf="MF-2026-000001", cree_par=None):
    user = User.objects.create_user(
        username=numero_mf,
        identifiant=numero_mf,
        password="MotDePassePatient123",
        prenom="Jean",
        nom="Diallo",
        role=User.Role.PATIENT,
        actif=True,
    )
    patient = Patient.objects.create(
        user=user, ddn=datetime.date(1985, 3, 14), sexe="M", groupe_sanguin="O+", cree_par=cree_par
    )
    return user, patient


def _val(cartes, label):
    return next(c["value"] for c in cartes if c["label"] == label)


class MedecinDashboardTests(TestCase):
    def setUp(self):
        Etablissement.objects.create(nom="CHU Test", ville="Douala")
        self.medecin_user, self.medecin = creer_medecin()
        self.autre_user, self.autre = creer_medecin(prenom="Moussa", nom="Bah", email="moussa@chu.cm", numero_ordre="ORD-002")
        self.now = timezone.now()
        self.today = timezone.localdate()

    def test_compteurs_medecin(self):
        # 2 patients créés par le médecin
        _, p1 = creer_patient(numero_mf="MF-2026-000001", cree_par=self.medecin_user)
        _, p2 = creer_patient(numero_mf="MF-2026-000002", cree_par=self.medecin_user)
        # 1 patient d'un autre médecin, mais accès valide -> compte
        _, p3 = creer_patient(numero_mf="MF-2026-000003", cree_par=self.autre_user)
        Acces.objects.create(patient=p3, medecin=self.medecin_user, source=Acces.Source.DEMANDE, expire_le=self.now + datetime.timedelta(hours=24))
        # 1 patient avec accès expiré -> ne compte pas
        _, p4 = creer_patient(numero_mf="MF-2026-000004", cree_par=self.autre_user)
        Acces.objects.create(patient=p4, medecin=self.medecin_user, source=Acces.Source.DEMANDE, expire_le=self.now - datetime.timedelta(minutes=1))

        # RDV : 1 aujourd'hui, 1 hier
        RendezVous.objects.create(patient=p1, medecin=self.medecin_user, date=self.today, heure=datetime.time(9, 30))
        RendezVous.objects.create(patient=p1, medecin=self.medecin_user, date=self.today - datetime.timedelta(days=1), heure=datetime.time(10, 0))
        # Ordonnance + consultation
        Ordonnance.objects.create(patient=p1, medecin=self.medecin_user, date_expiration=self.today + datetime.timedelta(days=30))
        Consultation.objects.create(patient=p1, medecin=self.medecin_user, motif="Contrôle")

        self.client.force_login(self.medecin_user)
        response = self.client.get(reverse("core:home"))
        self.assertEqual(response.status_code, 200)
        cartes = response.context["cartes"]
        self.assertEqual(_val(cartes, "Mes patients"), 3)
        self.assertEqual(_val(cartes, "RDV aujourd'hui"), 1)
        self.assertEqual(_val(cartes, "Ordonnances"), 1)
        self.assertEqual(_val(cartes, "Consultations"), 1)
        self.assertContains(response, "Premier à 09:30")


class AdminDashboardTests(TestCase):
    def setUp(self):
        Etablissement.objects.create(nom="CHU Test", ville="Douala")
        self.admin = User.objects.create_user(
            username="admin@chu.cm", email="admin@chu.cm", password="MotDePasseAdmin123",
            prenom="Admin", nom="Sys", role=User.Role.ADMIN, actif=True,
        )
        self.now = timezone.now()

    def test_compteurs_admin(self):
        med_user, _ = creer_medecin(statut=Medecin.Statut.ACTIF)
        creer_medecin(prenom="En", nom="Attente", email="att@chu.cm", numero_ordre="ORD-009", statut=Medecin.Statut.EN_ATTENTE)
        _, p1 = creer_patient(numero_mf="MF-2026-000001", cree_par=med_user)
        Consultation.objects.create(patient=p1, medecin=med_user, motif="Récente")
        Acces.objects.create(patient=p1, medecin=med_user, source=Acces.Source.DEMANDE, expire_le=self.now + datetime.timedelta(hours=24))

        self.client.force_login(self.admin)
        response = self.client.get(reverse("core:home"))
        self.assertEqual(response.status_code, 200)
        cartes = response.context["cartes"]
        self.assertEqual(_val(cartes, "Patients"), 1)
        self.assertEqual(_val(cartes, "Médecins actifs"), 1)  # 1 ACTIF (l'autre est EN_ATTENTE)
        self.assertContains(response, "1 en attente")
        self.assertEqual(_val(cartes, "Consultations"), 1)
        self.assertEqual(_val(cartes, "Accès actifs"), 1)


class PatientDashboardTests(TestCase):
    def setUp(self):
        Etablissement.objects.create(nom="CHU Test", ville="Douala")
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient(cree_par=self.medecin_user)
        self.now = timezone.now()
        self.today = timezone.localdate()

    def test_compteurs_patient(self):
        Acces.objects.create(patient=self.patient, medecin=self.medecin_user, source=Acces.Source.DEMANDE, expire_le=self.now + datetime.timedelta(hours=24))
        DemandeAcces.objects.create(patient=self.patient, medecin=self.medecin_user, motif="consultation", duree_heures=24)
        RendezVous.objects.create(patient=self.patient, medecin=self.medecin_user, date=self.today + datetime.timedelta(days=2), heure=datetime.time(9, 0))
        Ordonnance.objects.create(patient=self.patient, medecin=self.medecin_user, date_expiration=self.today + datetime.timedelta(days=10))

        self.client.force_login(self.patient_user)
        response = self.client.get(reverse("core:home"))
        self.assertEqual(response.status_code, 200)
        cartes = response.context["cartes"]
        self.assertEqual(_val(cartes, "Accès actifs"), 1)
        self.assertEqual(_val(cartes, "Demandes en attente"), 1)
        self.assertEqual(_val(cartes, "Prochains RDV"), 1)
        self.assertEqual(_val(cartes, "Ordonnances actives"), 1)
