#!/usr/bin/env bash
# Online MongoDB backup for the `academy` Compose project. Does NOT stop any container.
#
#   ./deploy/backup.sh
#
# Steps: mongodump (app user, academy DB only) -> temp file -> integrity checks
#        (non-empty, gzip stream, mongorestore --dryRun: reads the archive, writes nothing)
#        -> atomic rename -> retention cleanup of old academy backup files only.
#
# Settings (environment variables):
#   BACKUP_DIR       default: <repo>/backups/mongo
#   RETENTION_DAYS   delete academy backups older than this (default 14)
#   MIN_KEEP         always keep at least this many newest backups (default 7)
#   MIN_BYTES        reject archives smaller than this (default 1024)
set -Eeuo pipefail
umask 077

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups/mongo}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
MIN_KEEP="${MIN_KEEP:-7}"
MIN_BYTES="${MIN_BYTES:-1024}"
PREFIX="academy-mongo-"
SUFFIX=".archive.gz"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

[[ "$RETENTION_DAYS" =~ ^[0-9]+$ && "$MIN_KEEP" =~ ^[0-9]+$ && "$MIN_BYTES" =~ ^[0-9]+$ ]] \
  || fail "RETENTION_DAYS, MIN_KEEP and MIN_BYTES must be whole numbers"
[[ "$MIN_KEEP" -ge 1 ]] || fail "MIN_KEEP must be at least 1"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Prevent overlapping runs (cron/timer + manual).
if command -v flock >/dev/null 2>&1; then
  exec 9>"$BACKUP_DIR/.backup.lock"
  flock -n 9 || fail "another academy backup is already running"
fi

docker compose ps --status running --services 2>/dev/null | grep -qx academy-mongodb \
  || fail "academy-mongodb is not running (run from the academy repository directory)"

STAMP="$(date +%Y%m%d-%H%M%S)"
FINAL="$BACKUP_DIR/${PREFIX}${STAMP}${SUFFIX}"
TMP="$FINAL.partial"
trap 'rm -f "$TMP"' EXIT

log "Dumping academy database..."
# Credentials are read from the container's own environment; nothing is passed on the host.
if ! docker compose exec -T academy-mongodb sh -c \
  'exec mongodump --quiet --archive --gzip -u "$MONGO_APP_USER" -p "$MONGO_APP_PASSWORD" --authenticationDatabase "$MONGO_APP_DB" --db "$MONGO_APP_DB"' \
  > "$TMP"; then
  fail "mongodump failed; partial file discarded"
fi

SIZE="$(wc -c < "$TMP" | tr -d ' ')"
[[ "$SIZE" -ge "$MIN_BYTES" ]] || fail "archive too small (${SIZE} bytes < ${MIN_BYTES}); discarded"

gzip -t "$TMP" 2>/dev/null || fail "archive is not a complete gzip stream; discarded"

log "Verifying archive with mongorestore --dryRun (no data is written)..."
if ! VERIFY_OUT="$(docker compose exec -T academy-mongodb sh -c \
  'exec mongorestore --dryRun --archive --gzip -u "$MONGO_APP_USER" -p "$MONGO_APP_PASSWORD" --authenticationDatabase "$MONGO_APP_DB" --nsInclude="$MONGO_APP_DB.*"' \
  < "$TMP" 2>&1)"; then
  printf '%s\n' "$VERIFY_OUT" | tail -5 >&2
  fail "archive verification failed; discarded"
fi

mv "$TMP" "$FINAL"
trap - EXIT
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$BACKUP_DIR" && sha256sum "$(basename "$FINAL")" > "$(basename "$FINAL").sha256")
fi
log "Backup OK: $FINAL (${SIZE} bytes)"

# Retention: only files matching the academy naming pattern in BACKUP_DIR; newest MIN_KEEP always kept.
COUNT=0
DELETED=0
while IFS= read -r f; do
  COUNT=$((COUNT + 1))
  [[ "$COUNT" -le "$MIN_KEEP" ]] && continue
  if [[ -n "$(find "$f" -maxdepth 0 -type f -mtime +"$RETENTION_DAYS" 2>/dev/null)" ]]; then
    rm -f -- "$f" "$f.sha256"
    DELETED=$((DELETED + 1))
  fi
done < <(ls -1t "$BACKUP_DIR"/${PREFIX}*${SUFFIX} 2>/dev/null || true)
log "Retention: kept newest ${MIN_KEEP}, removed ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
