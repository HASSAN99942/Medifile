# 🩺 MediFile — Prompts Claude Code (Next.js App Router + Django REST + SQLite)

> Prompts prêts à copier-coller, **dans l'ordre**. Chaque prompt est autonome, énonce ses
> contraintes et se termine par une consigne de test + commit. Périmètre : **socle + cœur métier**
> (auth, création de comptes en cascade, consentement).

---

## ⚙️ Avant de commencer (une seule fois)

1. Place le fichier `PLAN_IMPLEMENTATION_NextJS_Django.md` à la racine du dépôt et **renomme-le
   `CLAUDE.md`** (ou copie son contenu dedans) — Claude Code le lira automatiquement à chaque session.
2. `git init` à la racine, puis un premier commit de l'état actuel (Django par défaut + Next vide).
3. Lance les prompts **un par un**, dans l'ordre ci-dessous. Après chaque prompt : teste, puis
   laisse Claude Code committer avant de passer au suivant.

> ⚠️ Rappel des règles métier (à ne jamais casser) : le **patient génère le code** et choisit la
> durée ; l'accès expire seul et est révocable à tout moment ; l'admin ne voit jamais le contenu
> médical ; le patient est en lecture seule sur le médical ; tout est tracé dans l'audit ; login
> patient = numéro MF.

---

## PROMPT 0 — Socle du projet (backend + frontend)

```
Lis CLAUDE.md. On démarre le projet MediFile : Django REST Framework (API pure) + Next.js App Router + SQLite, en monorepo (backend/ et frontend/).

Mets en place UNIQUEMENT le socle, sans logique métier :

BACKEND (backend/) :
- Projet Django avec settings découpés (config/settings/base.py, dev.py, prod.py) via python-decouple pour les variables d'env.
- Installe et configure : djangorestframework, djangorestframework-simplejwt, django-cors-headers, drf-spectacular, Pillow.
- Crée l'app "accounts" avec un modèle User CUSTOM (AbstractBaseUser + manager) AVANT toute migration — c'est critique. Champs : role (admin/medecin/patient), email (unique, nullable), identifiant (unique, nullable — servira au numéro MF), nom, prenom, tel, langue (fr/en), actif, doit_changer_mdp, derniere_connexion. AUTH_USER_MODEL pointant dessus.
- CORS autorisant http://localhost:3000 avec credentials.
- Un endpoint de test GET /api/health qui renvoie {"status":"ok"}.
- drf-spectacular exposant le schéma OpenAPI sur /api/schema et /api/docs.

FRONTEND (frontend/) :
- Next.js App Router + TypeScript déjà présent : configure next-intl (messages/fr.json, messages/en.json), un client API typé de base dans lib/api.ts (fetch avec NEXT_PUBLIC_API_URL, gestion d'erreur centralisée), et un middleware.ts vide pour l'instant.
- Recrée les composants de base du design system MediFile (Button, Card, Badge, Modal, Toast) dans components/ui/, en reprenant les variables de couleur du design existant (--teal #0A7E6E, --navy #0D1F3C, --gold #C8862A, police Syne + DM Sans). Objectif : conserver l'identité visuelle.

Contraintes :
- Ne mets AUCUNE logique d'authentification ou métier ici, juste les fondations.
- Documente le lancement dans README.md (commandes backend et frontend).

Termine par : lancer les deux serveurs, vérifier que le front appelle /api/health avec succès, puis git commit "chore: socle backend DRF + frontend Next App Router".
```

---

## PROMPT 1 — Authentification & installation : BACKEND

```
Lis CLAUDE.md. Implémente le backend d'authentification et d'installation dans l'app accounts.

Modèles :
- Etablissement (singleton, id=1) : nom, ville, region, adresse, tel, email, langue, cree_le.

Endpoints (DRF) :
- GET  /api/install/status → {"installed": bool} (true si un Etablissement existe).
- POST /api/install → crée l'Etablissement + le PREMIER compte admin en une transaction. Se verrouille après le 1er usage (409 si déjà installé). Corps : etab_nom, etab_ville, etab_region?, admin_nom, admin_prenom, admin_email, admin_password.
- POST /api/auth/login → identifiant = email (admin/médecin) OU numéro MF (patient). Renvoie access + refresh (simplejwt). Message neutre si échec.
- POST /api/auth/refresh → rafraîchit l'access token.
- POST /api/auth/logout → blackliste le refresh.
- GET  /api/auth/me → profil courant + infos de rôle + doit_changer_mdp.
- POST /api/auth/password → change le mot de passe (min 8 car.), lève doit_changer_mdp.

Sécurité & rôles :
- Classes de permission réutilisables : IsAdmin, IsMedecinActif, IsPatient.
- Mots de passe hashés (hasher Django par défaut). Access token court (~15 min), refresh ~12h avec blacklist.

Audit : crée l'app "audit" avec un modèle AuditLog (user?, patient?, action, details, ip, cree_le) et un helper log_action(...). Trace : INSTALLATION, LOGIN, LOGIN_ECHEC, LOGOUT, CHANGEMENT_MDP.

i18n : messages d'erreur disponibles en FR et EN (selon l'en-tête de langue ou le profil).

Termine par : écrire des tests d'API (install une seule fois, login OK/KO, changement de mdp), les faire passer, puis git commit "feat(auth): install + login/refresh/logout + audit".
```

---

## PROMPT 2 — Authentification & installation : FRONTEND

```
Lis CLAUDE.md. Branche le frontend Next (App Router) sur l'API d'authentification (Prompt 1 fait).

Pattern de session (BFF léger) :
- Crée des route handlers Next dans app/api/auth/ (login, logout, refresh) qui appellent l'API DRF et posent les tokens en cookies httpOnly + Secure + SameSite. Le JS client ne touche jamais aux tokens.
- middleware.ts : si non authentifié → redirige vers /login ; si doit_changer_mdp → force /change-password ; si un rôle accède à la zone d'un autre rôle → redirige vers son propre tableau de bord.

Écrans (groupe (auth), sans layout dashboard) :
- /install : affiché seulement si GET /api/install/status renvoie installed=false. Formulaire établissement + compte admin → POST install → puis redirige vers /login.
- /login : identifiant (email ou numéro MF) + mot de passe. Après login, redirige selon le rôle : medecin → /medecin, patient → /patient, admin → /admin.
- /change-password : imposé à la 1re connexion.

Layout dashboard (groupe (dashboard)) :
- Layout serveur commun (sidebar + topbar) qui lit le rôle et affiche la bonne navigation. Reprends le style MediFile (couleurs, sidebar dégradé, logo 🩺). Pages d'accueil vides pour /medecin, /patient, /admin pour l'instant.

Contraintes :
- Conserve l'identité visuelle existante (composants ui/ du Prompt 0).
- Gestion d'erreur : toast en cas d'échec de login.

Termine par : tester le parcours install → login des 3 rôles → changement de mdp forcé, sans erreur console, puis git commit "feat(auth-ui): install, login, middleware, change-password".
```

---

## PROMPT 3 — Création de comptes (cascade) : BACKEND

```
Lis CLAUDE.md. Implémente la création de comptes en cascade (PAS d'inscription publique). App medical.

Modèles :
- Medecin (OneToOne User) : numero_ordre, specialite, statut (en_attente/actif/suspendu), valide_par?, valide_le?.
- Patient (OneToOne User) : numero_mf (MF-YYYY-XXXXXX unique, auto-généré), ddn, sexe, groupe_sanguin?, poids?, taille?, adresse?, assurance?, num_assurance?, allergies (JSON), antecedents (JSON), cree_par (médecin), cree_le.

Endpoints admin (IsAdmin) :
- GET  /api/admin/medecins → liste.
- POST /api/admin/medecins → crée un médecin (vérifie identité + numero_ordre), statut actif, doit_changer_mdp=true.
- POST /api/admin/medecins/{id}/valider et /suspendre → change le statut (suspendre invalide ses tokens).
- GET  /api/admin/patients → identité + méta UNIQUEMENT (jamais de contenu médical).
- GET  /api/admin/stats → compteurs (patients, médecins actifs/en attente, consultations 30j, accès actifs).

Endpoint médecin (IsMedecinActif) :
- POST /api/medecin/patients → crée un dossier patient : génère un numero_mf unique + un mot de passe provisoire lisible, doit_changer_mdp=true. Renvoie UNE SEULE FOIS {numero_mf, login, mot_de_passe_provisoire} pour la fiche imprimée.

Règles :
- L'admin ne doit jamais pouvoir accéder au contenu médical d'un patient.
- Trace dans l'audit : CREATION_MEDECIN, VALIDATION_MEDECIN, SUSPENSION_MEDECIN, CREATION_DOSSIER.
- Messages FR/EN.

Termine par : tests (création médecin, création dossier avec numéro MF unique, admin ne voit pas le médical), puis git commit "feat(accounts): admin gère médecins + médecin crée dossier patient".
```

---

## PROMPT 4 — Création de comptes (cascade) : FRONTEND

```
Lis CLAUDE.md. Branche l'UI de gestion des comptes sur l'API du Prompt 3.

Espace admin (/admin) :
- Page Médecins : liste (nom, spécialité, n° ordre, statut, dernière connexion) via GET /api/admin/medecins. Actions valider/suspendre. Modale "Nouveau médecin" (nom, prénom, email, numéro d'ordre OBLIGATOIRE, spécialité, mot de passe) → POST.
- Page Patients : liste identité + méta seulement (respect strict : aucun contenu médical affiché).
- Page Statistiques : cartes de compteurs via GET /api/admin/stats.

Espace médecin (/medecin) :
- Modale "Nouveau dossier patient" (nom, prénom, date de naissance, sexe, groupe sanguin, allergies, antécédents…) → POST /api/medecin/patients.
- À la création, affiche une MODALE "fiche patient imprimable" avec le numéro MF et le mot de passe provisoire, + un bouton Imprimer (window.print()). Prévois un style @media print propre. Précise que le mot de passe ne sera affiché qu'une seule fois.

Contraintes :
- Conserve le design MediFile (cartes, badges de statut, modales).
- Erreurs → toast ; désactive le bouton d'envoi pendant la requête.

Termine par : tester admin crée un médecin → médecin se connecte → crée un dossier → fiche imprimable affichée, puis git commit "feat(accounts-ui): gestion médecins (admin) + création dossier + fiche imprimable".
```

---

## PROMPT 5 — Cœur métier : consentement — BACKEND *(le plus important)*

```
Lis CLAUDE.md, section "Cœur métier — le consentement". Implémente l'app consent. C'est le module le plus sensible : écris les TESTS EN PREMIER.

Modèles :
- CodeAutorisation : patient (FK), code_hash, duree_heures (∈ {24,48,72,168}), expire_le (fenêtre de réclamation ~15 min), utilise, utilise_par?, utilise_le?, cree_le.
- Acces : patient (FK), medecin (FK), source (creation/code), code (FK?), accorde_le, expire_le, revoque, revoque_le.
- Au moins Consultation (patient, medecin, date, type, motif, diagnostic, traitement, notes, ta, spo2) pour donner du contenu au dossier.

Logique (à centraliser dans un service + une permission, aucune vue ne doit pouvoir contourner) :
- Permission HasAccesDossier : un médecin a accès SSI il existe un Acces non révoqué ET expire_le > maintenant. Vérifié à CHAQUE requête (pas de cron).
- POST /api/patient/codes (IsPatient) : {duree_heures} → invalide les codes actifs précédents, génère un code 6 chiffres HASHÉ, renvoie le code EN CLAIR une seule fois + la fenêtre en minutes.
- POST /api/medecin/acces/code (IsMedecinActif) : {numero_mf, code} → retrouve le patient, vérifie le hash, marque le code utilisé, crée un Acces (expire_le = now + duree_heures). Réponses neutres (ne révèle pas si le n° MF existe).
- GET  /api/patient/acces (IsPatient) : liste des accès (source, dates, actif, médecin).
- POST /api/patient/acces/{id}/revoquer (IsPatient) : passe revoque=true (effet immédiat).
- GET  /api/medecin/patients/{id} (HasAccesDossier) : dossier complet.
- POST /api/medecin/patients/{id}/consultations (HasAccesDossier) : ajoute une consultation.
- GET  /api/patient/dossier (IsPatient) : son dossier en lecture seule.
- GET  /api/patient/audit (IsPatient) : son journal.

Règles :
- À la création d'un dossier (Prompt 3), le médecin créateur reçoit un Acces source='creation' de 72h.
- Trace dans l'audit : GENERATION_CODE, ACCES_ACCORDE, CODE_ECHEC, ACCES_DOSSIER, ACCES_REFUSE, AJOUT_CONSULTATION, REVOCATION_ACCES.

Termine par : tests couvrant génération, réclamation OK/KO, expiration, révocation immédiate, refus tracé. Fais-les passer, puis git commit "feat(consent): code patient + accès médecin + expiration/révocation + audit".
```

---

## PROMPT 6 — Cœur métier : consentement — FRONTEND

```
Lis CLAUDE.md. Branche l'UI du consentement sur l'API du Prompt 5.

Espace patient (/patient) :
- Bouton "Générer un code d'accès" → modale avec CHOIX DE DURÉE (24h / 48h / 72h / 7 jours) → POST /api/patient/codes → affiche le code 6 chiffres en grand, avec une minuterie visuelle sur la fenêtre de réclamation. Explique comment le communiquer au médecin.
- Page "Accès & Consentements" : liste des accès via GET /api/patient/acces (médecin, source, accordé le, expire le, actif) + bouton Révoquer par accès → POST revoquer, avec rafraîchissement immédiat.
- Page journal : GET /api/patient/audit (qui a accédé, quand, IP).
- Toutes les pages patient sont en LECTURE SEULE sur le médical.

Espace médecin (/medecin) :
- Ouverture d'un dossier : appelle GET /api/medecin/patients/{id}. Si 403 → affiche une page "Dossier verrouillé" claire, avec un champ pour saisir le numéro MF + le code fourni par le patient → POST /api/medecin/acces/code → si succès, ouvre le dossier.
- Vue dossier : consultations, infos patient. Bouton "Ajouter une consultation" → POST.

Contraintes :
- Conserve le design MediFile (bannière de code, minuterie, badges).
- Gère proprement les états de chargement et d'erreur (toasts).

Termine par le SCÉNARIO CLÉ de bout en bout : le médecin crée un dossier → le patient se connecte, change son mdp, génère un code 48h → le médecin saisit numéro MF + code, ouvre le dossier, ajoute une consultation → le patient voit tout et révoque → le médecin est bloqué (dossier verrouillé) → le journal patient trace tout. Décris-moi le résultat, puis git commit "feat(consent-ui): génération code patient + accès/révocation + dossier verrouillé médecin".
```

---

## 📌 Conseils d'utilisation

- **Un prompt = un incrément testable = un commit.** Ne lance pas le suivant tant que le scénario du prompt courant ne passe pas.
- **Teste toi-même** après chaque prompt frontend (ouvre l'app, refais le parcours). Si un écran perd son style : « la page X a perdu son style, corrige sans casser les composants ui/ ni les couleurs MediFile ».
- **Garde ton ancien backend PHP ouvert** comme référence de spéc : mêmes règles, même schéma, même flux — juste transposés en Django.
- Après le Prompt 6, le socle + cœur est complet. Les épopées V1 restantes (ordonnances, résultats, RDV, espace patient étendu, export, i18n généralisée, durcissement) suivront les **mêmes patterns** : un prompt backend puis un prompt frontend par bloc.

---

*Prompts pour Claude Code — périmètre socle + cœur métier. Adapter les noms de routes/champs si tu diverges du plan d'implémentation.*
