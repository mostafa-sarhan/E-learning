# Academy – Deployment Checklist (Docker Compose)

Step-by-step commands are in `DEPLOYMENT.md`.

## A. Completed locally (in the codebase)
- [x] Security: JWT auth, roles, students limited to their own records, bcrypt-only passwords, Helmet, restricted CORS, input checks, rate limits (JSON 429)
- [x] `docker-compose.yml` (project `academy`): frontend, backend, MongoDB on the private `academy-net`
- [x] Ports bound to `127.0.0.1` only and configurable (`ACADEMY_FRONTEND_PORT`, `ACADEMY_BACKEND_PORT`); MongoDB has no host port
- [x] Multi-stage Dockerfiles; runtime images have no dev dependencies, no source mounts and no secrets
- [x] Non-root processes (Node as `node`, unprivileged Nginx); `cap_drop: ALL` on app containers; `no-new-privileges`; memory/CPU limits; log rotation
- [x] Health checks: MongoDB ping, backend `/api/health`, frontend `/healthz`; `depends_on` waits for healthy services
- [x] Same-origin API: frontend Nginx proxies `/api` to the backend (path preserved, Authorization header passed through)
- [x] MongoDB auth with a least-privilege app user created on first start; named volumes for data and the WhatsApp session
- [x] WhatsApp: Debian Chromium, `PUPPETEER_SKIP_DOWNLOAD=true`, session volume writable by the app user, single initialization, no `pkill`
- [x] Graceful shutdown on SIGTERM (`init: true`, 20 s grace period)
- [x] Backup script, restore and rollback instructions; no global Docker cleanup commands
- [x] Local checks passing: Compose config validation, frontend lint/build, backend type check/build, 19 backend tests

## B. Configure during deployment (`.env` from `.env.example`)
| Item | Variable / place |
|---|---|
| MongoDB root and app passwords | `MONGO_ROOT_PASSWORD`, `MONGO_APP_PASSWORD` (`openssl rand -hex 24`) |
| JWT signing secret | `JWT_SECRET` (`openssl rand -hex 48`) |
| Public site origin | `CORS_ORIGINS` |
| Free host ports | `ACADEMY_FRONTEND_PORT` (8084), `ACADEMY_BACKEND_PORT` (5000) |
| Image tag | `ACADEMY_IMAGE_TAG=$(git rev-parse --short HEAD)` |
| Subdomain and frontend port | `deploy/nginx-academy.conf` → host `/etc/nginx/sites-available/academy` |
| TLS certificate | `certbot --nginx -d <subdomain>` |
| First admin (fresh DB) | `node dist/seedAdmin.js` via `docker compose exec` |
| Legacy `plainPassword` cleanup (migrated DB) | migration script, after a backup |

## C. Verify only after deployment (not tested yet)
- [ ] Docker images build on the VPS (not built locally: the Docker daemon wasn't running)
- [ ] `docker compose ps` shows all three services healthy
- [ ] `nginx -t` passes, and the other sites (LearnGate, SkyTop, Portfolio, School Auth) still respond unchanged
- [ ] HTTPS works; HTTP redirects to HTTPS; `/api/health` returns 200 through the domain
- [ ] Ports 8084/5000 aren't reachable from outside; MongoDB isn't reachable from the host network
- [ ] Admin, staff and student logins work; logout and token expiry return users to the login page
- [ ] Student portal: Vimeo lectures play, progress saves, an exam can be submitted
- [ ] No unexpected 429 responses during normal use (`docker compose logs academy-backend`)
- [ ] WhatsApp: Chromium starts, QR appears in the dashboard, a test message is delivered
- [ ] WhatsApp session survives `docker compose restart academy-backend` and an image rebuild
- [ ] `./deploy/backup.sh` produces both backups; a restore has been tested once
- [ ] Containers come back after a VPS reboot (`restart: unless-stopped`; the Docker service is enabled)

## Known accepted risks
- 9 high `npm audit` advisories through whatsapp-web.js → Puppeteer 24 (browser download tooling, which the image never runs).
- Chromium runs with `--no-sandbox` inside the hardened container (`CHROME_NO_SANDBOX`).
- whatsapp-web.js is unofficial; use a dedicated WhatsApp number.
