from django.contrib import admin

from .models import Medecin

# Patient n'est volontairement PAS enregistré ici : l'admin Django exposerait
# le contenu médical (allergies, antécédents, groupe sanguin), ce que
# CLAUDE.md interdit explicitement pour le rôle admin.


@admin.register(Medecin)
class MedecinAdmin(admin.ModelAdmin):
    list_display = ("user", "numero_ordre", "specialite", "statut", "date_creation")
    list_filter = ("statut", "specialite")
    search_fields = ("user__prenom", "user__nom", "user__email", "numero_ordre")
