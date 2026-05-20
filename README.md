# Rihla — AI-Powered Travel Agent Platform

Rihla is a conversational travel planning platform that uses behavioral profiling to deliver hyper-personalized itinerary proposals.

## Monorepo Structure

```
rihla/
├── apps/
│   ├── web/          # React 18 + Vite frontend
│   └── api/          # Node.js 20 + Express backend
├── .github/workflows/ # CI/CD pipelines
└── docker-compose.yml # Local dev (PostgreSQL + Redis)
```

## Quick Start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Anthropic API key

### 1. Start infrastructure

```bash
docker-compose up -d
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
# Fill in your ANTHROPIC_API_KEY and other values
```

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start development servers

```bash
npm run dev
```

Frontend runs on http://localhost:5173  
API runs on http://localhost:3000

## Environment Variables

See `apps/api/.env.example` for all required backend variables.

## Deployment

- **Frontend**: Netlify (auto-deploy on `main` push)
- **Backend**: Railway (Dockerfile-based auto-deploy)
- **Database**: Railway PostgreSQL or Supabase

## Architecture

See the full architecture specification in the project documentation.
