# 🩺 MediFile v2.0
## Plateforme Numérique de Dossier Patient — Afrique Francophone

---

## 📁 Structure du dossier

```
MediFile/
│
├── index.html          ← Page principale de l'application
├── LANCER.bat          ← Lanceur Windows (double-clic)
├── LANCER.sh           ← Lanceur Linux/Mac
├── README.md           ← Ce fichier
│
├── css/
│   └── main.css        ← Design system complet + responsive
│
└── js/
    ├── data.js         ← Données & fonctions utilitaires
    ├── app.js          ← Routeur, sidebar, burger, toasts
    ├── auth.js         ← Connexion + Inscription 4 étapes
    ├── consent.js      ← Système de consentement (code, QR, audit)
    ├── doctor.js       ← Pages espace Médecin
    ├── patient.js      ← Pages espace Patient
    └── admin.js        ← Pages espace Administrateur
```

---

## 🚀 Comment ouvrir l'application

### ⚠️ IMPORTANT — Ne pas ouvrir index.html directement !
Le navigateur bloque les fichiers JS externes en protocole `file://`.
Il faut utiliser un petit serveur local.

### ✅ Option 1 — Double-clic (Windows)
→ Double-cliquer sur **`LANCER.bat`**

### ✅ Option 2 — Double-clic (Linux / Mac)
→ Exécuter **`LANCER.sh`** dans un terminal :
```bash
chmod +x LANCER.sh
./LANCER.sh
```

### ✅ Option 3 — Terminal manuel
```bash
# Python 3 (recommandé)
cd MediFile
python3 -m http.server 8080
# Puis ouvrir : http://localhost:8080

# Node.js
npx serve -p 8080
```

### ✅ Option 4 — VS Code Live Server
1. Ouvrir le dossier dans VS Code
2. Clic droit sur `index.html` → **"Open with Live Server"**

---

## 👤 Accès démo

Cliquer sur les boutons rapides sur la page de connexion :

| Rôle | Compte démo |
|------|-------------|
| 👨‍⚕️ Médecin | Dr. Amara Koné — CHU de Douala |
| 🧑 Patient | Jean Diallo — Cas pratique Douala→Bafoussam |
| 🏥 Admin | Administrateur — CHU de Douala |

---

## 🔐 Système de consentement — Cas Jean

1. Jean est suivi à **Douala** — son dossier y est enregistré
2. Il consulte à **Bafoussam** — le médecin voit `🔒 Dossier verrouillé`
3. Le médecin choisit une méthode :
   - `🔢 Code temporaire` (6 chiffres, 10 min, minuterie live)
   - `📱 QR Code` (scanné depuis l'app patient)
   - `📨 Demande formelle` (motif + durée)
4. Jean **approuve ou refuse** depuis son espace "Accès & Consentements"
5. L'accès est **journalisé** (qui, quand, quelle IP)
6. Jean peut **révoquer** l'accès à tout moment

---

## 📄 Pages disponibles

### Médecin (9 pages)
- Tableau de bord · Patients · Dossier déverrouillé
- **Dossier verrouillé + 3 méthodes de consentement**
- RDV · Ordonnances · Résultats · Paramètres

### Patient (8 pages)
- Tableau de bord · Historique · Ordonnances · Résultats
- RDV · Documents · **Accès & Consentements** · Profil

### Administrateur (5 pages)
- Vue ensemble · Médecins (valider/refuser/inviter) 
- Patients · Établissement · Statistiques

### Authentification (2 pages)
- Connexion multi-rôles · Inscription 4 étapes

---

## 🛠️ Technologies

- **HTML5 / CSS3 / JavaScript ES6+** — aucun framework
- **SPA** (Single Page Application) — routeur JS maison
- **Fonts** : Syne + DM Sans (Google Fonts CDN)
- **Responsive** : Mobile-first, burger menu tactile
- **Données** : en mémoire (JS) — prêt pour backend Django/API REST
