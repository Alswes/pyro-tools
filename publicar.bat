@echo off
cd /d "%~dp0"
echo Publicando o Pyro Tools no Firebase...
call firebase deploy --only firestore:rules,hosting
pause
