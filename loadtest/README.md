# Load Tests (k6)

Smoke + soak tests for the two hot endpoints.

## Install

```bash
# macOS
brew install k6
# Windows (Chocolatey)
choco install k6
# Linux: https://k6.io/docs/get-started/installation/
```

## Run

Set `BASE_URL` (defaults to `http://localhost:3000`):

```bash
BASE_URL=https://api.rihla.example k6 run loadtest/session-create.js
BASE_URL=https://api.rihla.example k6 run loadtest/chat-stream.js
BASE_URL=https://api.rihla.example k6 run loadtest/itinerary-generate.js
```

## What each test covers

- **session-create.js** — baseline: cold-path session creation, p95 < 300ms
- **chat-stream.js** — SSE chat turn; measures time-to-first-byte and full-response time
- **itinerary-generate.js** — slow endpoint (Claude call); concurrent generations to verify queueing & rate limits

## Targets

| Endpoint | p50 | p95 | Error rate |
|---|---|---|---|
| `POST /api/sessions` | < 100ms | < 300ms | < 0.1% |
| `POST /api/chat/stream` (TTFB) | < 600ms | < 1500ms | < 1% |
| `POST /api/itineraries/generate` | < 8s | < 15s | < 2% |

Adjust VUs to your environment. Do NOT run against production without warning the team.
