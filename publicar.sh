#!/bin/bash
# Pyro Tools · confere e publica. Uso: bash publicar.sh
cd "$(dirname "$0")" || exit 1
bash conferir.sh || exit 1
echo
echo "Publicando no Firebase (não aperte Ctrl+C)..."
firebase deploy --only firestore:rules,hosting
