# Dodam Frontend Deployment Runbook

Status: U9 baseline
Verified at: 2026-08-18

## Target Topology

- Frontend: Vercel Next.js project
- Backend API: Railway web service
- Database: Railway PostgreSQL, accessed only by backend

The project uses `vercel.json` to pin the Vercel framework, install command, and build command while keeping Vercel's Next.js defaults for output handling.

## Required Runtime Variables

Set this in Vercel project variables.

- `NEXT_PUBLIC_API_BASE_URL`: Railway backend public URL, without a trailing slash.

Do not store backend secrets, database URLs, JWT secrets, or OpenAI keys in the frontend project.

## Local Build

```bash
npm ci
npm run lint
node app/chat/chatProgress.test.mjs
npm run build
```

## Deployment Order

1. Deploy or update the Railway backend.
2. Confirm backend `/health/ready` returns HTTP 200.
3. Set `NEXT_PUBLIC_API_BASE_URL` to the Railway backend URL.
4. Deploy the Vercel frontend.
5. Run U10 smoke from the browser against the deployed frontend.

## Boundaries

- Vercel preview/build success does not prove backend readiness.
- Frontend rollback does not roll back backend API changes or database migrations.
- U10 must still verify deployed auth, policy search, recommendation/chat lifecycle, SSE recovery, fallback display, and browser rendering.
