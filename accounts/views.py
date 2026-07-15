from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.utils import translation

from audit.models import AuditLog, log_action

from .decorators import role_required
from .models import Etablissement, Service, User


def installation(request):
    """Crée l'établissement et le 1er admin. Verrouillée après le 1er usage."""
    if Etablissement.est_installe():
        return redirect("accounts:login")

    errors = []
    data = {
        "etab_nom": "",
        "etab_ville": "",
        "etab_telephone": "",
        "prenom": "",
        "nom": "",
        "email": "",
    }

    if request.method == "POST":
        for champ in data:
            data[champ] = request.POST.get(champ, "").strip()
        password = request.POST.get("password", "")
        password2 = request.POST.get("password2", "")

        if not data["etab_nom"]:
            errors.append("Le nom de l'établissement est requis.")
        if not data["prenom"] or not data["nom"]:
            errors.append("Le prénom et le nom de l'administrateur sont requis.")
        if not data["email"]:
            errors.append("L'email de l'administrateur est requis.")
        elif User.objects.filter(email__iexact=data["email"]).exists():
            errors.append("Cet email est déjà utilisé.")
        if not password:
            errors.append("Le mot de passe est requis.")
        elif len(password) < 8:
            errors.append("Le mot de passe doit contenir au moins 8 caractères.")
        elif password != password2:
            errors.append("Les mots de passe ne correspondent pas.")

        if not errors:
            etablissement = Etablissement.objects.create(
                nom=data["etab_nom"],
                ville=data["etab_ville"],
                telephone=data["etab_telephone"],
            )
            admin_user = User.objects.create_user(
                username=data["email"],
                email=data["email"],
                password=password,
                prenom=data["prenom"],
                nom=data["nom"],
                role=User.Role.ADMIN,
                is_staff=True,
                is_superuser=True,
            )
            log_action(
                AuditLog.Action.INSTALLATION,
                request=request,
                user=admin_user,
                detail=f"Établissement « {etablissement.nom} » créé",
            )
            auth_login(request, admin_user)
            log_action(AuditLog.Action.LOGIN, request=request, user=admin_user)
            return redirect("core:home")

    return render(request, "accounts/installation.html", {"errors": errors, "data": data})


def login_view(request):
    if request.user.is_authenticated:
        return redirect("core:home")
    if not Etablissement.est_installe():
        return redirect("accounts:installation")

    error = None
    identifiant = ""

    if request.method == "POST":
        identifiant = request.POST.get("identifiant", "").strip()
        password = request.POST.get("password", "")
        role_choisi = request.POST.get("role", "")
        user = authenticate(request, username=identifiant, password=password)

        # Libellés des rôles (« Médecin » → « médecin ») pour le message d'erreur.
        libelles_roles = {role.value: str(role.label).lower() for role in User.Role}

        if user is None:
            # Ne révèle jamais si l'identifiant existe.
            error = "Identifiant ou mot de passe incorrect."
            log_action(
                AuditLog.Action.LOGIN_ECHEC,
                request=request,
                identifiant_saisi=identifiant,
                detail="Échec d'authentification",
            )
        elif user.role != role_choisi:
            # Identifiants valides mais rôle sélectionné incorrect : on refuse.
            libelle = libelles_roles.get(role_choisi, "valide")
            error = f"Ce compte n'est pas un compte {libelle}."
            log_action(
                AuditLog.Action.LOGIN_ECHEC,
                request=request,
                user=user,
                identifiant_saisi=identifiant,
                detail="mauvais rôle",
            )
        elif not user.actif:
            error = "Ce compte a été désactivé. Contactez votre administrateur."
            log_action(
                AuditLog.Action.LOGIN_ECHEC,
                request=request,
                user=user,
                identifiant_saisi=identifiant,
                detail="Compte désactivé",
            )
        else:
            auth_login(request, user)
            log_action(AuditLog.Action.LOGIN, request=request, user=user)
            if user.doit_changer_mdp:
                return redirect("accounts:changer_mdp")
            return redirect("core:home")

    return render(request, "accounts/login.html", {"error": error, "identifiant": identifiant})


def logout_view(request):
    if request.user.is_authenticated:
        log_action(AuditLog.Action.LOGOUT, request=request, user=request.user)
        auth_logout(request)
    return redirect("accounts:login")


@role_required("medecin")
def parametres(request):
    """Le médecin modifie lui-même son profil (prénom, nom, email, langue)
    et son mot de passe. Deux formulaires distincts sur la même page."""
    user = request.user
    medecin = getattr(user, "medecin", None)
    profil_errors = []
    mdp_errors = []
    data = {"prenom": user.prenom, "nom": user.nom, "email": user.email or "", "langue": user.langue}

    if request.method == "POST":
        formulaire = request.POST.get("form")

        if formulaire == "profil":
            data["prenom"] = request.POST.get("prenom", "").strip()
            data["nom"] = request.POST.get("nom", "").strip()
            data["email"] = request.POST.get("email", "").strip()
            langue = request.POST.get("langue", user.langue)
            if langue not in dict(User.Langue.choices):
                langue = user.langue
            data["langue"] = langue

            if not data["prenom"] or not data["nom"]:
                profil_errors.append("Le prénom et le nom sont requis.")
            if not data["email"]:
                profil_errors.append("L'email est requis.")
            elif User.objects.filter(email__iexact=data["email"]).exclude(pk=user.pk).exists():
                profil_errors.append("Cet email est déjà utilisé.")

            if not profil_errors:
                user.prenom = data["prenom"]
                user.nom = data["nom"]
                user.email = data["email"]
                user.langue = langue
                user.save(update_fields=["prenom", "nom", "email", "langue"])
                log_action(
                    AuditLog.Action.MODIFICATION_PROFIL,
                    request=request,
                    user=user,
                    detail=f"{user.prenom} {user.nom} ({user.email})",
                )
                # Applique la langue immédiatement (cookie lu par LocaleMiddleware).
                translation.activate(langue)
                messages.success(request, "Profil mis à jour.")
                response = redirect("accounts:parametres")
                response.set_cookie(settings.LANGUAGE_COOKIE_NAME, langue)
                return response

        elif formulaire == "motdepasse":
            actuel = request.POST.get("mdp_actuel", "")
            nouveau = request.POST.get("mdp_nouveau", "")
            confirmation = request.POST.get("mdp_confirmation", "")

            if not user.check_password(actuel):
                mdp_errors.append("Le mot de passe actuel est incorrect.")
            if not nouveau:
                mdp_errors.append("Le nouveau mot de passe est requis.")
            elif len(nouveau) < 8:
                mdp_errors.append("Le nouveau mot de passe doit contenir au moins 8 caractères.")
            elif nouveau != confirmation:
                mdp_errors.append("Les mots de passe ne correspondent pas.")

            if not mdp_errors:
                user.set_password(nouveau)
                user.save(update_fields=["password"])
                update_session_auth_hash(request, user)
                log_action(AuditLog.Action.CHANGEMENT_MDP, request=request, user=user)
                messages.success(request, "Mot de passe modifié.")
                return redirect("accounts:parametres")

    return render(
        request,
        "accounts/parametres.html",
        {
            "page_title": "Paramètres",
            "active": "d-settings",
            "data": data,
            "profil_errors": profil_errors,
            "mdp_errors": mdp_errors,
            "medecin": medecin,
            "etablissement": Etablissement.get(),
            "langues": User.Langue.choices,
        },
    )


@role_required("medecin")
def etablissement_medecin(request):
    """Page « Mon établissement » du médecin — LECTURE SEULE (aucune modification)."""
    etablissement = Etablissement.get()
    services = Service.objects.filter(etablissement=etablissement) if etablissement else Service.objects.none()
    return render(
        request,
        "accounts/etablissement_medecin.html",
        {
            "page_title": "Mon établissement",
            "active": "d-etab",
            "etablissement": etablissement,
            "services": services,
        },
    )


@login_required
def changer_mot_de_passe(request):
    errors = []

    if request.method == "POST":
        actuel = request.POST.get("mdp_actuel", "")
        nouveau = request.POST.get("mdp_nouveau", "")
        confirmation = request.POST.get("mdp_confirmation", "")

        if not request.user.check_password(actuel):
            errors.append("Le mot de passe actuel est incorrect.")
        if not nouveau:
            errors.append("Le nouveau mot de passe est requis.")
        elif len(nouveau) < 8:
            errors.append("Le nouveau mot de passe doit contenir au moins 8 caractères.")
        elif nouveau != confirmation:
            errors.append("Les mots de passe ne correspondent pas.")

        if not errors:
            request.user.set_password(nouveau)
            request.user.doit_changer_mdp = False
            request.user.save(update_fields=["password", "doit_changer_mdp"])
            update_session_auth_hash(request, request.user)
            log_action(AuditLog.Action.CHANGEMENT_MDP, request=request, user=request.user)
            return redirect("core:home")

    return render(
        request,
        "accounts/changer_mdp.html",
        {"errors": errors, "force": request.user.doit_changer_mdp},
    )
