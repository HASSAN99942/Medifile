from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.utils import timezone

from accounts.models import Etablissement
from consent.models import Acces, Consultation, DemandeAcces
from medical.models import Medecin, Ordonnance, Patient, RendezVous

SIDEBAR_TEMPLATES = {
    "admin": "partials/sidebar_admin.html",
    "medecin": "partials/sidebar_medecin.html",
    "patient": "partials/sidebar_patient.html",
}

ACTIVE_HOME = {
    "admin": "a-home",
    "medecin": "d-home",
    "patient": "p-home",
}


def _carte(cls, label, value, sub, ico):
    return {"cls": cls, "label": label, "value": value, "sub": sub, "ico": ico}


def _cartes_medecin(user, now, today):
    # Ses patients = ceux qu'il a créés OU auxquels il a un accès valide en ce moment.
    patient_ids = set(Patient.objects.filter(cree_par=user).values_list("id", flat=True))
    patient_ids |= set(
        Acces.objects.filter(medecin=user, revoque=False, expire_le__gt=now).values_list(
            "patient_id", flat=True
        )
    )
    rdvs_jour = RendezVous.objects.filter(medecin=user, date=today).order_by("heure")
    premier = rdvs_jour.first()
    sub_rdv = f"Premier à {premier.heure:%H:%M}" if premier else "Aucun aujourd'hui"
    return [
        _carte("sc-teal", "Mes patients", len(patient_ids), "Suivis actifs", "👥"),
        _carte("sc-gold", "RDV aujourd'hui", rdvs_jour.count(), sub_rdv, "📅"),
        _carte("sc-green", "Ordonnances", Ordonnance.objects.filter(medecin=user).count(), "Émises", "💊"),
        _carte("sc-blue", "Consultations", Consultation.objects.filter(medecin=user).count(), "Réalisées", "🩺"),
    ]


def _cartes_admin(now):
    nb_attente = Medecin.objects.filter(statut=Medecin.Statut.EN_ATTENTE).count()
    consultations_30j = Consultation.objects.filter(
        date_consultation__gte=now - timedelta(days=30)
    ).count()
    acces_actifs = Acces.objects.filter(revoque=False, expire_le__gt=now).count()
    return [
        _carte("sc-teal", "Patients", Patient.objects.count(), "Inscrits", "👥"),
        _carte(
            "sc-gold",
            "Médecins actifs",
            Medecin.objects.filter(statut=Medecin.Statut.ACTIF).count(),
            f"{nb_attente} en attente",
            "👨‍⚕️",
        ),
        _carte("sc-green", "Consultations", consultations_30j, "30 derniers jours", "🩺"),
        _carte("sc-blue", "Accès actifs", acces_actifs, "En cours", "🔐"),
    ]


def _cartes_patient(patient, now, today):
    if patient is None:
        return []
    acces_actifs = Acces.objects.filter(
        patient=patient, revoque=False, expire_le__gt=now
    ).count()
    demandes = DemandeAcces.objects.filter(
        patient=patient, statut=DemandeAcces.Statut.EN_ATTENTE
    ).count()
    prochains_rdv = RendezVous.objects.filter(patient=patient, date__gte=today).count()
    ordos_actives = Ordonnance.objects.filter(patient=patient, date_expiration__gte=today).count()
    return [
        _carte("sc-teal", "Accès actifs", acces_actifs, "Consentements actifs", "🔐"),
        _carte("sc-gold", "Demandes en attente", demandes, "À traiter", "⏳"),
        _carte("sc-green", "Prochains RDV", prochains_rdv, "À venir", "📅"),
        _carte("sc-blue", "Ordonnances actives", ordos_actives, "En cours", "💊"),
    ]


@login_required
def home(request):
    """Tableau de bord — sidebar, libellés et compteurs varient selon le rôle connecté."""
    user = request.user
    etablissement = Etablissement.get()
    initiales = (user.prenom[:1] + user.nom[:1]).upper() if user.prenom and user.nom else user.username[:2].upper()
    now = timezone.now()
    today = timezone.localdate()

    if user.role == "admin":
        cartes = _cartes_admin(now)
    elif user.role == "patient":
        cartes = _cartes_patient(getattr(user, "patient", None), now, today)
    else:
        cartes = _cartes_medecin(user, now, today)

    context = {
        "page_title": "Tableau de bord",
        "active": ACTIVE_HOME.get(user.role, "d-home"),
        "sidebar_template": SIDEBAR_TEMPLATES.get(user.role, "partials/sidebar_medecin.html"),
        "nom_complet": str(user),
        "etablissement": etablissement.nom if etablissement else "",
        "avatar": initiales,
        "cartes": cartes,
    }
    return render(request, "core/home.html", context)
