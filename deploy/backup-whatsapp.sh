#!/usr/bin/env bash
# WhatsApp session backup for the `academy` Compose project. Run it explicitly; it isn't scheduled.
#
#   ./deploy/backup-whatsapp.sh                 # online copy, backend keeps running
#   ./deploy/backup-whatsapp.sh --stop-backend  # consistent snapshot: briefly stops ONLY academy-backend
#
# An online copy can catch Chromium mid-write; if a restored session fails, re-scan the QR code
# or use --stop-backend. The session volume is mounted read-only and never modified.
# Settings: BACKUP_DIR (default <repo>/backups/whatsapp), MIN_KEEP (default 5).
set -Eeuo pipefail
umask 077

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups/whatsapp}"
MIN_KEEP="${MIN_KEEP:-5}"
VOLUME="academy-whatsapp-session"
PREFIX="academy-whatsapp-"
SUFFIX=".tgz"
STOP_BACKEND=false
[[ "${1:-}" == "--stop-backend" ]] && STOP_BACKEND=true

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

[[ "$MIN_KEEP" =~ ^[0-9]+$ && "$MIN_KEEP" -ge 1 ]] || fail "MIN_KEEP must be a whole number >= 1"
docker volume inspect "$VOLUME" >/dev/null 2>&1 || fail "volume $VOLUME not found"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
FINAL="$BACKUP_DIR/${PREFIX}${STAMP}${SUFFIX}"
TMP="$FINAL.partial"
RESTART=false

cleanup() {
  rm -f "$TMP"
  if [[ "$RESTART" == true ]]; then
    log "Starting academy-backend again..."
    docker compose start academy-backend >/dev/null
  fi
}
trap cleanup EXIT

if [[ "$STOP_BACKEND" == true ]]; then
  log "Stopping academy-backend for a consistent snapshot (other services keep running)..."
  docker compose stop academy-backend >/dev/null
  RESTART=true
fi

# Tar runs in a throwaway container with no network; the volume is mounted read-only.
docker run --rm --network none -v "$VOLUME":/src:ro alpine:3.20 tar czf - -C /src . > "$TMP" \
  || fail "tar of $VOLUME failed; partial file discarded"

if [[ "$RESTART" == true ]]; then
  docker compose start academy-backend >/dev/null
  RESTART=false
fi

[[ -s "$TMP" ]] || fail "archive is empty; discarded"
# Reading the full listing detects truncated or corrupt archives.
ENTRIES="$(tar tzf "$TMP" 2>/dev/null | wc -l | tr -d ' ')" || fail "archive is incomplete or corrupt; discarded"
[[ "$ENTRIES" -gt 1 ]] || fail "archive has no session files (is WhatsApp linked?); discarded"

mv "$TMP" "$FINAL"
log "WhatsApp session backup OK: $FINAL (${ENTRIES} entries)"

# Keep only the newest MIN_KEEP academy WhatsApp archives in BACKUP_DIR.
COUNT=0
while IFS= read -r f; do
  COUNT=$((COUNT + 1))
  [[ "$COUNT" -le "$MIN_KEEP" ]] || rm -f -- "$f"
done < <(ls -1t "$BACKUP_DIR"/${PREFIX}*${SUFFIX} 2>/dev/null || true)
