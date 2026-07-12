import datetime

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

GROUPES_SANGUINS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


class Medecin(models.Model):
    """Profil médecin — créé par l'admin de l'établissement (comptes en cascade)."""

    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente", _("En attente")
        ACTIF = "actif", _("Actif")
        SUSPENDU = "suspendu", _("Suspendu")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="medecin",
        verbose_name=_("utilisateur"),
    )
    numero_ordre = models.CharField(_("numéro d'ordre"), max_length=50, unique=True)
    specialite = models.CharField(_("spécialité"), max_length=100)
    statut = models.CharField(
        _("statut"), max_length=12, choices=Statut.choices, default=Statut.EN_ATTENTE
    )
    date_creation = models.DateTimeField(_("date de création"), auto_now_add=True)

    class Meta:
        verbose_name = _("médecin")
        verbose_name_plural = _("médecins")

    def __str__(self):
        return f"Dr. {self.user}"


class Patient(models.Model):
    """Profil patient — créé par un médecin. Contenu médical, jamais visible par l'admin."""

    class Sexe(models.TextChoices):
        M = "M", _("Masculin")
        F = "F", _("Féminin")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="patient",
        verbose_name=_("utilisateur"),
    )
    ddn = models.DateField(_("date de naissance"))
    sexe = models.CharField(_("sexe"), max_length=1, choices=Sexe.choices)
    groupe_sanguin = models.CharField(
        _("groupe sanguin"), max_length=3, choices=[(g, g) for g in GROUPES_SANGUINS]
    )
    allergies = models.JSONField(_("allergies"), default=list, blank=True)
    antecedents = models.JSONField(_("antécédents"), default=list, blank=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="patients_crees",
        verbose_name=_("créé par"),
    )
    date_creation = models.DateTimeField(_("date de création"), auto_now_add=True)

    class Meta:
        verbose_name = _("patient")
        verbose_name_plural = _("patients")

    @property
    def numero_mf(self):
        # Le n° MF est l'identifiant de connexion (accounts.User.identifiant) —
        # une seule source de vérité, pas de duplication de colonne.
        return self.user.identifiant

    def age(self):
        aujourdhui = datetime.date.today()
        return aujourdhui.year - self.ddn.year - (
            (aujourdhui.month, aujourdhui.day) < (self.ddn.month, self.ddn.day)
        )

    def __str__(self):
        return f"{self.user} ({self.numero_mf})"


class Ordonnance(models.Model):
    """Ordonnance prescrite par un médecin ayant un accès valide. Le patient la consulte
    en lecture seule et peut l'imprimer. Le statut Active/Expirée découle de date_expiration."""

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="ordonnances", verbose_name=_("patient")
    )
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ordonnances_prescrites",
        verbose_name=_("médecin"),
    )
    date = models.DateField(_("date"), auto_now_add=True)
    date_expiration = models.DateField(_("date d'expiration"))

    class Meta:
        verbose_name = _("ordonnance")
        verbose_name_plural = _("ordonnances")
        ordering = ["-date", "-id"]

    @property
    def est_active(self):
        return self.date_expiration >= datetime.date.today()

    @property
    def reference(self):
        return f"ORD-{self.pk:06d}"

    def __str__(self):
        return f"{self.reference} — {self.patient}"


class OrdonnanceLigne(models.Model):
    """Un médicament prescrit dans une ordonnance."""

    ordonnance = models.ForeignKey(
        Ordonnance, on_delete=models.CASCADE, related_name="lignes", verbose_name=_("ordonnance")
    )
    medicament = models.CharField(_("médicament"), max_length=200)
    dosage = models.CharField(_("dosage"), max_length=100, blank=True)
    frequence = models.CharField(_("fréquence"), max_length=100, blank=True)
    duree = models.CharField(_("durée"), max_length=100, blank=True)

    class Meta:
        verbose_name = _("ligne d'ordonnance")
        verbose_name_plural = _("lignes d'ordonnance")
        ordering = ["id"]

    def __str__(self):
        return f"{self.medicament} {self.dosage}".strip()
