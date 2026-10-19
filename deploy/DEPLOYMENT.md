# Academy – Hostinger VPS Deployment

The academy runs next to LearnGate without touching it. It gets its own directory,
system user, PM2 process, port, MongoDB database/user and Nginx site file.
Do not restart, reload or edit anything belonging to LearnGate. `nginx -t` followed
by `reload` is the only shared action, and it is non-disruptive when the test passes.

Placeholders: `academy.example.com`, `<PORT>` (default 5000), `<DB_PASSWORD>`, `<repo-url>`.
See `CHECKLIST.md` for what's done locally, what to configure, and what to verify after deploy.

## 0. Pre-flight checks (read-only)
```bash
sudo ss -ltnp                         # list used ports; choose a free <PORT>, never assume 5000
ls /etc/nginx/sites-enabled/          # confirm no existing site uses academy.example.com
grep -R "academy_api" /etc/nginx/ || true   # limit_req zone name must be unique
free -h                               # Chromium for WhatsApp needs ~500 MB–1 GB extra RAM
node -v                               # Node.js 20+ required
```

## 1. System prerequisites (install only what is missing)
- Node.js 20+, and PM2 (`sudo npm i -g pm2`). If LearnGate already uses PM2, keep using it.
  The academy only adds one more process, `academy-api`.
- **Chromium for WhatsApp (recommended: Google Chrome .deb, not the snap):**
  ```bash
  wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  sudo apt install -y ./google-chrome-stable_current_amd64.deb fonts-noto-core
  ```
  With a system Chrome installed, Puppeteer's own browser download is skipped
  (see step 3). This also avoids the vulnerable download/unzip code path described under Known risks.
- **MongoDB:** either MongoDB Atlas, or a local `mongod` that listens on `127.0.0.1` only
  (`net.bindIp: 127.0.0.1` in `/etc/mongod.conf`) with authorization enabled.
  If LearnGate already uses a local MongoDB, do **not** change its config. Only add a new
  database and user:
  ```js
  // mongosh as an admin
  use academy
  db.createUser({ user: "academy", pwd: "<DB_PASSWORD>", roles: [{ role: "readWrite", db: "academy" }] })
  ```
  Port 27017 must not be open in the firewall: `sudo ufw status` (no 27017 rule).

## 2. Directories and user
```bash
sudo adduser --system --group --home /var/www/academy academy
sudo mkdir -p /var/www/academy /var/lib/academy/wwebjs_auth
sudo chown -R academy:academy /var/www/academy /var/lib/academy
sudo chmod 700 /var/lib/academy/wwebjs_auth
```
`/var/lib/academy/wwebjs_auth` lies outside the code directory, so the WhatsApp session
survives restarts and redeploys.

## 3. Backend
```bash
sudo -u academy -H bash
cd /var/www/academy && git clone <repo-url> app && cd app/Backend-learning
cp .env.example .env && chmod 600 .env
#   Edit .env and set:
#   NODE_ENV=production  HOST=127.0.0.1  PORT=<PORT>
#   MONGO_URI=mongodb://academy:<DB_PASSWORD>@127.0.0.1:27017/academy?authSource=academy
#   JWT_SECRET=$(openssl rand -hex 48)
#   CORS_ORIGINS=https://academy.example.com   TRUST_PROXY=1
#   (the server refuses to start in production without MONGO_URI, JWT_SECRET >= 32 chars, CORS_ORIGINS)
#   WHATSAPP_SESSION_PATH=/var/lib/academy/wwebjs_auth
#   PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
PUPPETEER_SKIP_DOWNLOAD=true npm ci
npm run build
npm prune --omit=dev
pm2 start ecosystem.config.js
pm2 save
curl -s http://127.0.0.1:<PORT>/api/health
```
Keep **one** instance (`fork` mode). The WhatsApp client and the in-memory rate-limit
counters are per process. Running several instances would need a shared Redis store
(`rate-limit-redis`) and a single dedicated WhatsApp worker.

Boot persistence: if PM2 is not already set up to start at boot for the `academy` user,
run `pm2 startup` and execute the command it prints. This does not affect other users' PM2.
For log rotation, `pm2 install pm2-logrotate` (skip it if already installed).

### First admin account (fresh database only)
```bash
SEED_ADMIN_EMAIL=admin@academy.example.com SEED_ADMIN_PASSWORD='<12+ chars>' \
  node -r dotenv/config dist/seedAdmin.js
```

### Legacy plaintext passwords (existing database only)
Older versions stored a `plainPassword` field. Login never used it (the bcrypt hash
in `password` is used), and the API no longer reads or returns it. To delete it:
```bash
mongodump --uri="$MONGO_URI" --out=/var/backups/academy-$(date +%F)   # 1. backup
node dist/scripts/removePlainPasswords.js                                # 2. dry run (count)
node dist/scripts/removePlainPasswords.js --apply                        # 3. remove
```
Existing student passwords keep working. Admins can no longer view them. They use
**Reset password** on the Student Accounts page, which shows a new password once.

## 4. Frontend
```bash
cd /var/www/academy/app/system-learning
echo "VITE_API_URL=https://academy.example.com" > .env.production   # build fails if missing
npm ci && npm run build
mkdir -p /var/www/academy/frontend
rsync -a --delete dist/ /var/www/academy/frontend/
```

## 5. Nginx + HTTPS
```bash
sudo cp /var/www/academy/app/deploy/nginx-academy.conf /etc/nginx/sites-available/academy
sudo nano /etc/nginx/sites-available/academy          # replace domain and <PORT>
sudo ln -s /etc/nginx/sites-available/academy /etc/nginx/sites-enabled/academy
sudo nginx -t && sudo systemctl reload nginx          # reload only if the test passes
sudo certbot --nginx -d academy.example.com
```
Point the domain's DNS A record at the VPS before running certbot.

## 6. WhatsApp
Log in as staff, open the WhatsApp page and scan the QR code. The session is stored in
`WHATSAPP_SESSION_PATH`. Back that folder up, and never commit or share it.
To run without WhatsApp, set `WHATSAPP_ENABLED=false`.

## 7. Updates
```bash
cd /var/www/academy/app && git pull
cd Backend-learning && PUPPETEER_SKIP_DOWNLOAD=true npm ci && npm run build && npm prune --omit=dev && pm2 restart academy-api
cd ../system-learning && npm ci && npm run build && rsync -a --delete dist/ /var/www/academy/frontend/
```

## Auth notes
- Every API route except `/api/health` and `/api/auth/login` requires a JWT (default lifetime 12h).
  Users must log in again after the first deploy.
- Student passwords are shown once, when the account is created or reset. They are stored only as bcrypt hashes.

## Known risks
- `whatsapp-web.js@1.34.7` pins `puppeteer@24.38.0`. `npm audit` reports 9 high advisories,
  all inside Puppeteer's *browser download* tooling (`@puppeteer/browsers` → `extract-zip`
  symlink traversal, and `proxy-agent` → `basic-ftp` ReDoS). No patched Puppeteer 24.x exists.
  The fix is Puppeteer 25 (a breaking change that whatsapp-web.js doesn't support), and
  `extract-zip` has no fix at all. Mitigations: install with `PUPPETEER_SKIP_DOWNLOAD=true`
  and use the system Chrome, so the vulnerable unzip path never runs. Don't configure
  FTP/PAC proxies. Re-check when whatsapp-web.js releases an update.
- whatsapp-web.js automates WhatsApp Web, which WhatsApp does not officially support.
  The number can be banned. Use a dedicated number.
