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

Placeholders: `academy.example.com`, `/opt/educational-academy`, `<repo-url>`.

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
sudo mkdir -p /opt/educational-academy && sudo chown $USER /opt/educational-academy
git clone <repo-url> /opt/educational-academy && cd /opt/educational-academy
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
cd /opt/educational-academy
./deploy/backup.sh                               # online MongoDB backup, verified (section 7)
docker compose images                            # note the current tag for rollback
git pull
export ACADEMY_IMAGE_TAG=$(git rev-parse --short HEAD)
docker compose build
docker compose up -d                             # recreates changed services; volumes are kept
docker compose ps
```

## 7. Backups, scheduling and restore

### 7.1 MongoDB backup (online, no downtime)
```bash
./deploy/backup.sh
```
- `mongodump` runs inside `academy-mongodb` with the least-privilege app user, and only the academy database is dumped. No container is stopped.
- The archive is written to a `.partial` file first. It's discarded if `mongodump` fails, if the file is smaller than `MIN_BYTES`, if the gzip stream is incomplete, or if `mongorestore --dryRun` can't read it. A dry run reads the archive and writes nothing.
- Valid archives become `backups/mongo/academy-mongo-YYYYMMDD-HHMMSS.archive.gz`, with a `.sha256` checksum file next to each.
- **Retention:** files matching `academy-mongo-*.archive.gz` in `BACKUP_DIR` that are older than `RETENTION_DAYS` (default 14) are deleted, but the newest `MIN_KEEP` (default 7) are always kept. Nothing else is touched.
- Overlapping runs are blocked with `flock`.

### 7.2 Daily schedule (choose one)
The user that runs the job must be allowed to run `docker compose` (docker group).

**systemd timer (recommended):**
```bash
sudo cp deploy/systemd/academy-backup.service deploy/systemd/academy-backup.timer /etc/systemd/system/
sudo nano /etc/systemd/system/academy-backup.service      # set User= and the /opt/educational-academy paths
sudo systemctl daemon-reload
sudo systemctl enable --now academy-backup.timer
systemctl list-timers academy-backup.timer                # next run
sudo systemctl start academy-backup.service               # optional: run once now
journalctl -u academy-backup.service -n 50                # results
```
**or cron** (`crontab -e` as the deploy user):
```
15 3 * * * cd /opt/educational-academy && RETENTION_DAYS=14 MIN_KEEP=7 ./deploy/backup.sh >> "$HOME/academy-backup.log" 2>&1
```

### 7.3 WhatsApp session backup (explicit, not scheduled)
```bash
./deploy/backup-whatsapp.sh                 # online copy; backend keeps running
./deploy/backup-whatsapp.sh --stop-backend  # consistent snapshot; stops ONLY academy-backend for seconds
```
Chromium writes to the session while it runs, so an online copy may be inconsistent. If a restored
session fails, re-scan the QR code, or take the next backup with `--stop-backend`. Frontend and MongoDB keep
running. The volume is mounted read-only, the archive is verified with a full `tar` listing, and the
newest `MIN_KEEP` (default 5) archives are kept.

### 7.4 Off-server encrypted copies
Backups on the VPS don't protect against losing the VPS. Encrypt on the server with a **public** key,
so the server can't decrypt its own backups, then copy them elsewhere.
```bash
# Once, on your own machine (keep the key file offline / in a password manager):
age-keygen -o academy-backup.key          # prints the public key: age1...
# On the VPS (apt install age rclone; configure an rclone remote, e.g. S3/B2/Drive):
f=$(ls -1t backups/mongo/academy-mongo-*.archive.gz | head -1)
age -r age1YOURPUBLICKEY -o "$f.age" "$f"
rclone copy "$f.age" remote:academy-backups/mongo/ && rm -f "$f.age"
# Decrypt later on a trusted machine:
age -d -i academy-backup.key -o restore.archive.gz academy-mongo-....archive.gz.age
```
To automate this, add the `age` and `rclone` lines after `backup.sh` in the same cron or systemd job.
Use a bucket or remote with its own retention, and versioning or object lock if available.

### 7.5 Restore test (isolated, never production)
Run this regularly, for example monthly, and after any backup change:
```bash
./deploy/restore-test.sh backups/mongo/academy-mongo-YYYYMMDD-HHMMSS.archive.gz
```
The script:
- starts a throwaway `mongo:8.0` container (`academy-restore-test-*`) with **no network**, no published
  ports, data on tmpfs and no named volumes;
- checks the `.sha256` checksum;
- restores the archive into that container;
- prints each collection and its document count, and fails if nothing was restored;
- removes only that temporary container.

It never connects to `academy-mongodb` or its volume.

### 7.6 Restoring production (emergency only)
**This replaces the academy collections.** Run a restore test with the same archive and take a fresh backup first:
```bash
./deploy/backup.sh
docker compose exec -T academy-mongodb sh -c \
  'mongorestore --archive --gzip --drop -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --nsInclude="$MONGO_APP_DB.*"' \
  < backups/mongo/academy-mongo-YYYYMMDD-HHMMSS.archive.gz
```
Restore the WhatsApp session (stops only the backend):
```bash
docker compose stop academy-backend
docker run --rm --network none -v academy-whatsapp-session:/dst -v "$PWD/backups/whatsapp":/backup:ro alpine:3.20 \
  sh -c 'rm -rf /dst/* && tar xzf /backup/academy-whatsapp-YYYYMMDD-HHMMSS.tgz -C /dst && chown -R 1000:1000 /dst'
docker compose start academy-backend
```
Volumes are never deleted or recreated. Never use `docker compose down -v` or any prune command.

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

## 10. Demo data
Optional showcase data (explicit seed/cleanup commands, dry run by default): see `DEMO_DATA.md`.

## Known risks
- `whatsapp-web.js` pins Puppeteer 24, which has 9 high `npm audit` advisories in its
  browser download tooling. The image never downloads a browser (`PUPPETEER_SKIP_DOWNLOAD=true`,
  Debian Chromium is used instead), so that code path doesn't run.
- whatsapp-web.js is unofficial, and WhatsApp may ban the number. Use a dedicated number.
- Rate-limit counters are in memory: run a single backend replica.
