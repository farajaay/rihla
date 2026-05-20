# Architecture

## High level

```
┌──────────────┐   HTTPS    ┌──────────────┐   Prisma   ┌────────────┐
│  React SPA   │ ─────────▶ │  Express API │ ─────────▶ │ PostgreSQL │
│  (Vercel)    │ ◀───SSE──── │  (Railway)   │            └────────────┘
└──────┬───────┘            └──────┬───────┘
       │                           │
       │ PostHog JS                │ ioredis      ┌────────────┐
       │                           └─────────────▶│   Redis    │
       │                           │              └────────────┘
       │                           │
       │                           │ Anthropic SDK
       │                           └─────────────▶ Claude (Sonnet 4.6)
       │
       └─ PostHog Cloud
```

## Request flows

### Chat (streaming)

1. Web `POST /api/sessions` → returns `sessionId` (also stores consent flag)
2. Web `POST /api/chat/stream` with `{ sessionId, message }` → SSE stream
3. API loads recent `Conversation` rows for the session, streams Claude completion back to client
4. After completion, API runs `profiler` over the turn, upserts `TravelerProfile`, advances `stage` (`intake → profiling → proposal → booking`)
5. API caches profile snapshot to Redis (TTL ~ session lifetime)

### Itinerary generation

1. Frontend watches `stage === 'proposal' && !isStreaming` → fires `POST /api/itineraries/generate`
2. API dedups (returns existing `Itinerary` if one already exists for the session)
3. API loads `Session` + `TravelerProfile`, maps to snake_case `TravelerProfile` interface
4. API calls `generateItinerary(profile)` — one-shot Claude call, `max_tokens: 8192`, structured JSON prompt
5. API persists the `Itinerary` row and returns `{ id, itinerary }`
6. Frontend navigates to `/itinerary/:id`

## Key files

- [apps/api/src/index.ts](../apps/api/src/index.ts) — Express bootstrap, middleware, route mounting
- [apps/api/src/services/claude.ts](../apps/api/src/services/claude.ts) — Anthropic SDK wrapper; chat stream + `generateItinerary`
- [apps/api/src/services/profiler.ts](../apps/api/src/services/profiler.ts) — signal extraction
- [apps/api/src/routes/itineraries.ts](../apps/api/src/routes/itineraries.ts) — itinerary generate/get
- [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma) — data model
- [apps/web/src/hooks/useChat.ts](../apps/web/src/hooks/useChat.ts) — SSE consumer
- [apps/web/src/pages/Itinerary.tsx](../apps/web/src/pages/Itinerary.tsx) — animated reveal

## Decisions worth knowing

- **Anonymous sessions**: no accounts. Session is the unit of identity. PDPL-friendly.
- **camelCase ↔ snake_case bridge**: Prisma forces camelCase; the LLM prompt was designed with snake_case keys to match common training corpora. We translate at the route boundary, not at the ORM layer.
- **Profile in Redis**: hot reads only. Postgres is the source of truth.
- **One Claude call per itinerary**: simpler than orchestrating per-day calls, and the model handles 7-day plans reliably at 8192 tokens.
- **Print-to-PDF over server-side render**: zero infra, native browser PDF, looks good with `print:` Tailwind variants.
