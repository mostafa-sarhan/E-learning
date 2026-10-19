# Educational Academy

Student management and e-learning platform.

| Part | Path | Stack |
|---|---|---|
| Frontend | `system-learning/` | React 19, Vite, Tailwind CSS (static build) |
| Backend | `Backend-learning/` | Node.js, Express 5, TypeScript, MongoDB (Mongoose), whatsapp-web.js |
| Deployment | `deploy/` | Nginx site template, VPS guide and checklist |

## Local development
```bash
# Backend (requires a local MongoDB)
cd Backend-learning && cp .env.example .env   # set NODE_ENV=development and local values
npm install && npm run dev                     # http://localhost:5000

# Frontend
cd system-learning && cp .env.example .env
npm install && npm run dev                     # http://localhost:5173
```

## Checks
```bash
cd Backend-learning && npm run typecheck && npm run build && npm test
cd system-learning && npm run lint && VITE_API_URL=https://academy.example.com npm run build
```

## Production
Self-hosted on a Linux VPS: Nginx (HTTPS, static frontend, `/api` reverse proxy),
PM2 for the backend, MongoDB, and a persistent WhatsApp session directory.
See [`deploy/DEPLOYMENT.md`](deploy/DEPLOYMENT.md) and [`deploy/CHECKLIST.md`](deploy/CHECKLIST.md).
