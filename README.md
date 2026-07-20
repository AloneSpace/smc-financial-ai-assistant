# Financial AI Chat Assistant

A full-stack AI-powered chat application that lets authenticated users ask natural-language questions about the financial performance of US public companies. Every answer is grounded exclusively in a PostgreSQL database via OpenAI Tool Calling — no hallucination permitted.

---

## 🚀 Live Demo

The application is deployed and available for review:

| Resource     | URL                                                                                    |
| ------------ | -------------------------------------------------------------------------------------- |
| **App**      | [https://finchat.plaintechlab.com](https://finchat.plaintechlab.com)                   |
| **API Docs** | [https://finchat.plaintechlab.com/api/docs](https://finchat.plaintechlab.com/api/docs) |

**Demo account** (no registration needed):

| Email              | Password        |
| ------------------ | --------------- |
| `demo@finchat.com` | `thisisfordemo` |

---

## Features

- **SQL-Grounded AI** — Every financial figure comes from the database. The AI executes `SELECT` queries and cannot fabricate numbers.
- **Visible Tool Execution** — SQL queries are rendered in the chat UI as they execute, in real time.
- **Token-by-Token Streaming** — Responses stream from the backend using Server-Sent Events (SSE).
- **Stop Generation** — Users can halt a response mid-stream. Partial content is preserved.
- **Rich Rendering** — Markdown, formatted tables, and bar/line charts for trend and comparison queries.
- **Conversation History** — Full per-user conversation history with create, browse, and delete support.
- **Usage Limits** — Per-user hourly spending cap tracked in Redis with automatic TTL-based reset.
- **Authentication** — Email/password registration and login with JWT session management.

---

## Tech Stack

| Layer              | Technology                                                 |
| ------------------ | ---------------------------------------------------------- |
| **Frontend**       | React 18, TypeScript 5, Vite, shadcn/ui, TailwindCSS       |
| **State**          | TanStack Query v5, React Hook Form, Zod                    |
| **Charts**         | Recharts                                                   |
| **Backend**        | NestJS 10, TypeScript 5                                    |
| **ORM**            | TypeORM                                                    |
| **Database**       | PostgreSQL 16                                              |
| **Cache**          | Redis 7                                                    |
| **AI**             | OpenAI API — GPT-4o, Tool Calling, Streaming               |
| **Auth**           | JWT (HS256), Argon2id (`@node-rs/argon2`)                  |
| **Infrastructure** | Docker Compose (local dev) · k3s / Kubernetes (deployment) |

---

## Dataset

The application answers questions about **49 US public companies** across **5 sectors** for fiscal years **2022–2025**.

| Sector     | Companies                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology | Apple, Microsoft, Google, Nvidia, Meta, Amazon, Tesla, Intel, AMD, Adobe, Oracle, Salesforce, Netflix, Uber, Shopify                                        |
| Finance    | JPMorgan, Visa, Mastercard, Goldman, Morgan Stanley, BankOfAmerica, WellsFargo, Citigroup, AmericanExpress, PayPal, BlackRock, Schwab, CapitalOne, PNC, USB |
| Healthcare | UnitedHealth, Eli Lilly, JohnsonJohnson, AbbVie, Pfizer, Merck, Bristol-Myers, Amgen                                                                        |
| Consumer   | Walmart, Amazon, Costco, HomeDepot, PepsiCo, Coca-Cola, McDonald's, Nike, Target, Starbucks                                                                 |
| Energy     | ExxonMobil, Chevron                                                                                                                                         |

Metrics available: **revenue**, **net_income**, **operating_income**, **gross_profit** (some NULL by design — see `docs/05_DATABASE.md`).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (React SPA)                    │
│   Auth  │  Chat + Streaming  │  Conversation Sidebar    │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
          ┌────────────────▼─────────────────────────────────────────┐
          │              k3s Cluster  —  namespace: finchat           │
          │                                                           │
          │  [ Traefik IngressRoute ]                                 │
          │     /     → frontend-svc (Nginx pod)                      │
          │     /api  → backend-svc  (NestJS pod)                     │
          │                    │                                      │
          │    ┌───────────────▼─────────────────────────┐           │
          │    │           NestJS Backend Pod             │           │
          │    │  JwtAuthGuard → UsageGuard → ChatService │           │
          │    │       ↓                        ↓         │           │
          │    │  OpenAIService          SqlToolService   │           │
          │    └──────┬─────────────────────┬─────────────┘           │
          │     HTTPS │              :5432   │   :6379                │
          │           │      ┌───────▼───────▼──────────┐            │
          │        OpenAI    │   Postgres (StatefulSet)  │  Redis     │
          │         API      │   + PVC                   │  Deployment│
          │                  └───────────────────────────┘  + PVC    │
          └──────────────────────────────────────────────────────────┘
```

**Local development** uses `docker compose up` for convenience.  
**Deployment** targets a k3s cluster via the manifests in [`deploy/`](deploy/).

### AI Flow

```
User question
  → NestJS receives POST /chat
  → JwtAuthGuard validates token
  → UsageGuard checks Redis spend < budget
  → ChatService builds [system_prompt, ...history, user_message]
  → OpenAI (stream=true, tools=[execute_sql])
  → OpenAI calls execute_sql(query)  ← SSE: tool_start, tool_query
  → SqlToolService validates + executes SQL on PostgreSQL
  → Result returned to OpenAI         ← SSE: tool_end (row count)
  → OpenAI generates final answer
  → Answer streamed token by token    ← SSE: token × N
  → done event sent                   ← SSE: done (usage)
  → Messages saved to DB, Redis usage updated
```

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/) (local dev)
- [k3s](https://k3s.io/) or any Kubernetes cluster (deployment)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) configured against your cluster
- [Node.js](https://nodejs.org/) 20+ (for local development without Docker)
- An [OpenAI API key](https://platform.openai.com/api-keys)

---

## Quick Start (Docker)

### 1. Clone the repository

```bash
git clone git@github.com:AloneSpace/smc-financial-ai-assistant.git
cd smc-financial-ai-assistant
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
OPENAI_API_KEY=sk-...          # Required — your OpenAI API key
JWT_SECRET=<random-32-chars>   # Required — generate with: openssl rand -hex 32
```

All other values have working defaults for local development.

To use Claude instead, set `AI_PROVIDER=anthropic` and fill in
`ANTHROPIC_API_KEY`; the unused vendor's key may be left blank.

### 3. Start all services

```bash
docker compose up --build -d
```

This starts:

- PostgreSQL on port `5432`
- Redis on port `6379`
- NestJS backend on port `3000`
- React frontend on port `5173`

### 4. Import the financial data

In a separate terminal, after the services are healthy:

```bash
./scripts/import-financial-data.sh
```

This imports `data/financial_data.sql`, applies the `financial_data` indexes
(`docs/05_DATABASE.md` §8.1), and prints the row count. Both SQL files are
idempotent, so re-running is safe.

The application tables (`users`, `conversations`, `messages`) need no step here —
the backend runs its TypeORM migrations at boot.

### 5. Seed the demo account (optional)

```bash
./scripts/seed-demo-user.sh
```

Registers `demo@finchat.com` / `thisisfordemo` so you can log in without going
through the register form. The script is idempotent — re-running it reports the
account already exists. Override with `API_URL`, `DEMO_EMAIL`, `DEMO_PASSWORD`.

### 6. Open the application

Navigate to **[http://localhost:5173](http://localhost:5173)**, log in with the demo
account above (or register your own), and start chatting.

---

## Environment Variables

All variables are documented in `.env.example`. Never commit `.env`.

| Variable                       | Required | Default                 | Description                                                        |
| ------------------------------ | -------- | ----------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                 | ✅       | —                       | PostgreSQL connection string                                       |
| `REDIS_URL`                    | ✅       | —                       | Redis connection string                                            |
| `JWT_SECRET`                   | ✅       | —                       | JWT signing secret, min 32 characters                              |
| `JWT_EXPIRY`                   | ❌       | `24h`                   | JWT token expiry duration                                          |
| `AI_PROVIDER`                  | ❌       | `openai`                | Active vendor: `openai` or `anthropic`                             |
| `OPENAI_API_KEY`               | ⚠️       | —                       | Required when `AI_PROVIDER=openai`                                 |
| `OPENAI_MODEL`                 | ❌       | `gpt-4o`                | OpenAI model to use                                                |
| `ANTHROPIC_API_KEY`            | ⚠️       | —                       | Required when `AI_PROVIDER=anthropic`                              |
| `ANTHROPIC_MODEL`              | ❌       | `claude-opus-4-8`       | Anthropic model to use                                             |
| `AI_MAX_HISTORY_MESSAGES`      | ❌       | `20`                    | Max conversation messages sent to the model                        |
| `CHAT_STOP_GRACE_PERIOD_MS`    | ❌       | `2000`                  | Pause before calling the model so the user can Stop (`0` disables) |
| `USAGE_BUDGET_USD`             | ❌       | `1.0`                   | Per-user hourly spending limit in USD                              |
| `USAGE_RESET_INTERVAL_SECONDS` | ❌       | `3600`                  | How often the usage budget resets                                  |
| `FRONTEND_URL`                 | ❌       | `http://localhost:5173` | Frontend origin for CORS                                           |

---

## Deploy to k3s

Full manifest reference: [`deploy/README.md`](deploy/README.md)

### Prerequisites

- k3s installed and `kubectl` configured (`k3s` single-node or any compatible cluster)
- Docker images built and accessible (push to a registry or import directly).
  The frontend image must be built with `VITE_API_URL=""` so the SPA calls the
  API same-origin via `/api` (CI images already do; see `frontend/Dockerfile`).
- **cert-manager** installed for TLS:
  `kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml`
- A DNS `A` record for `finchat.plaintechlab.com` pointing at the k3s node's
  public IP (single host — frontend at `/`, backend at `/api`, no API subdomain)

### 1. Apply manifests

```bash
# Create namespace first
kubectl apply -f deploy/namespace.yaml

# Create the real Secret (never commit this file)
kubectl create secret generic finchat-secret \
  --namespace finchat \
  --from-literal=DATABASE_URL="postgresql://postgres:<password>@postgres:5432/finchat" \
  --from-literal=REDIS_URL="redis://redis:6379" \
  --from-literal=JWT_SECRET="<min-32-char-secret>" \
  --from-literal=ANTHROPIC_API_KEY="sk-ant-..."

# Set a real contact email in deploy/cert-issuer.yaml (spec.acme.email) first,
# then apply everything (ingress, cert-manager issuer + Certificate included).
kubectl apply -k deploy/
```

The Traefik ingress terminates TLS with a Let's Encrypt certificate issued by
cert-manager and redirects plain HTTP to HTTPS. Watch it come up with
`kubectl get certificate -n finchat` (READY flips to `True`).

### 2. Import financial data

```bash
./scripts/import-financial-data-k8s.sh
```

Waits for the postgres pod, imports the dump, and applies the indexes. See
`deploy/README.md` step 4 for the equivalent manual `kubectl` commands.

### 3. Verify

```bash
kubectl get pods -n finchat                        # All pods should be Running
kubectl get pvc  -n finchat                        # PVCs should be Bound
kubectl get certificate -n finchat                 # finchat-tls READY=True
curl https://finchat.plaintechlab.com/api/health   # → { "status": "ok" }
```

> **SSE streaming note:** Traefik supports server-sent events natively with no extra configuration. The backend must include the `X-Accel-Buffering: no` header on the `/chat` response.

---

## Local Development (without Docker)

### Backend

```bash
cd backend
npm install
npm run start:dev        # http://localhost:3000
```

Requires a running PostgreSQL and Redis instance. Update `DATABASE_URL` and `REDIS_URL` in `.env` accordingly.

### Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

### Run Tests

```bash
# Backend unit tests (75 tests)
cd backend && npm install && npm test

# Backend test coverage
cd backend && npm run test:cov

# Frontend typecheck + lint
cd frontend && npm install && npx tsc --noEmit && npm run lint
```

> The frontend currently has no Vitest unit tests, so `cd frontend && npm test`
> exits 1 with "No test files found". Frontend behaviour is covered by the
> Playwright E2E scenarios below.

### E2E tests (baseline scenarios)

The E2E suite drives the **real** streaming UI, so the full stack must already
be running (`docker compose up`), the financial data imported, and a valid AI
key configured. Playwright is not part of any `package.json`, so install it in
the repo root first:

```bash
# One-time setup, from the repo root
npm install -D @playwright/test
npx playwright install chromium

# Run S1, S2, S3, S5, S6 (S4 is skipped by default — see below)
npx playwright test

# Run a single scenario
npx playwright test --grep "S1"
```

**S4 (usage limit)** needs a budget low enough for the second request to trip
the guard, so it is skipped unless explicitly enabled. Set
`USAGE_BUDGET_USD=0.0000001` in `.env`, restart the backend, then run it on its
own — the near-zero budget would break the other scenarios:

```bash
docker compose up -d backend --force-recreate
RUN_S4=1 npx playwright test --grep "S4"
```

Afterwards restore `USAGE_BUDGET_USD=1.0`, recreate the backend, and clear the
recorded spend with `docker exec finchat-redis redis-cli FLUSHALL`.

---

## Folder Structure

```
smc-fullstack-eng-takehome/
├── CLAUDE.md                  # AI agent — global rules
├── README.md                  # This file
├── compose.yml                # Docker Compose
├── .env.example               # Environment variable template
│
├── backend/                   # NestJS API
│   ├── CLAUDE.md              # AI agent — backend rules
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/            # Database, Redis, OpenAI config factories
│       └── modules/
│           ├── auth/          # Register, login, JWT, guards
│           ├── chat/          # AI orchestration, SSE streaming, SQL tool
│           ├── conversations/ # Conversation CRUD
│           ├── usage/         # Redis spend tracking, UsageGuard
│           └── database/      # TypeORM entities + migrations
│
├── frontend/                  # React SPA
│   ├── CLAUDE.md              # AI agent — frontend rules
│   └── src/
│       ├── app/               # Router, providers
│       ├── features/
│       │   ├── auth/          # Login, register, AuthContext, AuthGuard
│       │   ├── chat/          # Chat page, streaming, SQL block, charts
│       │   └── conversations/ # Sidebar, delete dialog
│       └── shared/            # Axios instance, QueryClient, shared components
│
├── data/
│   └── financial_data.sql     # Financial dataset (192 rows)
│
└── docs/
    ├── REQUIREMENT.md         # Source of truth
    ├── 02_PRD.md
    ├── 03_ARCHITECTURE.md
    ├── 04_SYSTEM_DESIGN.md
    ├── 05_DATABASE.md
    ├── 06_API_SPEC.md
    ├── 07_UI_FLOW.md
    ├── 08_IMPLEMENTATION_PLAN.md
    ├── 09_TASKS.md
    ├── 10_AI_RULES.md
    └── 11_TEST_PLAN.md
```

---

## API Reference

All routes are served under the global `/api` prefix — e.g. locally
`http://localhost:3000/api/auth/register`. `/health` is the one exception and
is served unprefixed.

| Method   | Path                     | Auth | Description                            |
| -------- | ------------------------ | ---- | -------------------------------------- |
| `POST`   | `/api/auth/register`     | ❌   | Register new user, returns JWT         |
| `POST`   | `/api/auth/login`        | ❌   | Login, returns JWT                     |
| `GET`    | `/api/auth/me`           | ✅   | Current user profile                   |
| `POST`   | `/api/conversations`     | ✅   | Create conversation                    |
| `GET`    | `/api/conversations`     | ✅   | Paginated conversation list            |
| `GET`    | `/api/conversations/:id` | ✅   | Conversation with full message history |
| `DELETE` | `/api/conversations/:id` | ✅   | Delete conversation + messages         |
| `POST`   | `/api/chat`              | ✅   | Send message, stream SSE response      |
| `POST`   | `/api/chat/stop`         | ✅   | Abort active stream, save partial      |

Full specification: [`docs/06_API_SPEC.md`](docs/06_API_SPEC.md)

---

## Baseline Scenarios

The application must pass all six scenarios defined in `docs/01_REQUIREMENT.md`:

| ID     | Scenario                                                    | How to test                                   |
| ------ | ----------------------------------------------------------- | --------------------------------------------- |
| **S1** | Valid financial question → streamed answer with SQL visible | Ask: _"What was Apple's net income in 2023?"_ |
| **S2** | Out-of-coverage data → "not available", no fabrication      | Ask: _"What was Apple's revenue in 2021?"_    |
| **S3** | Stop generation → stream halts, partial content saved       | Click Stop during any streaming response      |
| **S4** | Usage limit exceeded → friendly message, input disabled     | Exhaust hourly budget via multiple requests   |
| **S5** | Browser refresh → conversation restored, no duplicates      | Send messages, then hard-refresh the page     |
| **S6** | Delete conversation → confirmation dialog, permanently gone | Click delete icon on any conversation         |

---

## Documentation

All planning and architecture documents are in [`docs/`](docs/):

| Document                                                      | Description                                   |
| ------------------------------------------------------------- | --------------------------------------------- |
| [`REQUIREMENT.md`](docs/01_REQUIREMENT.md)                    | Source of truth — read before any task        |
| [`02_PRD.md`](docs/02_PRD.md)                                 | Product requirements and success metrics      |
| [`03_ARCHITECTURE.md`](docs/03_ARCHITECTURE.md)               | Technology decisions and rationale            |
| [`04_SYSTEM_DESIGN.md`](docs/04_SYSTEM_DESIGN.md)             | Mermaid diagrams — all system flows           |
| [`05_DATABASE.md`](docs/05_DATABASE.md)                       | Schema, NULL analysis, example queries        |
| [`06_API_SPEC.md`](docs/06_API_SPEC.md)                       | REST API contract                             |
| [`07_UI_FLOW.md`](docs/07_UI_FLOW.md)                         | Screen layouts, component inventory           |
| [`08_IMPLEMENTATION_PLAN.md`](docs/08_IMPLEMENTATION_PLAN.md) | Phase-by-phase build plan                     |
| [`09_TASKS.md`](docs/09_TASKS.md)                             | Full task checklist                           |
| [`10_AI_RULES.md`](docs/10_AI_RULES.md)                       | Engineering rules for AI coding agents        |
| [`11_TEST_PLAN.md`](docs/11_TEST_PLAN.md)                     | Unit, integration, E2E, and manual test plans |

---

## Health Check

```bash
curl http://localhost:3000/health
# → { "status": "ok", "timestamp": "2026-07-15T..." }
```

---

## Future Improvements

The following are intentionally out of scope for this assignment but represent natural next steps:

| Improvement               | Notes                                                                     |
| ------------------------- | ------------------------------------------------------------------------- |
| **Expand dataset**        | Add balance sheet, cash flow, and per-quarter data                        |
| **Real-time data**        | Integrate a market data API for live prices                               |
| **Semantic caching**      | Cache semantically similar queries in Redis to reduce OpenAI costs        |
| **Conversation search**   | Full-text search across message history                                   |
| **Export**                | Download conversation as PDF or CSV                                       |
| **User settings**         | Custom usage budget, preferred chart type                                 |
| **Mobile layout**         | Responsive design for smaller viewports                                   |
| **Multi-turn tool calls** | Support queries that require more than one SQL call                       |
| **Rate limiting**         | Per-IP and per-user request rate limiting via Redis                       |
| **Horizontal scaling**    | Move active stream map from in-memory to Redis for multi-instance support |

---

## License

This project is submitted as a take-home engineering assignment. Not for production use.
