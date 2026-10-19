# Educational Academy – Frontend

React 19 + Vite + Tailwind CSS single-page app.

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:5000
npm install
npm run dev              # development server
npm run lint
npm run build            # production build into dist/ (requires VITE_API_URL)
```

In production the `Dockerfile` builds `dist/` and serves it with Nginx, which also proxies `/api`
to the backend (`docker/nginx.conf`). `VITE_API_URL` is embedded at build time; empty = same-origin.
