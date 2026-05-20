# Production Runbook

How to deploy, smoke-test, and recover Rihla in production.

## Environments

| Env | Web | API | DB |
|---|---|---|---|
| Local | `npm run dev` (`:5173`) | `npm run dev` (`:3000`) | Docker Postgres + Redis |
| Production | Vercel | Railway | Railway Postgres + Upstash Redis |

## Required secrets

### GitHub Actions (Repo → Settings → Secrets)

| Name | Purpose |
|---|---|
| `RAILWAY_TOKEN` | Backend deploy. Without it the step exits 0 cleanly. |
| `VERCEL_TOKEN` | Frontend deploy. Without it the step exits 0 cleanly. |
| `VERCEL_ORG_ID` | Vercel org |
| `VERCEL_PROJECT_ID` | Vercel project |

### Railway (API)

```
DATABASE_URL
REDIS_URL
ANTHROPIC_API_KEY
FRONTEND_URL=https://rihla.example
NODE_ENV=production
JWT_SECRET
JWT_REFRESH_SECRET
ADMIN_TOKEN              # bearer for /api/admin/*
POSTHOG_API_KEY          # optional
POSTHOG_HOST             # optional
SENTRY_DSN               # optional
```

### Vercel (Web)

```
VITE_API_URL=https://api.rihla.example/api
VITE_POSTHOG_KEY         # optional
VITE_POSTHOG_HOST        # optional
VITE_SENTRY_DSN          # optional
```

## First-time deploy

1. **Provision** Railway project → add Postgres + Redis plugins
2. **Set Railway env vars** (above)
3. **Run migrations** — Railway one-off: `npm --workspace @rihla/api run db:migrate:prod`
4. **Push to `master`** — CI deploys both apps
5. **Smoke test** (see below)

## Routine deploy

Merging into `master` triggers both workflows. Watch the run; if a deploy step is red, re-run with secrets present (or the step exits 0 silently if a secret is missing).

## Smoke tests

After each deploy, run:

```bash
# 1. Health
curl https://api.rihla.example/health

# 2. Session create
curl -X POST https://api.rihla.example/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"consentGiven": true}'

# 3. Web landing returns 200
curl -I https://rihla.example

# 4. Admin (replace TOKEN)
curl https://api.rihla.example/api/admin/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

For a full path test, open the site, complete consent, send 3 chat messages, watch the itinerary generate.

Load tests live in `loadtest/` — see [loadtest/README.md](../loadtest/README.md). Do NOT run against prod without warning the team.

## Rollback

- **Vercel**: `Project → Deployments → … → Promote to production` on the previous green deploy
- **Railway**: `Service → Deployments → Rollback` to the previous build
- **Database**: see Prisma migration history. Down-migrations are not auto-generated; for a rollback, restore from Railway PG snapshot

## Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| 500 on chat stream | `ANTHROPIC_API_KEY` missing/expired | Check Railway env; rotate key |
| Slow itinerary (>30s) | Anthropic API degraded | Status page; retry; surface error to user |
| Empty admin metrics | DB connection issue | Check `DATABASE_URL`; Railway logs |
| Itinerary 404 right after generation | DB write failed; check logs | Inspect Sentry / Railway logs |
| Web 404 on deep link | Vercel rewrites missing | Verify `vercel.json` `rewrites: [{ source: '/(.*)' , destination: '/' }]` |

## Launch checklist

- [ ] All required secrets set in Railway + Vercel
- [ ] DB migrations run on prod
- [ ] Smoke tests pass
- [ ] Custom domain + TLS active on both web and api
- [ ] PostHog project created; events arriving
- [ ] Sentry project created; test exception captured
- [ ] Admin token rotated from any default
- [ ] Privacy page reviewed; legal sign-off
- [ ] PDPL contact email live
- [ ] Rate limits sized for expected traffic
- [ ] Load test run against staging; numbers meet targets
- [ ] Monitoring dashboard bookmarked (Railway metrics + PostHog + Sentry)
- [ ] On-call rotation defined
- [ ] Incident response template in `docs/`
