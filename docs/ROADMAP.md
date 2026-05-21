# Rihla Roadmap

Five phases. Phases 1–3 are complete; Phase 4 is in progress.

Status legend: ✅ done · 🟡 in progress · ⏳ planned

---

## Phase 1 — Foundation ✅

Monorepo, infra, deploy plumbing.

- ✅ Monorepo (npm workspaces): `apps/web`, `apps/api`
- ✅ Vite + React 18 + Tailwind frontend scaffold
- ✅ Express + TS + Prisma backend scaffold
- ✅ Postgres + Redis via `docker-compose.yml`
- ✅ Prisma schema: `Session`, `TravelerProfile`, `Conversation`, `Itinerary`, `AdSegmentsExport`
- ✅ GitHub Actions: lint + typecheck + test, Railway (api), Vercel (web)
- ✅ Helmet, CORS, rate limits, consent middleware
- ✅ Landing page (consent + session creation)

## Phase 2 — Conversation Engine ✅

Streaming chat with behavioral profiling.

- ✅ `POST /api/sessions` — create anonymous session
- ✅ `PATCH /api/sessions/:id/consent` — capture consent
- ✅ `GET /api/sessions/:id/profile` — Redis-cached profile read
- ✅ `POST /api/chat/stream` — SSE stream from Claude
- ✅ Profiler service — extracts archetype/budget/group/destinations/etc. from each turn
- ✅ Stage machine: `greeting → discovery → deepening → proposal`
- ✅ Chat UI with streaming bubbles, typing indicator, stage chip
- ✅ Zustand stores (`sessionStore`, `chatStore`)

## Phase 3 — Proposal Engine ✅

Itinerary generation + animated reveal.

- ✅ `POST /api/itineraries/generate` — one-shot Claude call, structured JSON
- ✅ `mapPrismaProfile()` — bridges Prisma camelCase ↔ snake_case interface
- ✅ `inferDuration()` — parses `date_signals` for trip length
- ✅ Itinerary persistence (dedup by `sessionId`)
- ✅ `useItinerary(id)` hook
- ✅ `/itinerary/:id` page — hero, stats, highlights, day cards, practical info, personalization note
- ✅ Print-to-PDF via `window.print()` + Tailwind `print:` + `@media print`
- ✅ Proposal trigger from Chat (useRef guard + `!isStreaming` + stage watch)
- ✅ Fullscreen "Building your itinerary" overlay during generation

## Phase 4 — Data Layer ✅

Analytics, segment exports, admin tooling, PDPL compliance.

- ✅ Admin auth middleware (`ADMIN_TOKEN` bearer or `X-Admin-Token`)
- ✅ `POST /api/admin/segments/export` — snapshot a session's profile to `AdSegmentsExport`
- ✅ `GET /api/admin/segments` — aggregate query for ad platforms (filter by tier, dest, date range)
- ✅ `GET /api/admin/metrics` — totals, profile distributions, top destinations, conversion funnel
- ✅ PostHog server-side (`posthog-node`) — events: `session_created`, `consent_updated`, `itinerary_generated`, `session_deleted` (no-op if `POSTHOG_API_KEY` unset)
- ✅ PostHog client-side (`posthog-js`) — initialized via `lib/analytics.ts`; no-op if `VITE_POSTHOG_KEY` unset
- ✅ Admin dashboard (`/admin`) — token gate, metrics tiles, distribution bars, segment export
- ✅ `GET /api/sessions/:id/export` — PDPL data-export endpoint (full session JSON download)
- ✅ `DELETE /api/sessions/:id` — full cascade via Prisma `onDelete: Cascade`
- ✅ Privacy page (`/privacy`) — PDPL rights, self-service export + delete buttons

## Phase 5 — Polish & Launch 🟡

Production hardening + go-to-market.

- ✅ Mobile-first viewport: `viewport-fit=cover`, safe-area padding, 16px input font, 100vh fallback
- ✅ Performance: route-level code splitting (`React.lazy` + `Suspense`)
- ✅ i18n scaffold (`lib/i18n.ts`) with EN/AR strings, RTL `dir` toggle, `LocaleSwitcher` component
- ✅ Error boundary at app root; soft Sentry integration (web + api)
- ✅ Load test scripts in `loadtest/` (k6) for session-create, chat-stream, itinerary-generate
- ✅ Production runbook ([docs/RUNBOOK.md](RUNBOOK.md)) with secrets, smoke tests, rollback, launch checklist
- ⏳ Apply `useT()` strings throughout pages (currently only the scaffold ships)
- ⏳ Image lazy-loading + Lighthouse audit ≥ 90
- ✅ Production env wiring: Vercel (rihla-drab.vercel.app) + Railway (rihla-production-bb99.up.railway.app) live, secrets configured, smoke-tested
- ⏳ Marketing site, pricing page, legal review, PDPL sign-off
- ⏳ Custom domain + TLS (optional — Vercel + Railway both work fine on their default subdomains)

---

## Phase 6 — Refinement & Iteration 🟡

The killer feature: users refine their itinerary via natural language instead of getting one shot.

- ✅ `Itinerary.parentId` + `revision` + `refinementRequest` schema (migration `20260522000000_itinerary_revisions`)
- ✅ `refineItinerary()` service in `claude.ts` — takes current JSON + profile + request, returns new ItineraryData
- ✅ `POST /api/itineraries/:id/refine` route — dedups to a new row with parent link
- ✅ `RefinementBar` floating component with suggestion chips
- ✅ Itinerary page wires refinement: chat-style input, fullscreen overlay during regeneration, navigates to the new ID
- ✅ Revision badge (`v2`, `v3`) + "previous version" link + "Refined from: …" provenance chip

---

## Out of scope (post-launch ideas)

- Booking integrations (Sabre, hotel APIs)
- Payment / deposit handling
- Saved trips, account creation, social share cards
- A/B testing framework on conversation prompts
- Multi-traveler collaborative planning
