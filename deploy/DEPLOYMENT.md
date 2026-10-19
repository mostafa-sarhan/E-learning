# Academy – Docker Compose Deployment (shared VPS)

The academy runs as its own Compose project, **`academy`**. It has its own private network
(`academy-net`), named volumes and localhost-only ports. It never joins other projects'
networks, and these steps don't touch LearnGate, SkyTop, Portfolio or School Auth.

```
client ─HTTPS─> host Nginx ─> 127.0.0.1:8084  academy-frontend (Nginx: SPA + /api proxy)
                                                     │ academy-net (private)
                                                     ├─> academy-backend:5000  (Node + Chromium)
                                                     └─> academy-mongodb:27017 (no host port)
```

Run every command from the repository directory. The Compose file sets `name: academy`, so
all commands are scoped to the academy project.
**Never use** `docker system prune`, `docker volume prune` or `docker compose down -v`.

Placeholders: `academy.example.com`, `/opt/academy`, `<repo-url>`.

## 1. Pre-flight (read-only)
```bash
docker --version && docker compose version   # Compose v2 required
sudo ss -ltnp | grep -E ':8084|:5000'        # if a port is taken, choose another in .env
docker network ls | grep academy-net         # must not exist yet, or must belong to this project
docker volume ls | grep academy-             # same
free -h                                      # backend (Chromium) may use up to 1.5 GB
```

## 2. Initial deployment
```bash
sudo mkdir -p /opt/academy && sudo chown $USER /opt/academy
git clone <repo-url> /opt/academy && cd /opt/academy
cp .env.example .env && chmod 600 .env
```
Edit `.env`. Compose reads it automatically for `${...}` interpolation; no other env file is needed.

| Variable | Value |
|---|---|
| `MONGO_ROOT_PASSWORD`, `MONGO_APP_PASSWORD` | `openssl rand -hex 24` (hex: safe in the MongoDB URI) |
| `JWT_SECRET` | `openssl rand -hex 48` |
| `CORS_ORIGINS` | `https://academy.example.com` |
| `ACADEMY_FRONTEND_PORT` / `ACADEMY_BACKEND_PORT` | free localhost ports (default 8084 / 5000) |
| `VITE_API_URL` | leave empty (same-origin `/api`) |

Generate secrets straight into the file so they never show up on screen or in shell history:
```bash
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 48)/" .env
sed -i "s/^MONGO_ROOT_PASSWORD=.*/MONGO_ROOT_PASSWORD=$(openssl rand -hex 24)/" .env
sed -i "s/^MONGO_APP_PASSWORD=.*/MONGO_APP_PASSWORD=$(openssl rand -hex 24)/" .env
```

Build and start:
```bash
export ACADEMY_IMAGE_TAG=$(git rev-parse --short HEAD)
docker compose config --quiet          # validates .env and the Compose file
docker compose build
docker compose up -d
docker compose ps                      # all three services should become "healthy"
```
MongoDB runs `deploy/mongo-init/` only on its **first** start, when the volume is empty. That creates
the least-privilege `MONGO_APP_USER`. Changing the passwords in `.env` later does not change the users
already in the database.

First admin account (fresh database only). `read -s` keeps the password out of history:
```bash
read -rp "Admin email: " E; read -rsp "Admin password (12+ chars): " P; echo
docker compose exec -e SEED_ADMIN_EMAIL="$E" -e SEED_ADMIN_PASSWORD="$P" academy-backend node dist/seedAdmin.js
unset E P
```

## 3. Host Nginx + HTTPS
```bash
sudo cp deploy/nginx-academy.conf /etc/nginx/sites-available/academy
sudo nano /etc/nginx/sites-available/academy     # set server_name and the frontend port
sudo ln -s /etc/nginx/sites-available/academy /etc/nginx/sites-enabled/academy
sudo nginx -t && sudo systemctl reload nginx     # reload only if the test passes
sudo certbot --nginx -d academy.example.com      # DNS A record must point to the VPS first
```

## 4. Health checks and logs
```bash
docker compose ps
curl -fsS http://127.0.0.1:8084/healthz              # frontend container
curl -fsS http://127.0.0.1:8084/api/health           # backend through the frontend proxy
curl -fsS https://academy.example.com/api/health     # full path through host Nginx
docker compose logs -f --tail=100 academy-backend
docker compose logs --tail=100 academy-frontend academy-mongodb
```
Logs are rotated by Docker (10 MB × 5 files per container). The app never logs secrets, QR codes or phone numbers.

## 5. WhatsApp
Log in as staff, open the WhatsApp page and scan the QR code. The session is stored in the
`academy-whatsapp-session` volume, so it survives restarts, rebuilds and updates. Set
`WHATSAPP_ENABLED=false` to run without WhatsApp. Chromium runs without its internal sandbox
(`CHROME_NO_SANDBOX=true`) because the hardened container blocks it. The container itself is
the isolation boundary: non-root, all capabilities dropped, `no-new-privileges`.

## 6. Safe update workflow
```bash
cd /opt/academy
./deploy/backup.sh                               # MongoDB + WhatsApp session backup (section 7)
docker compose images                            # note the current tag for rollback
git pull
export ACADEMY_IMAGE_TAG=$(git rev-parse --short HEAD)
docker compose build
docker compose up -d                             # recreates changed services; volumes are kept
docker compose ps
```

## 7. Backup and restore
`./deploy/backup.sh` writes to `backups/` (git-ignored). It runs the following:
```bash
mkdir -p backups && chmod 700 backups
# MongoDB: credentials stay inside the container (read from its environment)
docker compose exec -T academy-mongodb sh -c \
  'mongodump --archive --gzip -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db "$MONGO_APP_DB"' \
  > backups/mongo-$(date +%F-%H%M).archive.gz

# WhatsApp session: stop the backend briefly for a consistent copy
docker compose stop academy-backend
docker run --rm -v academy-whatsapp-session:/src:ro -v "$PWD/backups":/backup alpine:3.20 \
  tar czf /backup/whatsapp-$(date +%F-%H%M).tgz -C /src .
docker compose start academy-backend
```
Copy backups off the server regularly.

Restore MongoDB. **This replaces the academy collections.** Take a fresh backup first:
```bash
docker compose exec -T academy-mongodb sh -c \
  'mongorestore --archive --gzip --drop -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --nsInclude="$MONGO_APP_DB.*"' \
  < backups/mongo-YYYY-MM-DD-HHMM.archive.gz
```
Restore the WhatsApp session:
```bash
docker compose stop academy-backend
docker run --rm -v academy-whatsapp-session:/dst -v "$PWD/backups":/backup:ro alpine:3.20 \
  sh -c 'rm -rf /dst/* && tar xzf /backup/whatsapp-YYYY-MM-DD-HHMM.tgz -C /dst && chown -R 1000:1000 /dst'
docker compose start academy-backend
```

## 8. Rollback
Images are tagged with the commit hash, and earlier tags stay on the host.
```bash
docker image ls | grep academy-                  # find the previous tag
git checkout <previous-commit>                   # keeps compose/config consistent with the images
export ACADEMY_IMAGE_TAG=<previous-tag>
docker compose up -d --no-build
```
If the release changed data, also restore the MongoDB backup taken before the update (section 7).
To free space, remove only specific old academy images (`docker image rm academy-backend:<old-tag>`). Never prune.

## 9. One-off maintenance
```bash
# Remove legacy plaintext passwords (databases migrated from older versions):
docker compose exec academy-backend node dist/scripts/removePlainPasswords.js          # dry run
docker compose exec academy-backend node dist/scripts/removePlainPasswords.js --apply  # after a backup
# Stop the stack (volumes are kept):
docker compose down
```

## Known risks
- `whatsapp-web.js` pins Puppeteer 24, which has 9 high `npm audit` advisories in its
  browser download tooling. The image never downloads a browser (`PUPPETEER_SKIP_DOWNLOAD=true`,
  Debian Chromium is used instead), so that code path doesn't run.
- whatsapp-web.js is unofficial, and WhatsApp may ban the number. Use a dedicated number.
- Rate-limit counters are in memory: run a single backend replica.
