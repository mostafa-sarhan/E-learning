#!/usr/bin/env sh
# Backs up the academy MongoDB database and WhatsApp session into ./backups.
# Scoped to the `academy` Compose project; run from the repository root.
set -eu

cd "$(dirname "$0")/.."
STAMP=$(date +%F-%H%M)
mkdir -p backups
chmod 700 backups

docker compose exec -T academy-mongodb sh -c \
  'mongodump --archive --gzip -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db "$MONGO_APP_DB"' \
  > "backups/mongo-$STAMP.archive.gz"
echo "MongoDB backup: backups/mongo-$STAMP.archive.gz"

docker compose stop academy-backend
trap 'docker compose start academy-backend' EXIT
docker run --rm -v academy-whatsapp-session:/src:ro -v "$PWD/backups":/backup alpine:3.20 \
  tar czf "/backup/whatsapp-$STAMP.tgz" -C /src .
echo "WhatsApp session backup: backups/whatsapp-$STAMP.tgz"
