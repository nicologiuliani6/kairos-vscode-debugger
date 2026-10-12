#!/usr/bin/env bash
# Installs (or updates) the Kairos debugger extension in the user's editor:
# downloads the .vsix of the latest release (or of the given one) and installs
# it with the CLI of VS Code, VSCodium or Cursor, whichever are present.
#
#   curl -fsSL https://github.com/nicologiuliani6/kairos-vscode-debugger/releases/latest/download/install.sh | bash
#   ./install.sh                 # latest release
#   ./install.sh v0.2.0          # a specific version
#   ./install.sh ./file.vsix     # a .vsix you already downloaded
#
# Run it as your user, not with sudo: extensions live in the user's profile
# (~/.vscode/extensions). If Kairos is not installed it installs it too (that
# step asks for the sudo password).
set -euo pipefail

REPO="nicologiuliani6/kairos-vscode-debugger"
ARG="${1:-latest}"

if [[ "${EUID}" -eq 0 ]]; then
  echo "Do not use sudo: the extension goes into your user's profile."; exit 1
fi

EDITORS=()
for c in code codium cursor; do command -v "$c" >/dev/null 2>&1 && EDITORS+=("$c"); done
if [[ ${#EDITORS[@]} -eq 0 ]]; then
  echo "Cannot find the CLI of VS Code (code), VSCodium (codium) or Cursor (cursor) in PATH."; exit 1
fi

# The debugger uses the kairos app and its dap.so library: if they are missing,
# install the kairos package (only this step asks for the sudo password).
if [[ ! -f /usr/local/lib/kairos/dap.so ]] || ! command -v kairos >/dev/null 2>&1; then
  echo "Kairos is not installed: installing it (needs sudo)."
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
  [[ -n "${URL}" ]] || { echo "No .vsix in release ${ARG}."; exit 1; }
  VSIX="${TMP}/$(basename "${URL}")"
  echo "Downloading ${URL}"
  curl -fsSL -o "${VSIX}" "${URL}"
fi

for e in "${EDITORS[@]}"; do
  echo "Installing into ${e}..."
  "${e}" --install-extension "${VSIX}" --force
done

echo "Done: kairos in /usr/local/bin/kairos, dap.so in /usr/local/lib/kairos/dap.so."
