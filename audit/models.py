from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """Journal d'audit : connexions, accès, refus, ajouts, révocations."""

    class Action(models.TextChoices):
        LOGIN = "LOGIN", _("Connexion")
        LOGIN_ECHEC = "LOGIN_ECHEC", _("Échec de connexion")
        LOGOUT = "LOGOUT", _("Déconnexion")
        INSTALLATION = "INSTALLATION", _("Installation")
        CHANGEMENT_MDP = "CHANGEMENT_MDP", _("Changement de mot de passe")

    action = models.CharField(_("action"), max_length=30, choices=Action.choices)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("utilisateur"),
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    identifiant_saisi = models.CharField(_("identifiant saisi"), max_length=150, blank=True)
    adresse_ip = models.GenericIPAddressField(_("adresse IP"), null=True, blank=True)
    detail = models.CharField(_("détail"), max_length=255, blank=True)
    horodatage = models.DateTimeField(_("horodatage"), auto_now_add=True)

    class Meta:
        verbose_name = _("journal d'audit")
        verbose_name_plural = _("journal d'audit")
        ordering = ["-horodatage"]

    def __str__(self):
        return f"{self.horodatage:%Y-%m-%d %H:%M} — {self.get_action_display()}"


def log_action(action, request=None, user=None, identifiant_saisi="", detail=""):
    """Enregistre une entrée dans le journal d'audit."""
    adresse_ip = None
    if request is not None:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        adresse_ip = forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")
    return AuditLog.objects.create(
        action=action,
        utilisateur=user,
        identifiant_saisi=identifiant_saisi,
        adresse_ip=adresse_ip,
        detail=detail,
    )
