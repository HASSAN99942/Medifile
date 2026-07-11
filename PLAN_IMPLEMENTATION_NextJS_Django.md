# 🩺 MediFile — Plan d'implémentation Next.js + Django REST Framework

> **Objet** : plan d'implémentation technique (pas de code applicatif à livrer).
> **Stack** : Django REST Framework (API pure) · Next.js App Router · SQLite.
> **Périmètre de ce plan** : **Socle technique + Cœur métier** (authentification, installation,
> et surtout le **consentement piloté par le patient**). Le reste de la V1 est esquissé en fin
> de document comme phases suivantes.

---

## 1. Décisions d'architecture

| Sujet | Décision | Justification |
|---|---|---|
| Backend | **Django + DRF** en API REST pure | Découplage total front/back, proche de l'existant |
| Frontend | **Next.js App Router** | Demandé ; structure moderne, layouts imbriqués, middleware |
| Rendu | **Server Components** pour la coquille (layouts, nav) + **Client Components** pour l'interactif | App derrière login : pas de besoin SEO, mais on profite des layouts serveur |
| Base de données | **SQLite** | Mono-établissement auto-hébergé ; migration Postgres triviale plus tard |
| Auth | **JWT** (`djangorestframework-simplejwt`) stocké en **cookies httpOnly** via route handlers Next | Plus sûr que localStorage face au XSS pour une app médicale |
| Communication | Next appelle l'API DRF ; les cookies de session portent le JWT | Pattern « BFF léger » |
| i18n | `django` + `next-intl` (front) | Bilingue FR/EN dès le socle |

> ⚠️ **Note SQLite** : parfaitement adapté au dev et à une instance mono-établissement à faible
> concurrence en écriture. Si tu vises plusieurs écritures simultanées intensives, prévois de
> basculer sur PostgreSQL — avec Django c'est un simple changement dans `DATABASES` + migration.

> ⚠️ **Note rendu** : ne cherche pas à tout faire en Server Components. Les données sont
> propres à l'utilisateur et protégées ; le plus simple et robuste est de **récupérer les
> données côté client** (avec un client typé) dans des Client Components, et de réserver les
> Server Components à la structure. Tu peux introduire du data-fetching serveur plus tard.

---

## 2. Structure cible du dépôt (monorepo)

```
medifile/
├── backend/                    # Projet Django
│   ├── manage.py
│   ├── config/                 # settings, urls, wsgi/asgi
│   │   ├── settings/           # base.py, dev.py, prod.py
│   │   └── urls.py
│   ├── apps/
│   │   ├── accounts/           # User custom, Etablissement, install, auth
│   │   ├── medical/            # Patient, Medecin, Consultation, Ordonnance, Resultat
│   │   ├── consent/            # CodeAutorisation, Acces (cœur métier)
│   │   └── audit/              # AuditLog + signaux/middleware
│   ├── requirements.txt
│   └── db.sqlite3
│
├── frontend/                   # Projet Next.js (App Router)
│   ├── app/
│   │   ├── (auth)/             # groupe : login, install, changement mdp
│   │   ├── (dashboard)/        # groupe protégé : layouts par rôle
│   │   │   ├── medecin/
│   │   │   ├── patient/
│   │   │   └── admin/
│   │   ├── api/                # route handlers (proxy auth, pose des cookies)
│   │   └── layout.tsx
│   ├── lib/                    # client API, helpers auth, i18n
│   ├── components/             # UI réutilisable (reprend ton design system)
│   ├── middleware.ts           # garde des routes selon le rôle
│   └── messages/               # fr.json, en.json (next-intl)
│
├── docker-compose.yml          # (optionnel) orchestration dev
└── README.md
```

**Recommandation** : garde front et back dans le même dépôt (monorepo) pour la V1 solo — plus
simple à versionner et à déployer ensemble.

---

## 3. Stack & dépendances clés

**Backend** : `django`, `djangorestframework`, `djangorestframework-simplejwt`,
`django-cors-headers`, `python-decouple` (variables d'env), `drf-spectacular` (doc OpenAPI auto),
`Pillow` (uploads image), `django-filter`.

**Frontend** : `next`, `react`, `typescript`, `next-intl` (i18n), `zod` (validation),
`@tanstack/react-query` (cache des appels API) ou SWR, plus ta lib de composants existante
(ou reconstruction du design system depuis ton `main.css`).

---

## 4. Modèle de données (périmètre socle + cœur)

> Django génère le schéma via migrations. Ci-dessous les modèles à créer — **liste de champs**,
> pas d'implémentation. Ils reprennent la logique de ton schéma MySQL actuel.

### app `accounts`
- **Etablissement** (singleton V1) : `nom`, `ville`, `region`, `adresse`, `tel`, `email`, `langue`, `cree_le`.
- **User** (custom, hérite d'`AbstractBaseUser`) : `role` (`admin`/`medecin`/`patient`), `email` (unique, nullable pour patient), `identifiant` (unique — n° MF pour patient), `nom`, `prenom`, `tel`, `langue`, `actif`, `doit_changer_mdp`, `derniere_connexion`.
  - **Manager custom** pour créer users par rôle.

### app `medical`
- **Medecin** (profil 1-1 avec User) : `numero_ordre`, `specialite`, `statut` (`en_attente`/`actif`/`suspendu`), `valide_par`, `valide_le`.
- **Patient** (profil 1-1 avec User) : `numero_mf` (`MF-YYYY-XXXXXX`, unique), `ddn`, `sexe`, `groupe_sanguin`, `poids`, `taille`, `adresse`, `assurance`, `num_assurance`, `allergies` (JSON), `antecedents` (JSON), `cree_par`, `cree_le`.
- **Consultation**, **Ordonnance** (+ lignes), **Resultat** : à créer au périmètre cœur pour que la création de dossier ait du sens (au minimum Consultation ; Ordonnance/Resultat peuvent glisser en phase suivante).

### app `consent` *(cœur différenciant)*
- **CodeAutorisation** : `patient` (FK), `code_hash`, `duree_heures`, `expire_le` (fenêtre de réclamation), `utilise`, `utilise_par`, `utilise_le`, `cree_le`.
- **Acces** : `patient` (FK), `medecin` (FK), `source` (`creation`/`code`), `code` (FK nullable), `accorde_le`, `expire_le`, `revoque`, `revoque_le`.

### app `audit`
- **AuditLog** : `user` (FK nullable), `patient` (FK nullable), `action`, `details`, `ip`, `cree_le`.

> **Auth tokens** : plus besoin de table `api_tokens` → gérée par `simplejwt` (access + refresh).

---

## 5. Conception de l'API (socle + cœur)

> Convention : préfixe `/api/`, réponses JSON, permissions par rôle via classes DRF.

| Méthode | Endpoint | Rôle | Rôle métier |
|---|---|---|---|
| GET | `/api/install/status` | — | L'instance est-elle installée ? |
| POST | `/api/install` | — | Créer établissement + 1er admin (une seule fois) |
| POST | `/api/auth/login` | — | Login → access + refresh (posés en cookies httpOnly par Next) |
| POST | `/api/auth/refresh` | — | Rafraîchir l'access token |
| POST | `/api/auth/logout` | tous | Invalider le refresh (blacklist) |
| GET | `/api/auth/me` | tous | Profil courant + infos de rôle |
| POST | `/api/auth/password` | tous | Changer son mot de passe (lève `doit_changer_mdp`) |
| POST | `/api/medecin/patients` | médecin | Créer un dossier → n° MF + mot de passe provisoire (1 fois) |
| GET | `/api/medecin/patients/{id}` | médecin | Lire le dossier **(accès requis)** |
| POST | `/api/medecin/patients/{id}/consultations` | médecin | Ajouter une consultation (accès requis) |
| POST | `/api/medecin/acces/code` | médecin | Réclamer un code patient → ouvre l'accès |
| POST | `/api/patient/codes` | patient | Générer un code (durée au choix) |
| GET | `/api/patient/acces` | patient | Lister ses accès |
| POST | `/api/patient/acces/{id}/revoquer` | patient | Révoquer un accès |
| GET | `/api/patient/dossier` | patient | Son dossier (lecture seule) |
| GET | `/api/patient/audit` | patient | Son journal d'audit |

**Documentation auto** : `drf-spectacular` génère l'OpenAPI → utile pour typer le client Next.

---

## 6. Stratégie d'authentification & de permissions

**Tokens (simplejwt)** : `access` courte durée (~15 min) + `refresh` (~12 h, avec blacklist au logout).

**Stockage côté Next (pattern BFF léger)** :
1. La page de login (Client Component) POST vers un **route handler Next** `/app/api/auth/login`.
2. Ce route handler appelle l'API DRF, récupère les tokens, et les pose en **cookies httpOnly** (inaccessibles au JS → protège du vol par XSS).
3. Les appels suivants passent par des route handlers qui relaient le cookie vers DRF (ou directement vers DRF si tu acceptes `credentials: include` + CORS strict).
4. `middleware.ts` lit le cookie, vérifie la présence/validité et **redirige selon le rôle** (ou vers login).

**Permissions DRF** : créer des classes réutilisables —
`IsAdmin`, `IsMedecinActif`, `IsPatient`, et surtout **`HasAccesDossier`** (le contrôle central du
cœur métier, voir §7). Chaque vue déclare ses `permission_classes`.

**Rôles au boot** : l'admin est le **premier compte** créé par `/api/install` ; il n'y a pas
d'auto-inscription en V1 (l'admin crée les médecins, les médecins créent les patients).

---

## 7. Cœur métier — le consentement (à traiter avec le plus grand soin)

C'est le différenciateur du produit. Règles à implémenter fidèlement :

1. **Le patient génère le code**, jamais l'inverse.
   - `POST /patient/codes` `{duree_heures}` où la durée ∈ {24, 48, 72, 168}.
   - Le code (6 chiffres) est **hashé** avant stockage (jamais en clair), renvoyé **une seule fois**.
   - Un **seul code actif** à la fois : générer un nouveau invalide les précédents non utilisés.
   - Fenêtre de réclamation courte (~15 min) → champ `expire_le` du `CodeAutorisation`.

2. **Le médecin réclame le code**.
   - `POST /medecin/acces/code` `{numero_mf, code}` : retrouver le patient, vérifier le hash,
     marquer le code utilisé, créer un `Acces` dont `expire_le = now + duree_heures`.
   - Réponses **neutres** (ne pas révéler si un numéro MF existe).

3. **Expiration automatique sans cron** : la permission `HasAccesDossier` vérifie à **chaque
   requête** qu'il existe un `Acces` avec `revoque=False` et `expire_le > now`. Pas de tâche planifiée.

4. **Révocation à tout moment** : `POST /patient/acces/{id}/revoquer` passe `revoque=True`.
   L'effet est immédiat car la vérification est faite à chaque requête.

5. **Accès du créateur** : à la création d'un dossier, le médecin reçoit un `Acces`
   `source='creation'` de durée limitée (ex. 72 h) ; ensuite, il repasse par un code patient.

6. **Traçage** : chaque étape (génération, réclamation, accès, refus, révocation) écrit un `AuditLog`.

**Recommandation de conception** : centralise toute cette logique dans l'app `consent` (services +
permission `HasAccesDossier`) pour qu'aucune vue médicale ne puisse contourner le contrôle. Écris
les **tests en premier** sur ce module (voir §10) — c'est là que les bugs coûtent le plus cher.

---

## 8. Frontend Next.js — organisation App Router

**Groupes de routes** :
- `(auth)` : `/login`, `/install`, `/change-password` — sans layout dashboard.
- `(dashboard)` : layout commun (sidebar + topbar) puis sous-arbres `medecin/`, `patient/`, `admin/`.

**Server vs Client** :
- **Server Components** : `layout.tsx` (coquille, nav statique selon le rôle lu depuis le cookie).
- **Client Components** : toutes les pages interactives (formulaires, modales de code, listes qui se rafraîchissent). Elles récupèrent les données via le **client API typé** + React Query/SWR.

**Middleware** (`middleware.ts`) :
- Route non authentifiée → redirection `/login`.
- `doit_changer_mdp` → forcer `/change-password`.
- Rôle qui accède à une zone d'un autre rôle → redirection vers son propre tableau de bord.

**Client API** (`lib/api.ts`) : un wrapper `fetch` typé (idéalement généré depuis l'OpenAPI de
`drf-spectacular`), avec gestion centralisée des erreurs, du refresh token, et de la langue.

**Design** : recrée ton design system actuel en composants React (Card, Button, Badge, Modal,
Sidebar…) à partir de ton `main.css` — soit en CSS Modules/global CSS reprenant tes variables
(`--teal`, `--navy`…), soit en Tailwind avec un thème mappé sur ces variables. **Objectif : ne pas
perdre l'identité visuelle existante.**

---

## 9. Phases d'implémentation (socle + cœur)

> Découpage en incréments livrables et testables. Chaque phase se termine par une démo + des tests.

### Phase 0 — Socle *(fondations)*
- Backend : projet Django + settings découpés (dev/prod), DRF, CORS, simplejwt, `drf-spectacular`, SQLite, app `accounts` avec **User custom** (migration créée avant tout, car changer de User après coup est douloureux).
- Frontend : Next App Router, TypeScript, `next-intl` (fr/en), client API de base, middleware vide, reconstruction des composants de base du design system.
- Transverse : variables d'environnement, README de lancement, CORS front↔back vérifié.
- **Démo** : le front appelle `/api/install/status` et affiche le résultat.

### Phase 1 — Authentification & installation
- Backend : `Etablissement` (singleton), endpoint `/install` (verrouillage après 1er usage), login/refresh/logout, `/auth/me`, changement de mot de passe, classes de permission par rôle, app `audit` branchée sur les événements d'auth.
- Frontend : page `/install` (formulaire établissement + admin), page `/login`, pose des cookies httpOnly via route handlers, `middleware.ts` (garde + redirection par rôle), écran de changement de mot de passe forcé.
- **Démo** : installation → connexion des 3 rôles → changement de mot de passe obligatoire à la 1re connexion.

### Phase 2 — Cœur métier : dossier + consentement
- Backend : profils `Medecin`/`Patient`, création de dossier (n° MF + mot de passe provisoire), au moins `Consultation`, app `consent` complète (`CodeAutorisation`, `Acces`, service + permission `HasAccesDossier`), expiration/révocation, audit sur chaque action.
- Frontend : espace médecin (créer un dossier → **fiche imprimable** avec n° MF + mot de passe ; page « dossier verrouillé » si 403 ; saisie du code ; lecture du dossier ; ajout de consultation) ; espace patient (générer un code avec choix de durée + minuterie ; liste et révocation des accès ; journal d'audit personnel).
- **Démo (scénario clé)** : médecin crée un dossier → patient se connecte, change son mdp, génère un code 48 h → médecin saisit le code, ouvre le dossier, ajoute une consultation → patient voit tout et révoque → médecin bloqué → audit patient à jour.

> Les épopées restantes de la V1 (ordonnances/résultats complets, RDV, espace patient étendu,
> admin complet, export, i18n généralisée, durcissement/déploiement) viennent **après** ce socle,
> en réutilisant exactement les mêmes patterns.

---

## 10. Points transverses à ne pas oublier

**Journal d'audit** : implémente-le tôt (app `audit`) via des signaux Django ou un service appelé
dans les vues sensibles. Trace aussi les **échecs** (login raté, accès refusé).

**i18n** : `next-intl` côté front (dictionnaires `fr.json`/`en.json`) + traduction des messages
d'erreur DRF. Prévois la clé de langue dans le profil User et dans l'en-tête des requêtes.

**Sécurité** (app médicale) : HTTPS en prod, `SECRET_KEY` et config hors du code (env),
cookies `httpOnly` + `Secure` + `SameSite`, CORS restreint à l'origine du front, mots de passe et
codes hashés, jamais de contenu médical exposé à l'admin, validation stricte des entrées (`zod`
côté front, serializers DRF côté back).

**Tests** : priorité au module `consent` (expiration, révocation, réclamation, refus) — écris ces
tests **avant** ou **pendant** l'implémentation, pas après. Ajoute des tests d'intégration sur le
scénario clé de la Phase 2.

**Uploads** : `Pillow` + validation type/taille ; sers les fichiers via une vue protégée par
`HasAccesDossier`, jamais en accès direct au dossier `media/`.

---

## 11. Mise en route de l'environnement (commandes, pas d'implémentation)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # (Windows : .venv\Scripts\activate)
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers python-decouple drf-spectacular Pillow
# → créer le User custom AVANT la 1re migration, puis :
python manage.py migrate
python manage.py runserver        # API sur http://localhost:8000

# Frontend
cd ../frontend
npm install next-intl zod @tanstack/react-query
npm run dev                       # front sur http://localhost:3000
```

**Variable d'env front** : `NEXT_PUBLIC_API_URL=http://localhost:8000/api`.
**CORS back (dev)** : autoriser `http://localhost:3000` + `credentials`.

---

## 12. Décisions à confirmer avant de démarrer

1. **User custom** : email pour admin/médecin, **numéro MF comme identifiant de login** pour le patient — confirmes-tu ce modèle unifié plutôt que deux modèles séparés ?
2. **Stockage des tokens** : cookies httpOnly via route handlers Next (recommandé) **ou** tokens en mémoire/contexte côté client (plus simple mais moins sûr) ?
3. **Design** : reconstruction du design system en **CSS reprenant tes variables** ou passage à **Tailwind** ? (Les deux préservent l'identité, mais l'effort diffère.)
4. **Périmètre Phase 2** : on inclut Ordonnance + Résultat dès le cœur, ou seulement Consultation pour valider le flux de consentement au plus vite ?

Réponds à ces quatre points et je pourrai, si tu veux, détailler la Phase 0 ou la Phase 2 en un
plan de tâches encore plus granulaire (toujours sans implémenter).

---

*Plan d'implémentation — périmètre socle + cœur métier. À étendre aux épopées V1 restantes selon les mêmes patterns.*
