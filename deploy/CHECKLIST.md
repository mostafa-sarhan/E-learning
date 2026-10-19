# Academy – Deployment Checklist

Step-by-step commands are in `DEPLOYMENT.md`.

## A. Completed locally (in the codebase)
- [x] JWT auth on all API routes except `/api/health` and `/api/auth/login`; role checks; students limited to their own records
- [x] Passwords stored only as bcrypt hashes; one-time display on create/reset; `plainPassword` migration script (dry run by default)
- [x] Helmet, CORS limited to `CORS_ORIGINS`, 100 KB body limit, ObjectId checks, `$`-operator rejection, generic error messages
- [x] Rate limits: API (per user/IP), failed logins, sensitive admin actions, WhatsApp actions; JSON 429 responses
- [x] Env validation: production refuses to start without `MONGO_URI`, `CORS_ORIGINS`, `JWT_SECRET` (≥32 chars)
- [x] Frontend production build fails if `VITE_API_URL` is not set
- [x] Graceful shutdown (HTTP server, WhatsApp client, MongoDB) on SIGTERM/SIGINT; MongoDB URI never logged
- [x] WhatsApp: configurable Chrome path and session dir (created with mode 700), single initialization, no QR/phone logging
- [x] Backend binds to `127.0.0.1` by default; PM2 single instance (`ecosystem.config.js`)
- [x] Nginx site file (SPA + `/api` proxy + flood guard), `.env.example` files, `.gitignore` covers `.env*` and WhatsApp sessions
- [x] Checks passing: frontend lint/build, backend type check/build, 19 backend tests (in-memory MongoDB)

## B. Configure during deployment
| Item | Where |
|---|---|
| Domain (`academy.example.com`) | Nginx `server_name`, `CORS_ORIGINS`, `VITE_API_URL`, certbot |
| Free backend port (`<PORT>`) | `Backend-learning/.env` `PORT` and Nginx `proxy_pass` |
| MongoDB database, user and password | `MONGO_URI` |
| `JWT_SECRET` (`openssl rand -hex 48`) | `Backend-learning/.env` |
| `TRUST_PROXY=1` (behind Nginx) | `Backend-learning/.env` |
| Chrome path | `PUPPETEER_EXECUTABLE_PATH` |
| WhatsApp session dir (outside the app dir) | `WHATSAPP_SESSION_PATH` |
| Frontend web root path | Nginx `root` and the `rsync` target |
| First admin (fresh DB only) | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` |
| Remove legacy `plainPassword` (existing DB only) | backup, then run the migration script |
| Install with `PUPPETEER_SKIP_DOWNLOAD=true` | `npm ci` for the backend |

## C. Verify only after deployment (not tested yet)
- [ ] `nginx -t` passes, and LearnGate still responds unchanged
- [ ] HTTPS certificate issued; HTTP redirects to HTTPS
- [ ] `https://<domain>/api/health` returns 200; port `<PORT>` and 27017 are not reachable from outside
- [ ] Admin, staff and student logins work in the browser; logout and token expiry send users back to the login page
- [ ] Student portal: lectures (Vimeo) play, progress saves, an exam can be taken and submitted
- [ ] A staff page from another origin is blocked by CORS (sanity check)
- [ ] Rate limits don't block normal classroom use (watch for 429s in `pm2 logs academy-api`)
- [ ] WhatsApp: Chrome starts headless, QR appears on the dashboard, a test message is delivered
- [ ] WhatsApp session survives `pm2 restart academy-api` (no new QR needed)
- [ ] PM2 restarts the app after a reboot (`pm2 startup` / `pm2 save`)
- [ ] MongoDB backups are scheduled

## Known accepted risks
- 9 high `npm audit` advisories through whatsapp-web.js → Puppeteer 24 (browser download tooling). No non-breaking fix exists; mitigated by `PUPPETEER_SKIP_DOWNLOAD=true` and the system Chrome.
- whatsapp-web.js is unofficial; WhatsApp may ban the number. Use a dedicated number.
