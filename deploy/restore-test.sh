#!/usr/bin/env bash
# Real restore test into a TEMPORARY, ISOLATED MongoDB. Production is never touched.
#
#   ./deploy/restore-test.sh backups/mongo/academy-mongo-YYYYMMDD-HHMMSS.archive.gz
#
# The temporary container has no network (--network none), no ports, no named volumes
# (data on tmpfs), and its own name. Only that container is removed afterwards.
set -Eeuo pipefail

ARCHIVE="${1:-}"
[[ -n "$ARCHIVE" && -f "$ARCHIVE" ]] || { echo "Usage: $0 <academy-mongo-*.archive.gz>" >&2; exit 1; }
[[ -r "$ARCHIVE" ]] || { echo "Cannot read $ARCHIVE" >&2; exit 1; }

IMAGE="${RESTORE_TEST_IMAGE:-mongo:8.0}"   # keep in sync with docker-compose.yml
DB_NAME="${MONGO_APP_DB:-academy}"
NAME="academy-restore-test-$(date +%s)"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }

if command -v sha256sum >/dev/null 2>&1 && [[ -f "$ARCHIVE.sha256" ]]; then
  (cd "$(dirname "$ARCHIVE")" && sha256sum -c --quiet "$(basename "$ARCHIVE").sha256") \
    || { echo "Checksum mismatch for $ARCHIVE" >&2; exit 1; }
  log "Checksum OK"
fi

# -v removes only this container's anonymous volumes; production volumes are never referenced.
cleanup() { docker rm -f -v "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

log "Starting isolated MongoDB ($IMAGE) as $NAME..."
docker run -d --name "$NAME" --network none --memory 1g \
  --tmpfs /data/db:rw,size=2g --tmpfs /data/configdb:rw,size=64m \
  --label academy.purpose=restore-test \
  "$IMAGE" mongod --bind_ip 127.0.0.1 >/dev/null

for _ in $(seq 1 30); do
  docker exec "$NAME" mongosh --quiet --norc --eval 'db.adminCommand({ping:1}).ok' >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$NAME" mongosh --quiet --norc --eval 'db.adminCommand({ping:1}).ok' >/dev/null 2>&1 \
  || { echo "Temporary MongoDB did not start" >&2; exit 1; }

log "Restoring archive into the temporary instance..."
docker exec -i "$NAME" mongorestore --quiet --archive --gzip --nsInclude="${DB_NAME}.*" < "$ARCHIVE"

log "Restored collections and document counts:"
docker exec "$NAME" mongosh --quiet --norc "$DB_NAME" --eval '
  const names = db.getCollectionNames().sort();
  if (names.length === 0) { print("NO COLLECTIONS RESTORED"); quit(2); }
  names.forEach(c => print("  " + c.padEnd(28) + db.getCollection(c).countDocuments()));
  const users = db.getCollection("users").countDocuments();
  if (users === 0) { print("WARNING: users collection is empty"); }
'
log "Restore test PASSED (temporary instance will now be removed)"
