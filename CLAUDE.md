# MediFile — Django templates (mono-établissement, bilingue FR/EN)

Stack : Django + templates + JS vanilla + SQLite. PAS d'API séparée, PAS de Next, PAS de DRF, PAS de JWT.

## Référence design & écrans
- L'ancien frontend (index.html, css/main.css, js/*.js) est LA référence de design et d'écrans.
- IGNORER complètement l'ancien backend PHP (pas une référence).

## FIDÉLITÉ DESIGN (obligatoire)
- Copier css/main.css dans static/ et l'utiliser SANS le modifier.
- Reproduire à l'identique le HTML des écrans existants (index.html + fonctions de rendu dans js/*.js) : mêmes classes CSS, mêmes structures, mêmes libellés, mêmes icônes emoji, mêmes couleurs.
- Ne JAMAIS réinventer un style : réutiliser tel quel tout composant existant (carte, badge, modale, sidebar, bouton, toast).
- Pour les formulaires Django, appliquer les classes CSS de l'ancien front (ne pas laisser le rendu par défaut de Django).
- Résultat visuellement indiscernable de l'ancien front.

## Règles métier (ne jamais casser)
- Le MÉDECIN recherche un patient par son nom et lui envoie une demande d'accès (motif + durée 24h/48h/72h/7j). Le PATIENT voit la demande (badge notification) et l'approuve ou la refuse.
- Une demande approuvée ouvre l'accès pour la durée choisie ; l'accès expire seul (vérifié à chaque requête) et le patient peut révoquer à tout moment.
- Le médecin qui crée un dossier a un accès de 72h ; ensuite code obligatoire.
- Login patient = numéro MF (MF-2026-XXXXXX). Mot de passe provisoire affiché 1 fois (fiche imprimée).
- L'admin ne voit JAMAIS le contenu médical. Le patient est en lecture seule sur le médical.
- Tout est tracé dans un journal d'audit (connexions, accès, refus, ajouts, révocations).

## Comptes en cascade (pas d'inscription publique)
Installation crée l'admin → l'admin crée les médecins → le médecin crée les patients.

## Conventions
Auth Django native (sessions). i18n FR/EN via le framework Django. Vues simples (fonctions ou CBV légères). Un commit git par étape. Écrire les tests du module de consentement en premier.
