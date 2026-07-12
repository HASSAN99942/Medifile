import datetime
import re

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from accounts.models import Etablissement, User
from audit.models import AuditLog
from medical.models import Medecin, Ordonnance, OrdonnanceLigne, Patient

from .access import a_acces_valide
from .models import Acces, Consultation, DemandeAcces


def creer_medecin(prenom="Amara", nom="Kone", numero_ordre="ORD-001"):
    user = User.objects.create_user(
        username=f"{prenom}.{nom}@test.cm".lower(),
        email=f"{prenom}.{nom}@test.cm".lower(),
        password="MotDePasseMedecin123",
        prenom=prenom,
        nom=nom,
        role=User.Role.MEDECIN,
        actif=True,
    )
    medecin = Medecin.objects.create(user=user, numero_ordre=numero_ordre, specialite="Cardiologie")
    return user, medecin


def creer_patient(prenom="Jean", nom="Diallo", cree_par=None, numero_mf="MF-2026-000001"):
    user = User.objects.create_user(
        username=numero_mf,
        identifiant=numero_mf,
        password="MotDePassePatient123",
        prenom=prenom,
        nom=nom,
        role=User.Role.PATIENT,
        actif=True,
    )
    patient = Patient.objects.create(
        user=user,
        ddn=datetime.date(1985, 3, 14),
        sexe="M",
        groupe_sanguin="O+",
        allergies=["Pénicilline"],
        antecedents=["Diabète"],
        cree_par=cree_par,
    )
    return user, patient


class DemandeAccesModelTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()

    def test_demande_en_attente_par_defaut(self):
        demande = DemandeAcces.objects.create(
            medecin=self.medecin_user,
            patient=self.patient,
            motif=DemandeAcces.Motif.CONSULTATION,
            duree_heures=48,
        )
        self.assertEqual(demande.statut, DemandeAcces.Statut.EN_ATTENTE)
        self.assertIsNone(demande.repondu_le)


class AccesValideTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()

    def _creer_acces(self, **kwargs):
        defaults = {
            "patient": self.patient,
            "medecin": self.medecin_user,
            "source": Acces.Source.DEMANDE,
            "expire_le": timezone.now() + datetime.timedelta(hours=48),
            "revoque": False,
        }
        defaults.update(kwargs)
        return Acces.objects.create(**defaults)

    def test_aucun_acces_est_invalide(self):
        self.assertFalse(a_acces_valide(self.patient, self.medecin_user))

    def test_acces_non_revoque_et_non_expire_est_valide(self):
        self._creer_acces()
        self.assertTrue(a_acces_valide(self.patient, self.medecin_user))

    def test_acces_revoque_est_invalide_meme_non_expire(self):
        self._creer_acces(revoque=True, revoque_le=timezone.now())
        self.assertFalse(a_acces_valide(self.patient, self.medecin_user))

    def test_acces_expire_est_invalide_meme_non_revoque(self):
        self._creer_acces(expire_le=timezone.now() - datetime.timedelta(minutes=1))
        self.assertFalse(a_acces_valide(self.patient, self.medecin_user))

    def test_acces_dun_autre_medecin_ne_compte_pas(self):
        autre_user, _ = creer_medecin(prenom="Moussa", nom="Bah", numero_ordre="ORD-002")
        self._creer_acces()
        self.assertFalse(a_acces_valide(self.patient, autre_user))


class MedecinRechercheTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        _, self.patient1 = creer_patient(prenom="Jean", nom="Diallo", numero_mf="MF-2026-000001")
        _, self.patient2 = creer_patient(prenom="Awa", nom="Ngoma", numero_mf="MF-2026-000002")
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")

    def test_liste_sans_recherche_montre_tous_les_patients(self):
        response = self.client.get(reverse("medical:medecin_patients"))
        self.assertContains(response, "Diallo")
        self.assertContains(response, "Ngoma")

    def test_recherche_par_nom_filtre_la_liste(self):
        response = self.client.get(reverse("medical:medecin_patients"), {"q": "Diallo"})
        self.assertContains(response, "Diallo")
        self.assertNotContains(response, "Ngoma")

    def test_recherche_par_numero_mf(self):
        response = self.client.get(reverse("medical:medecin_patients"), {"q": "MF-2026-000002"})
        self.assertContains(response, "Ngoma")
        self.assertNotContains(response, "Diallo")


class MedecinDemandeAccesTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")

    def test_dossier_redirige_vers_verrouille_sans_acces(self):
        response = self.client.get(reverse("consent:dossier_medecin", args=[self.patient.pk]))
        self.assertRedirects(response, reverse("consent:dossier_verrouille", args=[self.patient.pk]))
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.ACCES_REFUSE, patient_concerne=self.patient).exists()
        )

    def test_dossier_verrouille_affiche_page_de_verrouillage(self):
        response = self.client.get(reverse("consent:dossier_verrouille", args=[self.patient.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "verrouill")

    def test_envoyer_demande_cree_demande_en_attente(self):
        response = self.client.post(
            reverse("consent:dossier_verrouille", args=[self.patient.pk]),
            {"motif": "consultation", "duree_heures": "48"},
        )
        self.assertEqual(response.status_code, 200)
        demande = DemandeAcces.objects.get(medecin=self.medecin_user, patient=self.patient)
        self.assertEqual(demande.statut, DemandeAcces.Statut.EN_ATTENTE)
        self.assertEqual(demande.duree_heures, 48)
        self.assertEqual(demande.motif, "consultation")
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.DEMANDE_ACCES, patient_concerne=self.patient).exists()
        )

    def test_demande_en_attente_affiche_message_dattente_pas_le_formulaire(self):
        DemandeAcces.objects.create(
            medecin=self.medecin_user, patient=self.patient, motif="consultation", duree_heures=24
        )
        response = self.client.get(reverse("consent:dossier_verrouille", args=[self.patient.pk]))
        self.assertContains(response, "attente")
        self.assertNotContains(response, "<form")

    def test_ne_peut_pas_envoyer_deux_demandes_en_attente(self):
        self.client.post(
            reverse("consent:dossier_verrouille", args=[self.patient.pk]),
            {"motif": "consultation", "duree_heures": "48"},
        )
        self.client.post(
            reverse("consent:dossier_verrouille", args=[self.patient.pk]),
            {"motif": "urgence", "duree_heures": "24"},
        )
        self.assertEqual(
            DemandeAcces.objects.filter(medecin=self.medecin_user, patient=self.patient).count(), 1
        )

    def test_dossier_accessible_avec_acces_valide_et_log_acces_dossier(self):
        Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.DEMANDE,
            expire_le=timezone.now() + datetime.timedelta(hours=48),
        )
        response = self.client.get(reverse("consent:dossier_medecin", args=[self.patient.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.ACCES_DOSSIER, patient_concerne=self.patient).exists()
        )

    def test_ajout_consultation_requiert_acces(self):
        response = self.client.post(
            reverse("consent:ajouter_consultation", args=[self.patient.pk]),
            {"motif": "Douleur", "diagnostic": "RAS", "traitement": "Repos", "notes": "", "ta": "120/80", "spo2": "98"},
        )
        self.assertRedirects(response, reverse("consent:dossier_verrouille", args=[self.patient.pk]))
        self.assertEqual(Consultation.objects.count(), 0)

    def test_ajout_consultation_avec_acces_valide(self):
        Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.DEMANDE,
            expire_le=timezone.now() + datetime.timedelta(hours=48),
        )
        response = self.client.post(
            reverse("consent:ajouter_consultation", args=[self.patient.pk]),
            {
                "motif": "Douleur",
                "diagnostic": "RAS",
                "traitement": "Repos",
                "notes": "Rien à signaler",
                "ta": "120/80",
                "spo2": "98",
            },
        )
        self.assertRedirects(response, reverse("consent:dossier_medecin", args=[self.patient.pk]))
        consultation = Consultation.objects.get(patient=self.patient)
        self.assertEqual(consultation.motif, "Douleur")
        self.assertEqual(consultation.medecin, self.medecin_user)


class PatientDemandeEtAccesTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()
        self.client.login(username=self.patient_user.username, password="MotDePassePatient123")

    def test_mes_acces_liste_demande_en_attente(self):
        DemandeAcces.objects.create(
            medecin=self.medecin_user, patient=self.patient, motif="consultation", duree_heures=48
        )
        response = self.client.get(reverse("consent:mes_acces"))
        self.assertContains(response, self.medecin_user.nom)
        self.assertContains(response, "attente")

    def test_approuver_demande_cree_acces(self):
        demande = DemandeAcces.objects.create(
            medecin=self.medecin_user, patient=self.patient, motif="consultation", duree_heures=48
        )
        response = self.client.post(reverse("consent:approuver_demande", args=[demande.pk]))
        self.assertRedirects(response, reverse("consent:mes_acces"))

        demande.refresh_from_db()
        self.assertEqual(demande.statut, DemandeAcces.Statut.APPROUVEE)
        self.assertIsNotNone(demande.repondu_le)

        acces = Acces.objects.get(patient=self.patient, medecin=self.medecin_user)
        self.assertEqual(acces.source, Acces.Source.DEMANDE)
        self.assertFalse(acces.revoque)
        delta = acces.expire_le - timezone.now()
        self.assertAlmostEqual(delta.total_seconds(), 48 * 3600, delta=10)
        self.assertTrue(a_acces_valide(self.patient, self.medecin_user))

        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.APPROBATION_ACCES, patient_concerne=self.patient).exists()
        )

    def test_refuser_demande_ne_cree_pas_acces(self):
        demande = DemandeAcces.objects.create(
            medecin=self.medecin_user, patient=self.patient, motif="urgence", duree_heures=24
        )
        response = self.client.post(reverse("consent:refuser_demande", args=[demande.pk]))
        self.assertRedirects(response, reverse("consent:mes_acces"))

        demande.refresh_from_db()
        self.assertEqual(demande.statut, DemandeAcces.Statut.REFUSEE)
        self.assertIsNotNone(demande.repondu_le)
        self.assertFalse(Acces.objects.filter(patient=self.patient, medecin=self.medecin_user).exists())
        self.assertFalse(a_acces_valide(self.patient, self.medecin_user))
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.REFUS_ACCES, patient_concerne=self.patient).exists()
        )

    def test_patient_ne_peut_pas_repondre_a_la_demande_dun_autre_patient(self):
        _, autre_patient = creer_patient(prenom="Awa", nom="Sy", numero_mf="MF-2026-000002")
        demande = DemandeAcces.objects.create(
            medecin=self.medecin_user, patient=autre_patient, motif="consultation", duree_heures=24
        )
        response = self.client.post(reverse("consent:approuver_demande", args=[demande.pk]))
        self.assertEqual(response.status_code, 404)

    def test_revoquer_acces(self):
        acces = Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.DEMANDE,
            expire_le=timezone.now() + datetime.timedelta(hours=24),
        )
        response = self.client.post(reverse("consent:revoquer_acces", args=[acces.pk]))
        self.assertRedirects(response, reverse("consent:mes_acces"))
        acces.refresh_from_db()
        self.assertTrue(acces.revoque)
        self.assertIsNotNone(acces.revoque_le)
        self.assertFalse(a_acces_valide(self.patient, self.medecin_user))
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.REVOCATION_ACCES, patient_concerne=self.patient).exists()
        )

    def test_patient_ne_peut_pas_revoquer_acces_dun_autre_patient(self):
        _, autre_patient = creer_patient(prenom="Awa", nom="Sy", numero_mf="MF-2026-000002")
        acces = Acces.objects.create(
            patient=autre_patient,
            medecin=self.medecin_user,
            source=Acces.Source.DEMANDE,
            expire_le=timezone.now() + datetime.timedelta(hours=24),
        )
        response = self.client.post(reverse("consent:revoquer_acces", args=[acces.pk]))
        self.assertEqual(response.status_code, 404)

    def test_journal_accessible(self):
        Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.DEMANDE,
            expire_le=timezone.now() + datetime.timedelta(hours=24),
        )
        response = self.client.get(reverse("consent:journal"))
        self.assertEqual(response.status_code, 200)

    def test_dossier_patient_lecture_seule_sans_formulaire(self):
        response = self.client.get(reverse("consent:dossier_patient"))
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "<form")

    def test_badge_nb_demandes_dans_le_contexte(self):
        DemandeAcces.objects.create(
            medecin=self.medecin_user, patient=self.patient, motif="consultation", duree_heures=24
        )
        response = self.client.get(reverse("consent:dossier_patient"))
        self.assertContains(response, 'class="nb"')

    def test_medecin_peut_renvoyer_une_demande_apres_refus(self):
        demande = DemandeAcces.objects.create(
            medecin=self.medecin_user, patient=self.patient, motif="consultation", duree_heures=24
        )
        self.client.post(reverse("consent:refuser_demande", args=[demande.pk]))
        self.client.logout()
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")
        response = self.client.post(
            reverse("consent:dossier_verrouille", args=[self.patient.pk]),
            {"motif": "suivi", "duree_heures": "72"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            DemandeAcces.objects.filter(medecin=self.medecin_user, patient=self.patient).count(), 2
        )
        self.assertEqual(
            DemandeAcces.objects.filter(
                medecin=self.medecin_user, patient=self.patient, statut=DemandeAcces.Statut.EN_ATTENTE
            ).count(),
            1,
        )


class CreationDossierAccesInitialTests(TestCase):
    """Le médecin qui crée un dossier reçoit un accès de 72h (CLAUDE.md)."""

    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")

    def test_creation_patient_genere_acces_72h(self):
        response = self.client.post(
            reverse("medical:medecin_patient_creer"),
            {
                "prenom": "Jean",
                "nom": "Diallo",
                "ddn": "1985-03-14",
                "sexe": "M",
                "groupe_sanguin": "O+",
                "allergies": "",
                "antecedents": "",
            },
        )
        self.assertEqual(response.status_code, 302)
        patient = Patient.objects.get(user__prenom="Jean", user__nom="Diallo")
        acces = Acces.objects.get(patient=patient, medecin=self.medecin_user)
        self.assertEqual(acces.source, Acces.Source.CREATION)
        delta = acces.expire_le - timezone.now()
        self.assertAlmostEqual(delta.total_seconds(), 72 * 3600, delta=10)
        self.assertTrue(a_acces_valide(patient, self.medecin_user))


class ScenarioCompletTests(TestCase):
    """Scénario demandé : recherche → demande 48h → approbation → dossier + consultation → révocation → blocage."""

    def setUp(self):
        Etablissement.objects.create(nom="CHU Test", ville="Douala")
        self.medecin_user, self.medecin = creer_medecin()

    def test_scenario_complet(self):
        # 1. Le médecin crée le dossier patient (accès 72h automatique), puis on le révoque pour
        #    vérifier que le flux de demande est ensuite bien nécessaire.
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")
        self.client.post(
            reverse("medical:medecin_patient_creer"),
            {
                "prenom": "Jean",
                "nom": "Diallo",
                "ddn": "1985-03-14",
                "sexe": "M",
                "groupe_sanguin": "O+",
                "allergies": "Pénicilline",
                "antecedents": "Diabète",
            },
        )
        patient = Patient.objects.get(user__prenom="Jean", user__nom="Diallo")
        numero_mf = patient.numero_mf
        Acces.objects.filter(patient=patient, medecin=self.medecin_user).update(
            revoque=True, revoque_le=timezone.now()
        )

        fiche_resp = self.client.get(reverse("medical:medecin_patient_fiche", args=[patient.pk]))
        match = re.search(
            r"Mot de passe provisoire.*?<strong[^>]*>([A-Z0-9]+)</strong>", fiche_resp.content.decode()
        )
        self.assertIsNotNone(match)
        mot_de_passe_provisoire = match.group(1)

        # 2. Le médecin recherche le patient par nom.
        recherche_resp = self.client.get(reverse("medical:medecin_patients"), {"q": "Diallo"})
        self.assertContains(recherche_resp, "Diallo")

        # 3. Le médecin envoie une demande d'accès 48h.
        verrouille_resp = self.client.get(reverse("consent:dossier_medecin", args=[patient.pk]))
        self.assertRedirects(verrouille_resp, reverse("consent:dossier_verrouille", args=[patient.pk]))
        self.client.post(
            reverse("consent:dossier_verrouille", args=[patient.pk]),
            {"motif": "consultation", "duree_heures": "48"},
        )
        demande = DemandeAcces.objects.get(medecin=self.medecin_user, patient=patient)
        self.assertEqual(demande.statut, DemandeAcces.Statut.EN_ATTENTE)
        self.client.get(reverse("accounts:logout"))

        # 4. Le patient se connecte, doit changer son mot de passe, voit la demande, et l'approuve.
        login_resp = self.client.post(
            reverse("accounts:login"),
            {"identifiant": numero_mf, "password": mot_de_passe_provisoire},
        )
        self.assertRedirects(login_resp, reverse("accounts:changer_mdp"))
        self.client.post(
            reverse("accounts:changer_mdp"),
            {
                "mdp_actuel": mot_de_passe_provisoire,
                "mdp_nouveau": "NouveauMdpPatient123",
                "mdp_confirmation": "NouveauMdpPatient123",
            },
        )
        mes_acces_resp = self.client.get(reverse("consent:mes_acces"))
        self.assertContains(mes_acces_resp, "Amara")
        self.client.post(reverse("consent:approuver_demande", args=[demande.pk]))
        self.assertTrue(a_acces_valide(patient, self.medecin_user))
        self.client.get(reverse("accounts:logout"))

        # 5. Le médecin ouvre le dossier et ajoute une consultation.
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")
        ouvert_resp = self.client.get(reverse("consent:dossier_medecin", args=[patient.pk]))
        self.assertEqual(ouvert_resp.status_code, 200)
        self.client.post(
            reverse("consent:ajouter_consultation", args=[patient.pk]),
            {
                "motif": "Douleur abdominale",
                "diagnostic": "Gastrite",
                "traitement": "IPP 20mg",
                "notes": "Contrôle dans 2 semaines",
                "ta": "125/82",
                "spo2": "97",
            },
        )
        self.assertEqual(Consultation.objects.filter(patient=patient).count(), 1)
        self.client.get(reverse("accounts:logout"))

        # 6. Le patient voit tout et révoque l'accès.
        self.client.login(username=numero_mf, password="NouveauMdpPatient123")
        dossier_resp = self.client.get(reverse("consent:dossier_patient"))
        self.assertContains(dossier_resp, "Douleur abdominale")

        acces = Acces.objects.get(patient=patient, medecin=self.medecin_user, revoque=False)
        self.client.post(reverse("consent:revoquer_acces", args=[acces.pk]))
        self.assertFalse(a_acces_valide(patient, self.medecin_user))

        journal_resp = self.client.get(reverse("consent:journal"))
        journal_actions = set(
            AuditLog.objects.filter(patient_concerne=patient).values_list("action", flat=True)
        )
        self.assertIn(AuditLog.Action.DEMANDE_ACCES, journal_actions)
        self.assertIn(AuditLog.Action.APPROBATION_ACCES, journal_actions)
        self.assertIn(AuditLog.Action.ACCES_DOSSIER, journal_actions)
        self.assertIn(AuditLog.Action.REVOCATION_ACCES, journal_actions)
        self.assertEqual(journal_resp.status_code, 200)
        self.client.get(reverse("accounts:logout"))

        # 7. Le médecin est de nouveau bloqué.
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")
        bloque_resp = self.client.get(reverse("consent:dossier_medecin", args=[patient.pk]))
        self.assertRedirects(bloque_resp, reverse("consent:dossier_verrouille", args=[patient.pk]))


class OrdonnanceModelTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()

    def test_est_active_true_si_non_expiree(self):
        ordonnance = Ordonnance.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            date_expiration=timezone.now().date() + datetime.timedelta(days=1),
        )
        self.assertTrue(ordonnance.est_active)

    def test_est_active_false_si_expiree(self):
        ordonnance = Ordonnance.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            date_expiration=timezone.now().date() - datetime.timedelta(days=1),
        )
        self.assertFalse(ordonnance.est_active)


class OrdonnanceMedecinTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()
        Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.DEMANDE,
            expire_le=timezone.now() + datetime.timedelta(hours=48),
        )
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")

    def test_creer_ordonnance_multi_medicaments(self):
        response = self.client.post(
            reverse("consent:ajouter_ordonnance", args=[self.patient.pk]),
            {
                "medicament": ["Paracétamol", "Amoxicilline"],
                "dosage": ["1000mg", "500mg"],
                "frequence": ["3x/jour", "2x/jour"],
                "duree": ["5 jours", "7 jours"],
                "validite_jours": "90",
            },
        )
        self.assertRedirects(response, reverse("consent:dossier_medecin", args=[self.patient.pk]))
        ordonnance = Ordonnance.objects.get(patient=self.patient)
        self.assertEqual(ordonnance.medecin, self.medecin_user)
        self.assertEqual(ordonnance.lignes.count(), 2)
        self.assertEqual(
            set(ordonnance.lignes.values_list("medicament", flat=True)),
            {"Paracétamol", "Amoxicilline"},
        )
        self.assertTrue(ordonnance.est_active)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.AJOUT_ORDONNANCE, patient_concerne=self.patient
            ).exists()
        )

    def test_lignes_vides_ignorees(self):
        self.client.post(
            reverse("consent:ajouter_ordonnance", args=[self.patient.pk]),
            {
                "medicament": ["Ibuprofène", ""],
                "dosage": ["200mg", ""],
                "frequence": ["2x/jour", ""],
                "duree": ["3 jours", ""],
                "validite_jours": "30",
            },
        )
        ordonnance = Ordonnance.objects.get(patient=self.patient)
        self.assertEqual(ordonnance.lignes.count(), 1)

    def test_ordonnance_sans_medicament_ne_cree_rien(self):
        self.client.post(
            reverse("consent:ajouter_ordonnance", args=[self.patient.pk]),
            {"medicament": [""], "dosage": [""], "frequence": [""], "duree": [""], "validite_jours": "90"},
        )
        self.assertEqual(Ordonnance.objects.count(), 0)

    def test_date_expiration_calculee(self):
        self.client.post(
            reverse("consent:ajouter_ordonnance", args=[self.patient.pk]),
            {"medicament": ["Doliprane"], "dosage": [""], "frequence": [""], "duree": [""], "validite_jours": "10"},
        )
        ordonnance = Ordonnance.objects.get(patient=self.patient)
        self.assertEqual(
            ordonnance.date_expiration, timezone.now().date() + datetime.timedelta(days=10)
        )

    def test_ordonnance_affichee_dans_dossier(self):
        ordonnance = Ordonnance.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            date_expiration=timezone.now().date() + datetime.timedelta(days=30),
        )
        OrdonnanceLigne.objects.create(ordonnance=ordonnance, medicament="Ventoline", dosage="100µg")
        response = self.client.get(reverse("consent:dossier_medecin", args=[self.patient.pk]))
        self.assertContains(response, "Ventoline")


class OrdonnanceAccesTests(TestCase):
    """Créer une ordonnance exige un accès valide (sous exige_acces)."""

    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")

    def test_creation_ordonnance_sans_acces_bloquee(self):
        response = self.client.post(
            reverse("consent:ajouter_ordonnance", args=[self.patient.pk]),
            {
                "medicament": ["Paracétamol"],
                "dosage": ["1000mg"],
                "frequence": ["3x/jour"],
                "duree": ["5 jours"],
                "validite_jours": "90",
            },
        )
        self.assertRedirects(response, reverse("consent:dossier_verrouille", args=[self.patient.pk]))
        self.assertEqual(Ordonnance.objects.count(), 0)


class OrdonnancePatientTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()
        self.client.login(username=self.patient_user.username, password="MotDePassePatient123")

    def _creer_ordonnance(self, jours=30, medicament="Paracétamol"):
        ordonnance = Ordonnance.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            date_expiration=timezone.now().date() + datetime.timedelta(days=jours),
        )
        OrdonnanceLigne.objects.create(
            ordonnance=ordonnance,
            medicament=medicament,
            dosage="1000mg",
            frequence="3x/jour",
            duree="5 jours",
        )
        return ordonnance

    def test_mes_ordonnances_affiche_les_ordonnances(self):
        self._creer_ordonnance(medicament="Amoxicilline")
        response = self.client.get(reverse("consent:mes_ordonnances"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Amoxicilline")

    def test_badge_active(self):
        self._creer_ordonnance(jours=30)
        response = self.client.get(reverse("consent:mes_ordonnances"))
        self.assertContains(response, "Active")

    def test_badge_expiree(self):
        ordonnance = Ordonnance.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            date_expiration=timezone.now().date() - datetime.timedelta(days=1),
        )
        OrdonnanceLigne.objects.create(ordonnance=ordonnance, medicament="Vieuxmed", dosage="")
        response = self.client.get(reverse("consent:mes_ordonnances"))
        self.assertContains(response, "Expirée")

    def test_mes_ordonnances_lecture_seule_avec_impression(self):
        self._creer_ordonnance()
        response = self.client.get(reverse("consent:mes_ordonnances"))
        self.assertNotContains(response, "<form")
        self.assertContains(response, "window.print()")

    def test_patient_ne_voit_pas_ordonnances_dun_autre(self):
        _, autre_patient = creer_patient(prenom="Awa", nom="Ngoma", numero_mf="MF-2026-000002")
        ordonnance = Ordonnance.objects.create(
            patient=autre_patient,
            medecin=self.medecin_user,
            date_expiration=timezone.now().date() + datetime.timedelta(days=30),
        )
        OrdonnanceLigne.objects.create(ordonnance=ordonnance, medicament="SecretMed", dosage="")
        response = self.client.get(reverse("consent:mes_ordonnances"))
        self.assertNotContains(response, "SecretMed")


class MedecinOrdonnancesListeTests(TestCase):
    """Page « Ordonnances » du médecin : liste scopée aux patients accessibles."""

    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")

    def _creer_ordonnance(self, patient, medicament="Paracétamol"):
        ordonnance = Ordonnance.objects.create(
            patient=patient,
            medecin=self.medecin_user,
            date_expiration=timezone.now().date() + datetime.timedelta(days=30),
        )
        OrdonnanceLigne.objects.create(ordonnance=ordonnance, medicament=medicament)
        return ordonnance

    def test_page_accessible(self):
        response = self.client.get(reverse("consent:medecin_ordonnances"))
        self.assertEqual(response.status_code, 200)

    def test_liste_ordonnances_dun_patient_accessible(self):
        Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.DEMANDE,
            expire_le=timezone.now() + datetime.timedelta(hours=48),
        )
        self._creer_ordonnance(self.patient, medicament="Amoxicilline")
        response = self.client.get(reverse("consent:medecin_ordonnances"))
        self.assertContains(response, "Amoxicilline")

    def test_ordonnance_dun_patient_non_accessible_cachee(self):
        # ordonnance existante mais aucun accès valide → ne doit pas apparaître
        self._creer_ordonnance(self.patient, medicament="SecretMed")
        response = self.client.get(reverse("consent:medecin_ordonnances"))
        self.assertNotContains(response, "SecretMed")

    def test_acces_expire_masque_les_ordonnances(self):
        Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.DEMANDE,
            expire_le=timezone.now() - datetime.timedelta(minutes=1),
        )
        self._creer_ordonnance(self.patient, medicament="ExpiredAccessMed")
        response = self.client.get(reverse("consent:medecin_ordonnances"))
        self.assertNotContains(response, "ExpiredAccessMed")

    def test_patient_ne_peut_pas_acceder(self):
        self.client.logout()
        self.client.login(username=self.patient_user.username, password="MotDePassePatient123")
        response = self.client.get(reverse("consent:medecin_ordonnances"))
        self.assertEqual(response.status_code, 403)
