@echo off
echo.
echo  ==========================================
echo   MediFile — Lancement du serveur local
echo  ==========================================
echo.
echo  Ouverture de l'application...
echo.

REM Essayer Python 3
python -m http.server 8080 2>nul
if %errorlevel%==0 goto :python_ok

REM Essayer Python 3 explicitement
python3 -m http.server 8080 2>nul
if %errorlevel%==0 goto :python_ok

REM Essayer Node.js
npx serve -p 8080 2>nul
if %errorlevel%==0 goto :node_ok

echo  ERREUR: Python ou Node.js requis.
echo  Installez Python : https://www.python.org/downloads/
pause
exit

:python_ok
start http://localhost:8080
echo  Serveur actif sur http://localhost:8080
echo  Appuyez sur Ctrl+C pour arreter.
pause
goto :eof

:node_ok
start http://localhost:8080
pause
