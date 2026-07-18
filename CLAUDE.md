# CLAUDE.md — Global Project Instructions

> This file is read by Claude Code, GitHub Copilot Agent, Cursor, and any AI coding assistant working on this project.
> Rules in this file apply to **every file in every directory**.
> Each subdirectory has its own `CLAUDE.md` with scoped rules — read both.

---

## Project

**Financial AI Chat Assistant** — Full-stack web application where authenticated users ask natural-language questions about financial statements of US public companies. Every answer is grounded exclusively in PostgreSQL data via SQL Tool Calling. No hallucination permitted.

---

## ⚠️ AI Provider Decision — Anthropic Claude (not OpenAI)

> **The AI layer uses Anthropic Claude Opus 4.8 (`claude-opus-4-8`), not OpenAI.**
> This is a deliberate, user-approved deviation from the original take-home requirement (which specified OpenAI). Everywhere the docs still say "OpenAI"/"gpt-4o", read it as **Anthropic Claude** via the `@anthropic-ai/sdk` Messages API (tool use + streaming). Reference docs are updated to Anthropic incrementally as each phase touches them. Concrete mappings:
>
> | Old (OpenAI) | New (Anthropic) |
> | --- | --- |
> | `openai` SDK | `@anthropic-ai/sdk` |
> | `OPENAI_API_KEY` | `ANTHROPIC_API_KEY` |
> | `OPENAI_MODEL` (`gpt-4o`) | `ANTHROPIC_MODEL` (`claude-opus-4-8`) |
> | `OPENAI_MAX_HISTORY_MESSAGES` | `ANTHROPIC_MAX_HISTORY_MESSAGES` |
> | Chat Completions + function calling | Messages API + tool use |

---

## Source of Truth

| Document                         | Purpose                                                                   |
| -------------------------------- | ------------------------------------------------------------------------- |
| `docs/01_REQUIREMENT.md`         | **The only authoritative requirements document. Read before every task.** |
| `docs/02_PRD.md`                 | Product requirements, user stories, success metrics                       |
| `docs/03_ARCHITECTURE.md`        | Technology choices and reasoning                                          |
| `docs/04_SYSTEM_DESIGN.md`       | Mermaid diagrams for all system flows                                     |
| `docs/05_DATABASE.md`            | Schema, NULL analysis, example queries                                    |
| `docs/06_API_SPEC.md`            | REST API contract — do not deviate                                        |
| `docs/07_UI_FLOW.md`             | Screen layouts, component inventory, streaming states                     |
| `docs/08_IMPLEMENTATION_PLAN.md` | Phase-by-phase implementation order                                       |
| `docs/09_TASKS.md`               | Master task checklist                                                     |
| `docs/10_AI_RULES.md`            | Permanent engineering rules — read before writing any code                |
| `docs/11_TEST_PLAN.md`           | Unit, integration, E2E, and manual test plans                             |

---

## Tech Stack

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| Frontend       | React 18, TypeScript 5 (strict), Vite, shadcn/ui, TailwindCSS |
| State          | TanStack Query, React Hook Form, Zod                          |
| Charts         | Recharts                                                      |
| Backend        | NestJS 10, TypeScript 5 (strict)                              |
| ORM            | TypeORM                                                       |
| Database       | PostgreSQL 16                                                 |
| Cache          | Redis 7                                                       |
| AI             | Anthropic Claude API (`claude-opus-4-8`, Tool Use, Streaming) |
| Auth           | JWT (HS256), Argon2id (`@node-rs/argon2`)                     |
| Infrastructure | Docker Compose (local dev) · k3s / Kubernetes (deployment)    |

---

## Critical Rules — AI Behaviour

These rules are **non-negotiable**. Violating any of them is a critical error.

1. **Never hallucinate financial data.** Every financial figure must come from PostgreSQL via `execute_sql` tool. Never answer from model training knowledge.
2. **Never bypass the SQL tool.** The AI assistant must always call `execute_sql` before answering any financial question.
3. **Never fabricate numbers.** If SQL returns 0 rows or NULL, say so. Never substitute a value.
4. **Never implement features not described in `docs/01_REQUIREMENT.md`.** Do not add features. Do not extend scope.
5. **Never generate production code during the planning phase.** Wait for explicit approval.
6. **Never hardcode financial values** in application code. Values come from the database only.
7. **Never hardcode secrets.** API keys, JWT secrets, DB passwords, and Redis URLs go in `.env` only.
8. **Never write `any` in TypeScript.** Use `unknown` and narrow, or define the correct type.
9. **Never skip tests for new service methods.** Every new public service method needs a unit test.
10. **Never leave `console.log` in committed code.**

---

## Architecture Rules

### Backend (NestJS)

```
Controller  →  Service  →  Repository / Entity
    ↑               ↑
 HTTP only      Business logic
```

- **Controllers are thin.** Extract params → call one service method → return result. No `if` statements.
- **Services own all logic.** Validation, orchestration, error translation, response shaping.
- **Entities are data shapes only.** No methods, no business logic in entities.
- **Guards are cross-cutting.** `JwtAuthGuard` and `UsageGuard` apply to routes via decorators.
- **Never expose TypeORM entities directly.** Always map to a DTO before returning.

### Frontend (React)

- **Feature-based structure.** `src/features/auth/`, `src/features/chat/`, `src/features/conversations/`.
- **Logic in hooks, not components.** Components render. Hooks compute.
- **Server state via TanStack Query.** Never use `useState` to cache API responses.
- **Streaming buffer uses `useRef`.** Token accumulation does not trigger per-token re-renders.
- **Forms use React Hook Form + Zod.** No uncontrolled inputs.

### AI / SQL Layer

- `SqlToolService.validateSql()` is called before **every** SQL execution — no exceptions.
- Only `SELECT` statements are permitted. `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER` → reject.
- Only the `financial_data` table may be queried by the AI tool.
- The system prompt is a **constant** in `constants/system-prompt.constant.ts`. Never build it dynamically from user input.
- Conversation history sent to Claude is capped at the last **20 messages**.

---

## Folder Structure

```
smc-fullstack-eng-takehome/
├── CLAUDE.md                  ← This file (global rules)
├── README.md                  ← Setup guide
├── compose.yml                ← Docker Compose (local dev only)
├── .env.example               ← All required env vars
├── backend/
│   ├── CLAUDE.md              ← Backend-scoped rules
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/
│       └── modules/
│           ├── auth/
│           ├── chat/
│           ├── conversations/
│           ├── usage/
│           └── database/
├── frontend/
│   ├── CLAUDE.md              ← Frontend-scoped rules
│   └── src/
│       ├── app/
│       ├── features/
│       │   ├── auth/
│       │   ├── chat/
│       │   └── conversations/
│       └── shared/
├── deploy/                    ← k3s / Kubernetes manifests
│   ├── README.md              ← How to deploy
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.example.yaml    ← Template only, never real values
│   ├── ingress.yaml           ← Traefik IngressRoute
│   ├── postgres/
│   ├── redis/
│   ├── backend/
│   └── frontend/
└── docs/
    ├── REQUIREMENT.md         ← Source of truth
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

## Naming Conventions

| Item             | Convention                   | Example                                |
| ---------------- | ---------------------------- | -------------------------------------- |
| NestJS files     | `kebab-case.type.ts`         | `chat.service.ts`, `jwt-auth.guard.ts` |
| React components | `PascalCase.tsx`             | `SqlToolBlock.tsx`                     |
| React hooks      | `camelCase.ts`, `use` prefix | `useStream.ts`                         |
| TypeScript types | `PascalCase`                 | `MessageDto`, `StreamState`            |
| Constants        | `UPPER_SNAKE_CASE`           | `SYSTEM_PROMPT`, `EXECUTE_SQL_TOOL`    |
| DB tables        | `snake_case`, plural         | `users`, `financial_data`              |
| DB columns       | `snake_case`                 | `user_id`, `created_at`                |
| API paths        | `kebab-case`, plural         | `/conversations`, `/auth/register`     |
| JSON body fields | `camelCase`                  | `conversationId`, `accessToken`        |

---

## Environment Variables

All secrets and configuration live in `.env` (git-ignored). See `.env.example` for required keys.

```
DATABASE_URL
REDIS_URL
JWT_SECRET                 # min 32 characters
JWT_EXPIRY                 # default: 24h
ANTHROPIC_API_KEY
ANTHROPIC_MODEL               # default: claude-opus-4-8
ANTHROPIC_MAX_HISTORY_MESSAGES # default: 20
USAGE_BUDGET_USD           # default: 1.0
USAGE_RESET_INTERVAL_SECONDS # default: 3600
FRONTEND_URL               # for CORS
```

---

## Common Commands

```bash
# Start everything
docker compose up --build

# Backend dev
cd backend && npm run start:dev

# Frontend dev
cd frontend && npm run dev

# Backend tests
cd backend && npm test

# Backend test coverage
cd backend && npm run test:cov

# E2E tests (requires Docker running)
npx playwright test

# Database import (after docker compose up)
docker exec -i <postgres-container> psql -U postgres finchat < data/financial_data.sql
```

---

## API Endpoints

| Method | Path                 | Auth | Notes               |
| ------ | -------------------- | ---- | ------------------- |
| POST   | `/auth/register`     | ❌   | Returns JWT         |
| POST   | `/auth/login`        | ❌   | Returns JWT         |
| GET    | `/auth/me`           | ✅   | Current user        |
| POST   | `/conversations`     | ✅   | Create conversation |
| GET    | `/conversations`     | ✅   | Paginated list      |
| GET    | `/conversations/:id` | ✅   | With messages       |
| DELETE | `/conversations/:id` | ✅   | 204, cascades       |
| POST   | `/chat`              | ✅   | SSE stream          |
| POST   | `/chat/stop`         | ✅   | Abort stream        |

Full spec: `docs/06_API_SPEC.md`

---

## SSE Event Types

The `POST /chat` endpoint streams these events:

```
started      → { messageId }
tool_start   → {}
tool_query   → { query: string }
tool_end     → { rowCount: number }
token        → { content: string }
done         → { usage, isPartial }
tool_error   → { message }
error        → { message }
```

---

## Things Claude Must NEVER Do

- Answer a financial question without executing `execute_sql` first
- Return `any` type in TypeScript
- Put business logic in a NestJS controller
- Execute SQL without calling `SqlToolService.validateSql()` first
- Allow queries against `users`, `conversations`, or `messages` tables via the AI tool
- Store passwords in plaintext — use `@node-rs/argon2` (Argon2id)
- Commit `.env` files or API keys to git
- Add features not described in `docs/01_REQUIREMENT.md`
- Skip writing unit tests for new service methods
- Use `console.log` in production code
- Use array index as React list `key`
- Store streaming tokens in `useState` (use `useRef`)
- Return a 404 when a resource exists but belongs to another user (return 403)
- Show stack traces or raw error messages in API responses
- Build the system prompt dynamically from user input
