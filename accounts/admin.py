from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Service, User


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("nom", "statut", "etablissement")
    list_filter = ("statut",)
    search_fields = ("nom",)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "MediFile",
            {
                "fields": (
                    "role",
                    "identifiant",
                    "nom",
                    "prenom",
                    "langue",
                    "actif",
                    "doit_changer_mdp",
                )
            },
        ),
    )
    list_display = ("username", "identifiant", "role", "prenom", "nom", "actif")
    list_filter = UserAdmin.list_filter + ("role", "actif")
    search_fields = ("username", "identifiant", "nom", "prenom")
