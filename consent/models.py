from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from medical.models import Patient

DUREE_CHOICES = [
    (24, _("24 heures")),
    (48, _("48 heures")),
    (72, _("72 heures")),
    (168, _("7 jours")),
]


class DemandeAcces(models.Model):
    """Demande d'accès envoyée par un médecin — approuvée ou refusée par le patient."""

    class Motif(models.TextChoices):
        CONSULTATION = "consultation", _("Consultation médicale")
        URGENCE = "urgence", _("Urgence médicale")
        BILAN = "bilan", _("Bilan de santé")
        SUIVI = "suivi", _("Suivi de traitement")

    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente", _("En attente")
        APPROUVEE = "approuvee", _("Approuvée")
        REFUSEE = "refusee", _("Refusée")

    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="demandes_envoyees",
        verbose_name=_("médecin"),
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="demandes_acces", verbose_name=_("patient")
    )
    motif = models.CharField(_("motif"), max_length=20, choices=Motif.choices)
    duree_heures = models.PositiveSmallIntegerField(_("durée souhaitée"), choices=DUREE_CHOICES)
    statut = models.CharField(_("statut"), max_length=12, choices=Statut.choices, default=Statut.EN_ATTENTE)
    cree_le = models.DateTimeField(_("créée le"), auto_now_add=True)
    repondu_le = models.DateTimeField(_("répondue le"), null=True, blank=True)

    class Meta:
        verbose_name = _("demande d'accès")
        verbose_name_plural = _("demandes d'accès")
        ordering = ["-cree_le"]

    def __str__(self):
        return f"{self.medecin} → {self.patient} ({self.get_statut_display()})"


class Acces(models.Model):
    """Autorisation d'un médecin à consulter le dossier d'un patient."""

    class Source(models.TextChoices):
        CREATION = "creation", _("Création du dossier")
        DEMANDE = "demande", _("Demande approuvée")

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="acces", verbose_name=_("patient"))
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="acces_accordes",
        verbose_name=_("médecin"),
    )
    source = models.CharField(_("source"), max_length=10, choices=Source.choices)
    accorde_le = models.DateTimeField(_("accordé le"), auto_now_add=True)
    expire_le = models.DateTimeField(_("expire le"))
    revoque = models.BooleanField(_("révoqué"), default=False)
    revoque_le = models.DateTimeField(_("révoqué le"), null=True, blank=True)

    class Meta:
        verbose_name = _("accès")
        verbose_name_plural = _("accès")
        ordering = ["-accorde_le"]

    def __str__(self):
        return f"{self.medecin} → {self.patient}"


class Consultation(models.Model):
    """Consultation ajoutée par un médecin ayant un accès valide."""

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="consultations", verbose_name=_("patient")
    )
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="consultations_realisees",
        verbose_name=_("médecin"),
    )
    motif = models.CharField(_("motif"), max_length=200)
    diagnostic = models.CharField(_("diagnostic"), max_length=300, blank=True)
    traitement = models.CharField(_("traitement"), max_length=300, blank=True)
    notes = models.TextField(_("notes"), blank=True)
    ta = models.CharField(_("tension artérielle"), max_length=20, blank=True)
    spo2 = models.PositiveSmallIntegerField(_("SpO2 (%)"), null=True, blank=True)
    date_consultation = models.DateTimeField(_("date de consultation"), auto_now_add=True)

    class Meta:
        verbose_name = _("consultation")
        verbose_name_plural = _("consultations")
        ordering = ["-date_consultation"]

    def __str__(self):
        return f"{self.motif} — {self.patient} ({self.date_consultation:%Y-%m-%d})"
