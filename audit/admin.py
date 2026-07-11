from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("horodatage", "action", "utilisateur", "identifiant_saisi", "adresse_ip", "detail")
    list_filter = ("action",)
    search_fields = ("identifiant_saisi", "detail", "utilisateur__username", "utilisateur__email")
    date_hierarchy = "horodatage"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
