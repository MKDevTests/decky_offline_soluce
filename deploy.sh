#!/usr/bin/env bash
# deploy.sh — build + push direct vers le Steam Deck, sans repasser par Decky URL install.
#
# Usage :
#   ./deploy.sh                          # build + sync + restart Decky
#   ./deploy.sh --no-build               # skip pnpm build (utile si que main.py change)
#   ./deploy.sh --no-restart             # skip sudo systemctl restart (recharge Decky toi-meme)
#   DECK_HOST=deck@192.168.1.42 ./deploy.sh
#
# Surcharges courantes (via env var ou edit ci-dessous) :
#   DECK_HOST     defaut: deck@steamdeck.local
#   REMOTE_DIR    defaut: /home/deck/homebrew/plugins/decky-offline-soluce
#   PLUGIN_NAME   defaut: decky-offline-soluce

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source le fichier de config local s'il existe (DECK_HOST, DECK_SUDO_PASSWORD, etc.)
CREDS_FILE="$PROJECT_DIR/.deck-deploy.local"
if [[ -f "$CREDS_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CREDS_FILE"
fi

DECK_HOST="${DECK_HOST:-deck@steamdeck.local}"
PLUGIN_NAME="${PLUGIN_NAME:-decky-offline-soluce}"
REMOTE_DIR="${REMOTE_DIR:-/home/deck/homebrew/plugins/${PLUGIN_NAME}}"

# Wrapper sudo-over-ssh : si DECK_SUDO_PASSWORD est defini, on passe le mdp via stdin
# (sudo -S le lit, -p '' supprime le prompt visible). Sinon on retombe sur ssh -t qui prompt.
sudo_ssh() {
    local cmd="$1"
    if [[ -n "${DECK_SUDO_PASSWORD:-}" ]]; then
        ssh "$DECK_HOST" "sudo -S -p '' $cmd" <<< "$DECK_SUDO_PASSWORD"
    else
        ssh -t "$DECK_HOST" "sudo $cmd"
    fi
}

DO_BUILD=1
DO_RESTART=1
for arg in "$@"; do
    case "$arg" in
        --no-build)   DO_BUILD=0 ;;
        --no-restart) DO_RESTART=0 ;;
        -h|--help)
            sed -n '2,15p' "$0"
            exit 0
            ;;
        *)
            echo "[deploy] argument inconnu : $arg" >&2
            exit 2
            ;;
    esac
done

cd "$PROJECT_DIR"

# 1) SSH reachability check (fail fast)
echo "[deploy] check SSH $DECK_HOST ..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$DECK_HOST" true 2>/dev/null; then
    echo "[deploy] SSH KO vers $DECK_HOST" >&2
    echo "          - Deck allume et sur le bon reseau ?" >&2
    echo "          - Cle SSH copiee (ssh-copy-id $DECK_HOST) ?" >&2
    echo "          - Surcharge le host : DECK_HOST=deck@<IP> ./deploy.sh" >&2
    exit 1
fi

# 2) Frontend build (skippable). Sous WSL on retombe sur pnpm.cmd (install Windows) si pas de pnpm Linux.
if [[ "$DO_BUILD" == "1" ]]; then
    PNPM=""
    if command -v pnpm >/dev/null 2>&1; then
        PNPM=pnpm
    elif command -v pnpm.cmd >/dev/null 2>&1; then
        PNPM=pnpm.cmd
    fi
    if [[ -z "$PNPM" ]]; then
        echo "[deploy] pnpm introuvable (ni dans WSL ni cote Windows via interop)." >&2
        echo "          Soit installe pnpm dans WSL : 'npm install -g pnpm'" >&2
        echo "          Soit build cote Windows : 'pnpm run build' dans PowerShell, puis relance avec --no-build" >&2
        exit 1
    fi
    echo "[deploy] $PNPM run build ..."
    "$PNPM" run build
fi

# 3) Stage exactement ce que package_dist.py inclurait (parite avec install URL)
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

REQUIRED=(dist/index.js package.json plugin.json main.py README.md LICENSE)
OPTIONAL=(dist/index.js.map INSTALLATION_UTILISATION.md)

for f in "${REQUIRED[@]}"; do
    if [[ ! -f "$f" ]]; then
        echo "[deploy] fichier requis manquant : $f" >&2
        echo "          (lance pnpm run build si c'est dist/index.js)" >&2
        exit 1
    fi
    mkdir -p "$STAGING/$(dirname "$f")"
    cp "$f" "$STAGING/$f"
done
for f in "${OPTIONAL[@]}"; do
    if [[ -f "$f" ]]; then
        mkdir -p "$STAGING/$(dirname "$f")"
        cp "$f" "$STAGING/$f"
    fi
done

# 4) Sync en 2 temps, robuste aux resets de /etc/sudoers (les MAJ SteamOS beta
# effacent le NOPASSWD). D'abord rsync vers un staging user-writable (pas de
# sudo), puis install en root via sudo_ssh (qui pipe DECK_SUDO_PASSWORD, ou
# retombe sur un prompt interactif). Plus besoin de "deck ALL=NOPASSWD: rsync".
REMOTE_STAGING="/tmp/decky-deploy/${PLUGIN_NAME}"
echo "[deploy] rsync vers staging $DECK_HOST:$REMOTE_STAGING ..."
ssh "$DECK_HOST" "rm -rf '$REMOTE_STAGING' && mkdir -p '$REMOTE_STAGING'"
rsync -az --delete \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    "$STAGING/" "$DECK_HOST:$REMOTE_STAGING/"

# Install en root : copie staging -> plugins, purge les obsoletes. PAS de
# --chown : le staging /tmp a ete cree par le 1er rsync (en deck), donc rsync -a
# (lance en root) PRESERVE l'ownership deck:deck des fichiers — l'etat d'origine
# qui fonctionnait. NE PAS forcer root:root : ca empeche le loader de charger le
# plugin (bug v0.43.9). Decky re-gere lui-meme l'ownership du dossier au load.
echo "[deploy] install en root cote Deck -> $REMOTE_DIR ..."
sudo_ssh "rsync -a --delete --exclude=__pycache__ --exclude='*.pyc' '$REMOTE_STAGING/' '$REMOTE_DIR/'"

# 5) Reload Decky (sudo via DECK_SUDO_PASSWORD si defini, sinon prompt interactif)
if [[ "$DO_RESTART" == "1" ]]; then
    echo "[deploy] restart plugin_loader ..."
    sudo_ssh "systemctl restart plugin_loader"
fi

echo "[deploy] OK -> $REMOTE_DIR sur $DECK_HOST"
