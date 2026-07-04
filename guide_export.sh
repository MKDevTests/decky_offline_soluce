#!/usr/bin/env bash
# guide_export.sh — recupere les guides telecharges depuis le Steam Deck vers le
# PC (pour analyse hors-ligne : sectionnement, flags "A ne pas rater", etc.).
# Lecture seule cote Deck, aucun sudo (le dossier data est deck:deck).
#
# Usage :
#   ./guide_export.sh                 # sync tous les .json du Deck -> LOCAL_DIR
#   ./guide_export.sh --clean         # miroir exact (supprime en local ce qui a disparu du Deck)
#   DECK_HOST=deck@192.168.1.42 ./guide_export.sh
#   LOCAL_DIR=/mnt/c/tmp/guides ./guide_export.sh
#
# Config (via env var ou .deck-deploy.local, comme deploy.sh) :
#   DECK_HOST      defaut: deck@steamdeck.local
#   REMOTE_GUIDES  defaut: /home/deck/homebrew/data/<plugin>/guides
#   LOCAL_DIR      defaut: /mnt/c/Users/mathi/Downloads/guides-export

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Reutilise la config locale de deploy.sh (DECK_HOST, etc.).
CREDS_FILE="$PROJECT_DIR/.deck-deploy.local"
if [[ -f "$CREDS_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CREDS_FILE"
fi

DECK_HOST="${DECK_HOST:-deck@steamdeck.local}"
PLUGIN_NAME="${PLUGIN_NAME:-decky-offline-soluce}"
REMOTE_GUIDES="${REMOTE_GUIDES:-/home/deck/homebrew/data/${PLUGIN_NAME}/guides}"
LOCAL_DIR="${LOCAL_DIR:-/mnt/c/Users/mathi/Downloads/guides-export}"

DO_CLEAN=0
for arg in "$@"; do
    case "$arg" in
        --clean) DO_CLEAN=1 ;;
        -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
        *) echo "[export] argument inconnu : $arg" >&2; exit 2 ;;
    esac
done

# 1) SSH reachability check (fail fast)
echo "[export] check SSH $DECK_HOST ..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$DECK_HOST" true 2>/dev/null; then
    echo "[export] SSH KO vers $DECK_HOST" >&2
    echo "          - Deck allume et sur le bon reseau ?" >&2
    echo "          - Cle SSH copiee (ssh-copy-id \$DECK_HOST) ?" >&2
    echo "          - Surcharge le host : DECK_HOST=deck@<IP> ./guide_export.sh" >&2
    exit 1
fi

# 2) Le dossier des guides existe-t-il cote Deck ?
if ! ssh "$DECK_HOST" "test -d '$REMOTE_GUIDES'"; then
    echo "[export] dossier introuvable cote Deck : $REMOTE_GUIDES" >&2
    echo "          - le plugin a-t-il deja telecharge au moins un guide ?" >&2
    echo "          - sinon surcharge : REMOTE_GUIDES=<chemin> ./guide_export.sh" >&2
    exit 1
fi

mkdir -p "$LOCAL_DIR"

# 3) Sync des .json uniquement (les guides). --delete seulement si --clean.
RSYNC_OPTS=(-az --info=stats1)
[[ "$DO_CLEAN" == "1" ]] && RSYNC_OPTS+=(--delete)

echo "[export] sync $DECK_HOST:$REMOTE_GUIDES/*.json -> $LOCAL_DIR ..."
rsync "${RSYNC_OPTS[@]}" \
    --include='*.json' --exclude='*' \
    "$DECK_HOST:$REMOTE_GUIDES/" "$LOCAL_DIR/"

COUNT=$(find "$LOCAL_DIR" -maxdepth 1 -name '*.json' 2>/dev/null | wc -l | tr -d ' ')
echo "[export] OK -> $COUNT guide(s) dans $LOCAL_DIR"
