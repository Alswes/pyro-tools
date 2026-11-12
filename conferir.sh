#!/bin/bash
# Pyro Tools · confere o pacote antes do deploy. Uso: bash conferir.sh
# Não publica nada. Sai com erro (e explica) se achar algo errado.
cd "$(dirname "$0")" || exit 1
ERR=0; ok(){ echo "  ok   $1"; }; ruim(){ echo "  ERRO $1"; ERR=$((ERR+1)); }
echo "Conferindo o pacote do Pyro Tools..."

[ -f firebase.json ] && [ -f firestore.rules ] && [ -d public ] && ok "pasta certa (firebase.json, firestore.rules, public)" || { ruim "esta não é a pasta pyro-firebase (rode: cd ~/pyro-firebase)"; echo "Parei: $ERR erro(s)."; exit 1; }

# 1. arquivos do site
for f in index.html entregas.html versao.json fb-bridge.js firebase-config.js demo-local.js sanitiza.js setores.js setores2.js setores3.js setores4.js setores5.js setores6.js layout.js morcegos.js roteiro-fb.js sw.js manifest.webmanifest icons/pyro-192.png icons/pyro-512.png; do
  [ -s "public/$f" ] || ruim "falta o arquivo public/$f"
done
[ $ERR -eq 0 ] && ok "todos os arquivos do site estão no pacote"

# 2. a página chama todos os scripts
for f in sanitiza.js fb-bridge.js firebase-config.js demo-local.js setores.js setores2.js setores3.js setores4.js setores5.js setores6.js layout.js morcegos.js; do
  grep -q "src=\"$f\"" public/index.html || ruim "index.html não carrega $f"
done
TAM=$(wc -c < public/index.html); [ "$TAM" -gt 500000 ] && ok "index.html completo ($TAM bytes)" || ruim "index.html pequeno demais ($TAM bytes): o upload pode ter sido cortado"

# 3. versão
VB=$(grep -o "PYRO_FB_VER = '[0-9.]*'" public/fb-bridge.js | grep -o "[0-9][0-9.]*")
VN=$(grep -o "{ v: '[0-9.]*'" public/setores3.js | head -1 | grep -o "[0-9][0-9.]*")
BUILD=$(grep -o '"build": *"[^"]*"' public/versao.json | cut -d'"' -f4)
[ -n "$VB" ] && [ "$VB" = "$VN" ] && ok "versão v$VB (igual nas novidades)" || ruim "versão diferente: fb-bridge diz '$VB' e as novidades dizem '$VN'"
[ -n "$BUILD" ] && ok "versao.json: $BUILD" || ruim "versao.json sem o número do build"

# 4. configuração do Firebase
if grep -q "PYRO_DEMO = true" public/firebase-config.js; then ok "modo demonstração ligado (dados fictícios, sem Firebase)"
else grep -q "COLE_AQUI" public/firebase-config.js && ruim "firebase-config.js ainda está com COLE_AQUI" || ok "firebase-config.js preenchido"; fi
grep -q "SEU-PROJETO" .firebaserc && ruim ".firebaserc ainda está com SEU-PROJETO (coloque o ID do projeto de demonstração)" || ok ".firebaserc com o ID do projeto"
if grep -rqs "private_key" public/ ; then ruim "tem chave de conta de serviço (private_key) dentro de public/: tire antes de publicar"; else ok "nenhuma chave de conta de serviço no pacote"; fi

# 5. regras do banco
A=$(grep -o "{" firestore.rules | wc -l); F=$(grep -o "}" firestore.rules | wc -l)
[ "$A" = "$F" ] && ok "firestore.rules: chaves fechadas ($A)" || ruim "firestore.rules: $A chaves abertas e $F fechadas"
for t in "rules_version = '2'" "function isAdmin()" "function cancMudarOk" "match /auditoria" "match /usuarios"; do
  grep -q "$t" firestore.rules || ruim "firestore.rules sem: $t"
done
grep -Eq "allow (read|write|read, write): *if *true" firestore.rules && ruim "firestore.rules tem uma regra aberta para todos (if true)" || ok "firestore.rules sem regra aberta para todos"

# 6. sintaxe dos scripts (se o node existir, como no Cloud Shell)
if command -v node >/dev/null 2>&1; then
  S=0; for f in public/*.js; do node --check "$f" 2>/dev/null || { ruim "erro de sintaxe em $f"; S=1; }; done
  node -e "JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8'));JSON.parse(require('fs').readFileSync('public/versao.json','utf8'));JSON.parse(require('fs').readFileSync('firebase.json','utf8'))" 2>/dev/null || { ruim "manifest, versao.json ou firebase.json com erro"; S=1; }
  [ $S -eq 0 ] && ok "scripts e arquivos JSON sem erro de sintaxe"
else echo "  (node não encontrado: pulei a conferência de sintaxe)"; fi

echo
if [ $ERR -eq 0 ]; then echo "Tudo certo: v$VB · $BUILD. Pode publicar."; exit 0; else echo "Parei: $ERR erro(s). Não publique antes de corrigir."; exit 1; fi
