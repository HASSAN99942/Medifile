#!/bin/bash
echo ""
echo "=========================================="
echo "  MediFile — Lancement du serveur local"
echo "=========================================="
echo ""

PORT=8080
URL="http://localhost:$PORT"

# Démarrer le serveur
if command -v python3 &>/dev/null; then
    echo "Serveur Python3 démarré sur $URL"
    echo "Appuyez sur Ctrl+C pour arrêter."
    echo ""
    # Ouvrir le navigateur
    (sleep 1 && (xdg-open $URL 2>/dev/null || open $URL 2>/dev/null)) &
    python3 -m http.server $PORT
elif command -v python &>/dev/null; then
    echo "Serveur Python démarré sur $URL"
    (sleep 1 && (xdg-open $URL 2>/dev/null || open $URL 2>/dev/null)) &
    python -m http.server $PORT
elif command -v npx &>/dev/null; then
    echo "Serveur Node.js démarré sur $URL"
    (sleep 1 && (xdg-open $URL 2>/dev/null || open $URL 2>/dev/null)) &
    npx serve -p $PORT
else
    echo "ERREUR: Python ou Node.js requis."
    echo "Installez Python : https://www.python.org/"
fi
