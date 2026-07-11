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


class CodeAutorisation(models.Model):
    """Code temporaire à 6 chiffres généré par le patient. Jamais stocké en clair."""

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="codes_autorisation", verbose_name=_("patient")
    )
    code_hash = models.CharField(_("code (haché)"), max_length=128)
    duree_heures = models.PositiveSmallIntegerField(_("durée de l'accès accordé"), choices=DUREE_CHOICES)
    cree_le = models.DateTimeField(_("créé le"), auto_now_add=True)
    expire_le = models.DateTimeField(_("expire le"))
    utilise = models.BooleanField(_("utilisé"), default=False)
    utilise_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("utilisé par"),
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="codes_utilises",
    )
    utilise_le = models.DateTimeField(_("utilisé le"), null=True, blank=True)

    class Meta:
        verbose_name = _("code d'autorisation")
        verbose_name_plural = _("codes d'autorisation")
        ordering = ["-cree_le"]

    def __str__(self):
        return f"Code pour {self.patient} ({'utilisé' if self.utilise else 'actif'})"


class Acces(models.Model):
    """Autorisation d'un médecin à consulter le dossier d'un patient."""

    class Source(models.TextChoices):
        CREATION = "creation", _("Création du dossier")
        CODE = "code", _("Code d'autorisation")

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
