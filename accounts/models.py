from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Utilisateur MediFile : admin, médecin ou patient (comptes en cascade)."""

    class Role(models.TextChoices):
        ADMIN = "admin", _("Administrateur")
        MEDECIN = "medecin", _("Médecin")
        PATIENT = "patient", _("Patient")

    class Langue(models.TextChoices):
        FR = "fr", _("Français")
        EN = "en", _("English")

    role = models.CharField(_("rôle"), max_length=10, choices=Role.choices)
    email = models.EmailField(_("adresse e-mail"), null=True, blank=True)
    # Numéro MF (MF-2026-XXXXXX) — sert d'identifiant de connexion au patient
    identifiant = models.CharField(
        _("numéro MF"), max_length=20, unique=True, null=True, blank=True
    )
    nom = models.CharField(_("nom"), max_length=150, blank=True)
    prenom = models.CharField(_("prénom"), max_length=150, blank=True)
    langue = models.CharField(
        _("langue"), max_length=2, choices=Langue.choices, default=Langue.FR
    )
    actif = models.BooleanField(_("actif"), default=True)
    doit_changer_mdp = models.BooleanField(
        _("doit changer de mot de passe"), default=False
    )

    def __str__(self):
        nom_complet = f"{self.prenom} {self.nom}".strip()
        return nom_complet or self.username


class Etablissement(models.Model):
    """Établissement unique (mono-établissement) — créé une seule fois à l'installation."""

    nom = models.CharField(_("nom"), max_length=200)
    ville = models.CharField(_("ville"), max_length=100, blank=True)
    telephone = models.CharField(_("téléphone"), max_length=30, blank=True)
    email = models.EmailField(_("adresse e-mail"), blank=True)
    date_installation = models.DateTimeField(_("date d'installation"), auto_now_add=True)

    class Meta:
        verbose_name = _("établissement")
        verbose_name_plural = _("établissement")

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise NotImplementedError("L'établissement ne peut pas être supprimé.")

    @classmethod
    def get(cls):
        return cls.objects.first()

    @classmethod
    def est_installe(cls):
        return cls.objects.exists()

    def __str__(self):
        return self.nom
