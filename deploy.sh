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

DECK_HOST="${DECK_HOST:-deck@steamdeck.local}"
PLUGIN_NAME="${PLUGIN_NAME:-decky-offline-soluce}"
REMOTE_DIR="${REMOTE_DIR:-/home/deck/homebrew/plugins/${PLUGIN_NAME}}"

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

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

# 4) Sync vers le Deck (--delete pour purger d'anciens fichiers obsoletes du plugin)
echo "[deploy] rsync vers $DECK_HOST:$REMOTE_DIR ..."
ssh "$DECK_HOST" "mkdir -p '$REMOTE_DIR'"
rsync -az --delete \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    "$STAGING/" "$DECK_HOST:$REMOTE_DIR/"

# 5) Reload Decky (demande le mot de passe sudo deck via -t)
if [[ "$DO_RESTART" == "1" ]]; then
    echo "[deploy] restart plugin_loader (mot de passe sudo du Deck demande) ..."
    ssh -t "$DECK_HOST" "sudo systemctl restart plugin_loader"
fi

echo "[deploy] OK -> $REMOTE_DIR sur $DECK_HOST"
