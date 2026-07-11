# 🩺 MediFile

Dossier patient numérique — **consentement piloté par le patient**.
Monorepo : API **Django REST Framework** (`backend/`) + **Next.js App Router** (`frontend/`).

> L'ancien prototype (SPA statique HTML/CSS/JS) est conservé dans [`legacy/`](legacy/) comme
> **référence de design et de spécification des écrans**. Ne pas le modifier.
> Le design system en a été extrait dans [`frontend/DESIGN.md`](frontend/DESIGN.md).

---

## Prérequis

- Python 3.12+ (venv fourni dans `backend/venv`, créé avec Python 3.14)
- Node.js 20+ / npm

## Lancer le backend (API sur http://localhost:8000)

```powershell
cd backend

# 1re fois seulement : créer le venv + installer les dépendances
python -m venv venv
venv\Scripts\activate          # (Linux/macOS : source venv/bin/activate)
pip install -r requirements.txt

# 1re fois seulement : copier la config d'environnement
copy .env.example .env         # puis renseigner SECRET_KEY

# à chaque fois
venv\Scripts\python.exe manage.py migrate
venv\Scripts\python.exe manage.py runserver 8000
```

Endpoints disponibles :

| URL | Description |
|---|---|
| `GET /api/health` | Ping — `{"status": "ok"}` |
| `GET /api/schema` | Schéma OpenAPI (drf-spectacular) |
| `GET /api/docs` | Documentation Swagger UI |

Settings découpés : `config/settings/base.py` (commun), `dev.py` (défaut de `manage.py`),
`prod.py` (HTTPS, `DJANGO_SETTINGS_MODULE=config.settings.prod`). Variables lues depuis
`backend/.env` via python-decouple.

## Lancer le frontend (http://localhost:3000)

```powershell
cd frontend

# 1re fois seulement
npm install
copy .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000/api

# à chaque fois
npm run dev
```

La page d'accueil est pour l'instant une **démo du design system** : elle appelle
`GET /api/health` et affiche les composants `components/ui/` (Button, Card, Badge,
Modal, Toast) recréés à l'identique depuis l'ancien front. Bascule FR/EN en haut à droite
(next-intl, dictionnaires dans `frontend/messages/`).

## Structure

```
backend/
├── config/            # settings (base/dev/prod), urls, wsgi/asgi, vue health
├── apps/accounts/     # User custom (rôles admin/medecin/patient) — AUTH_USER_MODEL
└── requirements.txt
frontend/
├── app/               # App Router : layout (fonts + i18n + toasts), page démo, globals.css
├── components/ui/     # Button, Card, Badge, Modal, Toast (fidèles à legacy/css/main.css)
├── lib/api.ts         # client API typé (NEXT_PUBLIC_API_URL, erreurs centralisées)
├── i18n/ + messages/  # next-intl (fr/en, sans préfixe d'URL — cookie MEDIFILE_LOCALE)
├── proxy.ts           # Next 16 : remplace middleware.ts — vide (garde des routes en Phase 1)
└── DESIGN.md          # design system complet extrait de l'ancien front
legacy/                # ancien prototype — référence design/spec, ne pas modifier
```

## État d'avancement

- ✅ **Phase 0 — Socle** : projet Django (DRF, simplejwt, CORS, drf-spectacular, Pillow),
  User custom créé avant toute migration, client Next typé, i18n fr/en, design system recréé.
- ⏳ Phase 1 — Authentification & installation (JWT en cookies httpOnly, `/install`, garde des routes).
- ⏳ Phase 2 — Dossier + consentement (codes patient, accès, révocation, audit).

Voir [`CLAUDE.md`](CLAUDE.md) pour le plan d'implémentation complet.
