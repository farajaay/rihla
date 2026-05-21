# CLAUDE.md — Rihla Engineering Guide

This file orients AI coding agents (and humans) to the Rihla codebase. Read this first.

## What Rihla is

Conversational AI travel agent for Saudi/GCC travelers. The flow:

1. **Landing** — consent + session creation
2. **Chat** — Claude streams a discovery conversation; backend profiles the user from their messages (archetype, budget, group, destinations, etc.)
3. **Proposal** — once `stage` (one of `intake | profiling | proposal | booking`) reaches `'proposal'`, a one-shot Claude call generates a structured multi-day itinerary
4. **Itinerary** — animated reveal page, print-to-PDF, share

## Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind, Zustand, Framer Motion, React Router v6
- **Backend**: Node 20, Express, TypeScript, Prisma 5, PostgreSQL, Redis (ioredis), BullMQ (planned)
- **AI**: Anthropic SDK — `claude-sonnet-4-6` (chat + itinerary)
- **Analytics**: PostHog (web + api)
- **Deploy**: Vercel (web), Railway (api + Postgres + Redis)
- **CI**: GitHub Actions (`.github/workflows/frontend.yml`, `backend.yml`)

## Repo layout

```
rihla/
├── apps/
│   ├── web/            # Vite SPA
│   │   └── src/
│   │       ├── pages/        # Landing, Chat, Itinerary, Admin
│   │       ├── components/   # Chat/, Itinerary/, UI/
│   │       ├── hooks/        # useChat, useItinerary
│   │       ├── stores/       # Zustand: sessionStore, chatStore
│   │       └── App.tsx       # Router
│   └── api/
│       ├── prisma/schema.prisma
│       └── src/
│           ├── routes/       # sessions, chat, itineraries, admin
│           ├── services/     # claude, db, redis, profiler, analytics
│           ├── middleware/   # rateLimit, consent, adminAuth
│           └── index.ts
├── docs/
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── PRIVACY.md
│   └── RUNBOOK.md
├── loadtest/                 # k6 scripts
└── docker-compose.yml
```

## Data model (Prisma)

- `Session` — anonymous, `consentGiven`, hashed IP, device hints
- `TravelerProfile` — 1:1 with Session; archetype, budget tier, destinations, activities, emotional/date signals, engagement & completeness scores
- `Conversation` — chat history (user/assistant turns + signal extraction snapshot)
- `Itinerary` — generated proposal (`itineraryJson`, total SAR estimate)
- `AdSegmentsExport` — denormalized rows for marketing/ad-platform syncs

**Important convention**: Prisma fields are `camelCase`, the `TravelerProfile` TypeScript interface is `snake_case`. Use `mapPrismaProfile()` in [apps/api/src/routes/itineraries.ts](apps/api/src/routes/itineraries.ts) when crossing the boundary.

## Conventions

- TypeScript strict mode; no `// @ts-ignore`. `as any` only when crossing Prisma `Json` boundary.
- Zod-validate every request body at the route boundary.
- Routes are thin; logic lives in `services/`.
- Cache reads in Redis when hot; tolerate Redis being down (`[Redis] Unavailable…` is fine in dev).
- Animations: Framer Motion only — do NOT mix `style.animation` and `animate` props on the same element.
- Currency: store SAR as `Int`; format with `Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' })`.
- Dates in memory/docs: absolute (e.g. `2026-05-20`), never relative.

## Commands

```bash
# Root
npm run dev            # Runs both apps concurrently
npm run build          # Build both
npm run lint           # Lint both

# API
npm --workspace @rihla/api run db:migrate
npm --workspace @rihla/api run db:studio
npm --workspace @rihla/api run db:seed

# Local infra
docker-compose up -d   # Postgres + Redis
```

## Environment

- `apps/api/.env` — copy from `.env.example`. Required: `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY`, `FRONTEND_URL`. Optional: `ADMIN_TOKEN`, `POSTHOG_API_KEY`, `POSTHOG_HOST`.
- `apps/web/.env` — `VITE_API_URL`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`.

## CI/CD

Both deploy steps skip gracefully when their token secret is absent — they print a message and exit 0. Do NOT use `continue-on-error: true`; use a bash `if [ -z "$TOKEN" ]; then exit 0; fi` guard inside the step.

## Phase status

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full plan.

- **Phase 1 — Foundation** ✅
- **Phase 2 — Conversation Engine** ✅
- **Phase 3 — Proposal Engine** ✅
- **Phase 4 — Data Layer** ✅
- **Phase 5 — Polish & Launch** 🟡 (deployed; legal/marketing pending)
- **Phase 6 — Refinement & Iteration** 🟡 (itinerary refinement loop landed)

## When in doubt

- Read the route + the service it calls, not just the route.
- Check [docs/ROADMAP.md](docs/ROADMAP.md) for the *why* behind current work.
- Saudi/GCC context matters: SAR pricing, Arabic-friendly fonts, halal/family considerations in itineraries.
