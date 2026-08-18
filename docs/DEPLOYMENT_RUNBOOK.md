# Dodam Frontend Deployment Runbook

Status: U10 deployed baseline
Verified at: 2026-08-18

## Target Topology

- Frontend: Vercel Next.js project
- Backend API: Render web service
- Database: Supabase PostgreSQL, accessed only by backend

The project uses `vercel.json` to pin the Vercel framework, install command, and build command while keeping Vercel's Next.js defaults for output handling.

Current deployed frontend URL:

- `https://dodam-frontend.vercel.app`

Current deployed backend API base URL:

- `https://dodam-backend.onrender.com`

## Required Runtime Variables

Set this in Vercel project variables.

- `NEXT_PUBLIC_API_BASE_URL`: Render backend public URL, without a trailing slash.

Do not store backend secrets, database URLs, JWT secrets, or OpenAI keys in the frontend project.

## Local Build

```bash
npm ci
npm run lint
node --test app/chat/chatProgress.test.mjs
npm run build
```

## Local Browser Smoke

Run this when a frontend change touches chat rendering, form submission, or
client-side request handling.

1. Build the app.

   ```bash
   npm run build
   ```

2. Start the production server locally.

   ```bash
   npm run start
   ```

3. Use Playwright or a browser to open `/chat` and verify:

   - HTTP status is 200.
   - The page title is `도담 — 가족·육아 복지 도우미`.
   - `새 상담 시작`, `상담 이력`, the message input, and `전송` are visible.
   - Browser console errors and page errors are empty.

If Playwright browser binaries are missing in a fresh environment, install
Chromium first.

```bash
npx playwright install chromium
```

## Deployment Order

1. Deploy or update the Render backend.
2. Confirm backend `/health/ready` returns HTTP 200.
3. Set `NEXT_PUBLIC_API_BASE_URL` to the Render backend URL.
4. Deploy the Vercel frontend.
5. Run U10 smoke from the deployed frontend and backend.

## Verified Deployment Smoke

Checked on 2026-08-18 KST:

- Vercel production URL: `https://dodam-frontend.vercel.app`
- Build/deploy source: clean worktree at commit `a2901fc`
- `GET https://dodam-frontend.vercel.app`: HTTP 200
- Backend readiness dependency:
  `GET https://dodam-backend.onrender.com/health/ready`: HTTP 200

## Boundaries

- Vercel preview/build success does not prove backend readiness.
- Frontend rollback does not roll back backend API changes or database migrations.
- Current smoke proves HTTP serving only. Deployed auth, policy search,
  recommendation/chat lifecycle, SSE recovery, fallback display, and browser
  rendering still require explicit browser/API E2E validation.
