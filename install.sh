#!/usr/bin/env bash
# Installa (o aggiorna) l'estensione Kairos debugger nell'editor dell'utente:
# scarica il .vsix dell'ultima release (o di quella indicata) e lo installa con
# la CLI di VS Code, VSCodium o Cursor, quelle presenti.
#
#   curl -fsSL https://github.com/nicologiuliani6/kairos-vscode-debugger/releases/latest/download/install.sh | bash
#   ./install.sh                 # ultima release
#   ./install.sh v0.2.0          # una versione precisa
#   ./install.sh ./file.vsix     # un .vsix gia' scaricato
#
# Va eseguito dall'utente, non con sudo: le estensioni stanno nel profilo
# dell'utente (~/.vscode/extensions). Se Kairos non e' installato, lo installa
# (questo passo chiede la password di sudo).
set -euo pipefail

REPO="nicologiuliani6/kairos-vscode-debugger"
ARG="${1:-latest}"

if [[ "${EUID}" -eq 0 ]]; then
  echo "Non usare sudo: l'estensione va nel profilo del tuo utente."; exit 1
fi

EDITORS=()
for c in code codium cursor; do command -v "$c" >/dev/null 2>&1 && EDITORS+=("$c"); done
if [[ ${#EDITORS[@]} -eq 0 ]]; then
  echo "Non trovo la CLI di VS Code (code), VSCodium (codium) o Cursor (cursor) nel PATH."; exit 1
fi

# Il debugger usa l'app kairos e la sua libreria dap.so: se mancano installa
# il pacchetto kairos (chiede la password di sudo solo per questo).
if [[ ! -f /usr/local/lib/kairos/dap.so ]] || ! command -v kairos >/dev/null 2>&1; then
  echo "Kairos non e' installato: lo installo (serve sudo)."
  curl -fsSL https://github.com/nicologiuliani6/kairos/releases/latest/download/install.sh | bash
fi

TMP="$(mktemp -d)"; trap 'rm -rf "${TMP}"' EXIT
if [[ -f "${ARG}" ]]; then
  VSIX="${ARG}"
else
  if [[ "${ARG}" == latest ]]; then
    API="https://api.github.com/repos/${REPO}/releases/latest"
  else
    API="https://api.github.com/repos/${REPO}/releases/tags/${ARG}"
  fi
  URL="$(curl -fsSL "${API}" | grep -o '"browser_download_url": *"[^"]*\.vsix"' | head -1 | sed 's/.*"\(http[^"]*\)"/\1/')"
  [[ -n "${URL}" ]] || { echo "Nessun .vsix nella release ${ARG}."; exit 1; }
  VSIX="${TMP}/$(basename "${URL}")"
  echo "Scarico ${URL}"
  curl -fsSL -o "${VSIX}" "${URL}"
fi

for e in "${EDITORS[@]}"; do
  echo "Installo in ${e}..."
  "${e}" --install-extension "${VSIX}" --force
done

echo "Fatto: kairos in /usr/local/bin/kairos, dap.so in /usr/local/lib/kairos/dap.so."
