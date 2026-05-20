# Deployment Walkthrough

Step-by-step for a first-time production deploy of Rihla to **Railway** (api + DB + Redis) and **Vercel** (web). After this is done, every push to `master` auto-deploys.

Repo: https://github.com/farajaay/rihla (public)

---

## 0. Prerequisites

- Anthropic API key (https://console.anthropic.com)
- GitHub repo admin access
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)

Both Railway and Vercel have free starter tiers that work fine for early traffic.

---

## 1. Railway — API + Postgres + Redis

### 1.1 Create the project

1. Go to https://railway.app/new → **Deploy from GitHub repo** → select `farajaay/rihla`
2. **CRITICAL — set Root Directory before anything else.** Open the service → **Settings → Source → Root Directory** → set to `apps/api`.

   > Without this, Railway's auto-detect (Railpack) scans the monorepo root, finds no `start` script, and fails with `No start command detected`. The repo includes a top-level `railway.json` as a backstop, but setting Root Directory is the canonical fix.

3. Rename the service to `rihla-api` (this matches the CI deploy command).

### 1.2 Add Postgres + Redis

In the same project:
- **+ New** → **Database** → **PostgreSQL** → wait for provisioning
- **+ New** → **Database** → **Redis** → wait for provisioning

### 1.3 Wire env vars on `rihla-api`

Open the `rihla-api` service → **Variables** tab. Add:

```
# Reference the managed plugins by Railway template variable
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Required
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
JWT_SECRET=<openssl rand -base64 32>
JWT_REFRESH_SECRET=<openssl rand -base64 32>

# Optional but recommended
ADMIN_TOKEN=<openssl rand -hex 32>
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://app.posthog.com
SENTRY_DSN=https://...@sentry.io/...

# Rate limiting (defaults are fine)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30
```

### 1.4 Generate a public domain

`rihla-api` service → **Settings** → **Networking** → **Generate Domain** → copy the `*.up.railway.app` URL.

### 1.5 Get the Railway token for CI

- Account → **Tokens** → **Create new token** (or use a **Project Token** scoped to this project, which is safer)
- Copy the token.

### 1.6 Add `RAILWAY_TOKEN` to GitHub

`gh secret set RAILWAY_TOKEN --body "$RAILWAY_TOKEN"` — or via repo Settings → Secrets and variables → Actions → New repository secret.

The next push to `master` will auto-deploy.

---

## 2. Vercel — Web

### 2.1 Create the project

1. https://vercel.com/new → **Import Git Repository** → select `farajaay/rihla`
2. **Root Directory**: `apps/web`
3. **Framework Preset**: Vite (auto-detected)
4. **Build Command**: `npm run build` (default)
5. **Output Directory**: `dist` (default)

### 2.2 Wire env vars

Project → **Settings** → **Environment Variables** (set for *Production*, *Preview*, *Development*):

```
VITE_API_URL=https://your-railway-domain.up.railway.app/api
VITE_POSTHOG_KEY=phc_...        # optional
VITE_POSTHOG_HOST=https://app.posthog.com
VITE_SENTRY_DSN=https://...     # optional
```

After saving, redeploy the project once so the vars take effect.

### 2.3 Get the IDs and token for CI

You need three secrets:

- `VERCEL_TOKEN` — Account → **Settings** → **Tokens** → Create
- `VERCEL_ORG_ID` — find in **Settings** → **General** (or run `vercel link` locally and read `.vercel/project.json`)
- `VERCEL_PROJECT_ID` — same place; comes from `.vercel/project.json` after `vercel link`

Quickest way: from your machine, in `apps/web/`:

```bash
npx vercel link        # follow prompts, picks the project you just created
cat .vercel/project.json   # contains orgId and projectId
```

### 2.4 Add the three secrets to GitHub

```bash
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --body "$ORG_ID"
gh secret set VERCEL_PROJECT_ID --body "$PROJECT_ID"
```

### 2.5 Custom domain (optional)

Project → **Settings** → **Domains** → add your domain → follow DNS prompts. Then update `FRONTEND_URL` on Railway and `VITE_API_URL` if you also added a custom domain there.

---

## 3. Cross-wire CORS + smoke test

After both are live:

1. Update `FRONTEND_URL` on Railway to the canonical Vercel URL (or custom domain). The API already accepts any `*.vercel.app` via regex, but explicit is better.
2. Redeploy `rihla-api`.
3. Run the smoke tests in [RUNBOOK.md](RUNBOOK.md).

---

## 4. Trigger a fresh deploy from CI

```bash
git commit --allow-empty -m "ci: trigger deploys"
git push
```

Watch both workflows in **Actions** — they should now exit green with real deploys (not the "token not configured" skip).

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| Railway build fails on `npm ci` | Make sure `apps/api/package-lock.json` is committed and matches `package.json` |
| Railway crash on boot: `prisma migrate deploy` fails | Check `DATABASE_URL`; verify Postgres plugin is in the same project |
| `/health` returns 502 | Wait ~30s after first deploy; check Railway logs for startup errors |
| CORS error on web | `FRONTEND_URL` on Railway must match the Vercel domain exactly |
| Vercel 404 on `/chat` direct nav | `apps/web/vercel.json` rewrites must be present (they are) |
| `vercel deploy --prebuilt` complains about project not linked | `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` env vars missing from CI |

---

## 6. Cost estimate (starter)

| Service | Plan | Monthly |
|---|---|---|
| Railway (api + Postgres + Redis) | Hobby | ~$5–10 |
| Vercel (web) | Hobby | $0 |
| Anthropic API | pay-as-you-go | depends on traffic |
| PostHog | free tier | $0 (up to 1M events) |
| Sentry | free tier | $0 |

Total at launch: **~$5–10/month** + Anthropic usage.
