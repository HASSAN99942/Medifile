import datetime
import re

from django.contrib.auth.hashers import check_password
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from accounts.models import Etablissement, User
from audit.models import AuditLog
from medical.models import Medecin, Patient

from .access import a_acces_valide
from .models import Acces, CodeAutorisation, Consultation
from .utils import creer_code_autorisation


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


class CodeAutorisationModelTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()

    def test_code_hash_ne_stocke_jamais_le_code_en_clair(self):
        code_obj, code_clair = creer_code_autorisation(self.patient, duree_heures=48)
        self.assertNotEqual(code_obj.code_hash, code_clair)
        self.assertTrue(check_password(code_clair, code_obj.code_hash))
        self.assertEqual(len(code_clair), 6)
        self.assertTrue(code_clair.isdigit())

    def test_code_expire_environ_15_minutes_apres_creation(self):
        code_obj, _ = creer_code_autorisation(self.patient, duree_heures=24)
        delta = code_obj.expire_le - code_obj.cree_le
        self.assertAlmostEqual(delta.total_seconds(), 15 * 60, delta=5)

    def test_duree_heures_stockee_correctement(self):
        code_obj, _ = creer_code_autorisation(self.patient, duree_heures=168)
        self.assertEqual(code_obj.duree_heures, 168)


class AccesValideTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()

    def _creer_acces(self, **kwargs):
        defaults = {
            "patient": self.patient,
            "medecin": self.medecin_user,
            "source": Acces.Source.CODE,
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


class MedecinDossierVerrouilleTests(TestCase):
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

    def test_code_valide_avec_bon_numero_mf_cree_acces(self):
        code_obj, code_clair = creer_code_autorisation(self.patient, duree_heures=48)
        response = self.client.post(
            reverse("consent:dossier_verrouille", args=[self.patient.pk]),
            {"numero_mf": self.patient.numero_mf, "code": code_clair},
        )
        self.assertRedirects(response, reverse("consent:dossier_medecin", args=[self.patient.pk]))
        acces = Acces.objects.get(patient=self.patient, medecin=self.medecin_user)
        self.assertFalse(acces.revoque)
        self.assertEqual(acces.source, Acces.Source.CODE)
        delta = acces.expire_le - timezone.now()
        self.assertAlmostEqual(delta.total_seconds(), 48 * 3600, delta=10)

        code_obj.refresh_from_db()
        self.assertTrue(code_obj.utilise)
        self.assertEqual(code_obj.utilise_par, self.medecin_user)

        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.ACCES_ACCORDE, patient_concerne=self.patient).exists()
        )

    def test_code_deja_utilise_ne_fonctionne_plus(self):
        code_obj, code_clair = creer_code_autorisation(self.patient, duree_heures=24)
        code_obj.utilise = True
        code_obj.save(update_fields=["utilise"])
        response = self.client.post(
            reverse("consent:dossier_verrouille", args=[self.patient.pk]),
            {"numero_mf": self.patient.numero_mf, "code": code_clair},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Acces.objects.filter(patient=self.patient, medecin=self.medecin_user).exists())

    def test_code_expire_ne_fonctionne_plus(self):
        code_obj, code_clair = creer_code_autorisation(self.patient, duree_heures=24)
        code_obj.expire_le = timezone.now() - datetime.timedelta(minutes=1)
        code_obj.save(update_fields=["expire_le"])
        response = self.client.post(
            reverse("consent:dossier_verrouille", args=[self.patient.pk]),
            {"numero_mf": self.patient.numero_mf, "code": code_clair},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Acces.objects.filter(patient=self.patient, medecin=self.medecin_user).exists())
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.CODE_ECHEC, patient_concerne=self.patient).exists()
        )

    def test_mauvais_numero_mf_avec_bon_code_echoue(self):
        _, code_clair = creer_code_autorisation(self.patient, duree_heures=24)
        response = self.client.post(
            reverse("consent:dossier_verrouille", args=[self.patient.pk]),
            {"numero_mf": "MF-2026-999999", "code": code_clair},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Acces.objects.filter(patient=self.patient, medecin=self.medecin_user).exists())
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.CODE_ECHEC, patient_concerne=self.patient).exists()
        )

    def test_dossier_accessible_avec_acces_valide_et_log_acces_dossier(self):
        Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.CODE,
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
            source=Acces.Source.CODE,
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


class PatientAccesTests(TestCase):
    def setUp(self):
        self.medecin_user, self.medecin = creer_medecin()
        self.patient_user, self.patient = creer_patient()
        self.client.login(username=self.patient_user.username, password="MotDePassePatient123")

    def test_generer_code_form_affiche(self):
        response = self.client.get(reverse("consent:generer_code"))
        self.assertEqual(response.status_code, 200)

    def test_generer_code_cree_code_hache_et_redirige(self):
        response = self.client.post(reverse("consent:generer_code"), {"duree_heures": "48"})
        self.assertEqual(response.status_code, 302)
        code_obj = CodeAutorisation.objects.get(patient=self.patient)
        self.assertEqual(code_obj.duree_heures, 48)
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.GENERATION_CODE, patient_concerne=self.patient).exists()
        )

    def test_code_affiche_une_seule_fois(self):
        self.client.post(reverse("consent:generer_code"), {"duree_heures": "24"})
        code_obj = CodeAutorisation.objects.get(patient=self.patient)
        url = reverse("consent:code_resultat", args=[code_obj.pk])
        premiere = self.client.get(url)
        self.assertContains(premiere, "code-genere")
        deuxieme = self.client.get(url)
        self.assertNotContains(deuxieme, "code-genere")

    def test_mes_acces_liste_les_acces_du_patient(self):
        Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.CODE,
            expire_le=timezone.now() + datetime.timedelta(hours=24),
        )
        response = self.client.get(reverse("consent:mes_acces"))
        self.assertContains(response, self.medecin_user.nom)

    def test_revoquer_acces(self):
        acces = Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.CODE,
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
            source=Acces.Source.CODE,
            expire_le=timezone.now() + datetime.timedelta(hours=24),
        )
        response = self.client.post(reverse("consent:revoquer_acces", args=[acces.pk]))
        self.assertEqual(response.status_code, 404)

    def test_journal_accessible(self):
        Acces.objects.create(
            patient=self.patient,
            medecin=self.medecin_user,
            source=Acces.Source.CODE,
            expire_le=timezone.now() + datetime.timedelta(hours=24),
        )
        response = self.client.get(reverse("consent:journal"))
        self.assertEqual(response.status_code, 200)

    def test_dossier_patient_lecture_seule_sans_formulaire(self):
        response = self.client.get(reverse("consent:dossier_patient"))
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "<form")


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
    """Scénario bout en bout demandé : création → code → accès → consultation → révocation → blocage."""

    def setUp(self):
        Etablissement.objects.create(nom="CHU Test", ville="Douala")
        self.medecin_user, self.medecin = creer_medecin()

    def test_scenario_complet(self):
        # 1. Le médecin crée le dossier patient (accès 72h automatique).
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

        fiche_url = reverse("medical:medecin_patient_fiche", args=[patient.pk])
        fiche_resp = self.client.get(fiche_url)
        match = re.search(
            r"Mot de passe provisoire.*?<strong[^>]*>([A-Z0-9]+)</strong>", fiche_resp.content.decode()
        )
        self.assertIsNotNone(match)
        mot_de_passe_provisoire = match.group(1)
        self.client.get(reverse("accounts:logout"))

        # 2. Le patient se connecte, doit changer son mot de passe.
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

        # 3. Le patient génère un code 48h.
        self.client.post(reverse("consent:generer_code"), {"duree_heures": "48"})
        code_obj = CodeAutorisation.objects.get(patient=patient)
        code_url = reverse("consent:code_resultat", args=[code_obj.pk])
        code_resp = self.client.get(code_url)
        code_match = re.search(r'id="code-genere"[^>]*>\s*(\d{6})', code_resp.content.decode())
        self.assertIsNotNone(code_match)
        code_clair = code_match.group(1)
        self.client.get(reverse("accounts:logout"))

        # 4. Le médecin saisit n° MF + code, ouvre le dossier, ajoute une consultation.
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")
        # On révoque l'accès de création (72h) pour vérifier que le code est ensuite bien nécessaire.
        Acces.objects.filter(patient=patient, medecin=self.medecin_user).update(
            revoque=True, revoque_le=timezone.now()
        )
        verrouille_resp = self.client.get(reverse("consent:dossier_medecin", args=[patient.pk]))
        self.assertRedirects(verrouille_resp, reverse("consent:dossier_verrouille", args=[patient.pk]))

        deverrouille_resp = self.client.post(
            reverse("consent:dossier_verrouille", args=[patient.pk]),
            {"numero_mf": numero_mf, "code": code_clair},
        )
        self.assertRedirects(deverrouille_resp, reverse("consent:dossier_medecin", args=[patient.pk]))

        self.client.get(reverse("consent:dossier_medecin", args=[patient.pk]))
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

        # 5. Le patient voit tout et révoque l'accès.
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
        self.assertIn(AuditLog.Action.GENERATION_CODE, journal_actions)
        self.assertIn(AuditLog.Action.ACCES_ACCORDE, journal_actions)
        self.assertIn(AuditLog.Action.ACCES_DOSSIER, journal_actions)
        self.assertIn(AuditLog.Action.REVOCATION_ACCES, journal_actions)
        self.assertEqual(journal_resp.status_code, 200)
        self.client.get(reverse("accounts:logout"))

        # 6. Le médecin est de nouveau bloqué.
        self.client.login(username=self.medecin_user.username, password="MotDePasseMedecin123")
        bloque_resp = self.client.get(reverse("consent:dossier_medecin", args=[patient.pk]))
        self.assertRedirects(bloque_resp, reverse("consent:dossier_verrouille", args=[patient.pk]))
