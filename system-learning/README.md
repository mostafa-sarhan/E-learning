# Educational Academy – Frontend

React 19 + Vite + Tailwind CSS single-page app.

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:5000
npm install
npm run dev              # development server
npm run lint
npm run build            # production build into dist/ (requires VITE_API_URL)
```

In production, `dist/` is served as static files by Nginx (see `../deploy/DEPLOYMENT.md`).
`VITE_API_URL` is embedded at build time, so set it in `.env.production` before building.
