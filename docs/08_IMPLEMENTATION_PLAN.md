# Implementation Plan

**Project:** Financial AI Chat Assistant  
**Version:** 1.0  
**Status:** Planning  
**Date:** 2026-07-14

> **Before starting any phase:** This document must be reviewed and approved. No production code should be written until the planning documents are complete. Each phase must pass its acceptance criteria before the next begins.

---

## Table of Contents

1. [Phase Overview](#phase-overview)
2. [Phase 0 — Infrastructure](#phase-0--infrastructure)
3. [Phase 1 — Authentication](#phase-1--authentication)
4. [Phase 2 — Database & Conversations](#phase-2--database--conversations)
5. [Phase 3 — Chat Core](#phase-3--chat-core)
6. [Phase 4 — AI Integration](#phase-4--ai-integration)
7. [Phase 5 — Streaming](#phase-5--streaming)
8. [Phase 6 — Usage Limit](#phase-6--usage-limit)
9. [Phase 7 — UI Polish](#phase-7--ui-polish)
10. [Phase 8 — Testing](#phase-8--testing)
11. [Phase Dependencies](#phase-dependencies)
12. [Risk Register](#risk-register)

---

## Phase Overview

```
Phase 0   Infrastructure        Docker Compose (dev) + k3s manifests (prod)
Phase 1   Authentication        Register, login, JWT, protected routes
Phase 2   Database              Schema, migrations, financial data import
Phase 3   Chat Core             Conversations, messages, layout, sidebar
Phase 4   AI Integration        OpenAI tool calling, SQL execution
Phase 5   Streaming             SSE, stop generation, real-time UI
Phase 6   Usage Limit           Redis tracking, 429 enforcement
Phase 7   UI Polish             Markdown, tables, charts, all states
Phase 8   Testing               Unit, integration, E2E, S1–S6 validation
```

**Estimated sequence:** Phases must be completed in order. Phases 4–5 and 6 can overlap once Phase 3 is solid. Phase 7 can begin in parallel with Phase 5.

---

## Phase 0 — Infrastructure

### Goal

Establish a fully working local development environment. Both the frontend and backend can start, connect to their dependencies, and serve a health-check response. No features are implemented yet.

### Scope

- Docker Compose with PostgreSQL and Redis (local development only)
- k3s Kubernetes manifests for all services (deployment target)
- NestJS project skeleton (TypeScript strict, modules scaffolded)
- React + Vite project skeleton (TypeScript strict, shadcn/ui, TailwindCSS)
- Environment variable configuration
- Basic connectivity verification

### Tasks

#### Infrastructure

- [ ] Create `compose.yml` with:
  - `postgres` service (image: `postgres:16-alpine`, port 5432, persistent volume)
  - `redis` service (image: `redis:7-alpine`, port 6379)
  - `backend` service (NestJS, port 3000, depends on postgres + redis)
  - `frontend` service (Vite, port 5173, dev mode)
- [ ] Create `.env.example` and `.env` files documenting all required variables
- [ ] Create `.gitignore` entries for `.env`, `node_modules`, `dist`

#### k3s / Kubernetes Manifests (`deploy/`)

- [ ] Create `deploy/namespace.yaml` — `finchat` namespace
- [ ] Create `deploy/configmap.yaml` — non-secret env vars (`OPENAI_MODEL`, `USAGE_BUDGET_USD`, `FRONTEND_URL`, etc.)
- [ ] Create `deploy/secret.example.yaml` — template for `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `OPENAI_API_KEY` (base64 placeholders only; real values never committed)
- [ ] Create `deploy/postgres/pvc.yaml` — PersistentVolumeClaim (k3s local-path provisioner, 5Gi)
- [ ] Create `deploy/postgres/statefulset.yaml` — PostgreSQL 16 StatefulSet, mounts PVC, env from Secret
- [ ] Create `deploy/postgres/service.yaml` — ClusterIP on port 5432
- [ ] Create `deploy/redis/deployment.yaml` — Redis 7 Deployment
- [ ] Create `deploy/redis/service.yaml` — ClusterIP on port 6379
- [ ] Create `deploy/backend/deployment.yaml` — NestJS Deployment, env from ConfigMap + Secret, liveness + readiness probes on `/health`
- [ ] Create `deploy/backend/service.yaml` — ClusterIP on port 3000
- [ ] Create `deploy/frontend/deployment.yaml` — Nginx Deployment serving built SPA
- [ ] Create `deploy/frontend/service.yaml` — ClusterIP on port 80
- [ ] Create `deploy/ingress.yaml` — Traefik `IngressRoute` routing `/api` → backend-svc, `/` → frontend-svc
- [ ] Create `deploy/README.md` — deployment steps for k3s

#### Backend

- [ ] Initialise NestJS project: `nest new backend --strict`
- [ ] Install dependencies:
  - `@nestjs/typeorm typeorm pg` (PostgreSQL ORM)
  - `@nestjs/jwt @nestjs/passport passport passport-jwt` (Auth)
  - `@nestjs/config` (env configuration)
  - `@node-rs/argon2` (Argon2id — no node-gyp, pre-built binaries, ships own types)
  - `class-validator class-transformer` (DTO validation)
  - `ioredis` (Redis client)
  - `openai` (OpenAI SDK)
- [ ] Configure `AppModule` with `ConfigModule.forRoot({ isGlobal: true })`
- [ ] Configure `TypeOrmModule` with env-driven database connection
- [ ] Enable global `ValidationPipe` in `main.ts`
- [ ] Enable CORS in `main.ts` restricted to frontend origin
- [ ] Create `GET /health` endpoint returning `{ status: 'ok', timestamp }`
- [ ] Verify backend connects to PostgreSQL and Redis on startup

#### Frontend

- [ ] Initialise Vite project: `npm create vite@latest frontend -- --template react-ts`
- [ ] Install dependencies:
  - `tailwindcss postcss autoprefixer` (styling)
  - `@shadcn/ui` components (button, input, card, dialog, skeleton, toast)
  - `axios` (HTTP client)
  - `@tanstack/react-query` (server state)
  - `react-router-dom` (routing)
  - `react-hook-form @hookform/resolvers zod` (forms)
  - `react-markdown remark-gfm` (Markdown)
  - `recharts` (charts)
- [ ] Configure TailwindCSS (`tailwind.config.ts`, `globals.css`)
- [ ] Configure shadcn/ui (`components.json`, theme)
- [ ] Configure React Router with basic routes (`/login`, `/register`, `/chat`)
- [ ] Configure Axios instance with base URL from env
- [ ] Configure TanStack QueryClient in `app/providers.tsx`
- [ ] Create `GET /` placeholder page confirming frontend is running

### Deliverables

- `compose.yml` — starts all four services with `docker compose up` (dev only)
- `deploy/` — complete set of k3s manifests for all services
- `backend/` — NestJS project responding at `http://localhost:3000/health`
- `frontend/` — Vite project responding at `http://localhost:5173`
- `.env.example` — all required variables documented

### Acceptance Criteria

- [ ] `docker compose up` starts all services without errors (dev)
- [ ] `kubectl apply -k deploy/` applies cleanly to a k3s cluster
- [ ] `GET http://localhost:3000/health` returns `200 { status: 'ok' }`
- [ ] `http://localhost:5173` renders a placeholder page
- [ ] Backend logs confirm PostgreSQL and Redis connections established
- [ ] TypeScript compiles with `strict: true`, zero errors

### Dependencies

None. This is the foundation for all subsequent phases.

---

## Phase 1 — Authentication

### Goal

Users can register and log in. Protected routes reject unauthenticated requests. JWT tokens are issued, validated, and carried in all subsequent API calls.

### Scope

- Backend: `UsersEntity`, `AuthModule`, JWT strategy, register/login/me endpoints
- Frontend: `LoginPage`, `RegisterPage`, `AuthContext`, `AuthGuard`, axios JWT interceptor

### Tasks

#### Backend

- [ ] Create `User` entity with fields: `id`, `email`, `passwordHash`, `createdAt`
- [ ] Create `TypeORM` migration for `users` table
- [ ] Create `AuthModule` with:
  - `AuthController`: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
  - `AuthService`: `register(dto)`, `login(dto)`, `validateUser(email, password)`
  - `JwtStrategy`: validates JWT payload, attaches `req.user`
  - `JwtAuthGuard`: protects routes requiring authentication
- [ ] Create DTOs: `RegisterDto` (email, password min 8), `LoginDto`
- [ ] Hash passwords with `argon2.hash()` from `@node-rs/argon2` (Argon2id variant, default parameters)
- [ ] Sign JWTs with `JWT_SECRET` env var, 24h expiry
- [ ] Return identical 401 for both "user not found" and "wrong password"
- [ ] Apply `@UseGuards(JwtAuthGuard)` to `GET /auth/me`
- [ ] Write unit tests for `AuthService` (register, login, error cases)

#### Frontend

- [ ] Create `AuthContext` storing `{ user, token, login, logout }`, persisted to `localStorage`
- [ ] Create `AuthGuard` component: redirects to `/login` if no valid token
- [ ] Create `LoginPage` with:
  - `react-hook-form` + `zod` validation (email format, password required)
  - Submit calls `POST /auth/login`
  - On success: store token in AuthContext, redirect to `/chat`
  - On error: show "Invalid email or password" inline
- [ ] Create `RegisterPage` with:
  - Same form structure as login, with password min-length validation
  - Submit calls `POST /auth/register`
  - On success: store token, redirect to `/chat`
  - On error: show relevant field error or "email already exists"
- [ ] Configure Axios interceptor to attach `Authorization: Bearer <token>` to all requests
- [ ] Configure Axios interceptor to redirect to `/login` on 401 response
- [ ] Protect `/chat` route with `AuthGuard`
- [ ] Implement `GET /auth/me` call on app load to verify token is still valid

### Deliverables

- `POST /auth/register` and `POST /auth/login` working
- `GET /auth/me` protected by JWT guard
- Login and Register pages functional
- Token persisted across browser sessions
- 401 handling redirects to login

### Acceptance Criteria

- [ ] New user can register with a valid email/password
- [ ] Duplicate email returns a clear error
- [ ] Registered user can log in and receive a JWT
- [ ] Wrong password returns "Invalid credentials" (same as missing user)
- [ ] `GET /auth/me` with valid token returns user profile
- [ ] `GET /auth/me` with no token returns `401`
- [ ] Frontend stores token in localStorage; survives page reload
- [ ] Navigating to `/chat` without a token redirects to `/login`
- [ ] All auth unit tests pass

### Dependencies

- Phase 0 complete (PostgreSQL running, NestJS project setup)

---

## Phase 2 — Database & Conversations

### Goal

The financial data is imported and queryable. The conversation and message tables exist. The Conversations API endpoints are functional. The frontend sidebar can list, create, and delete conversations.

### Scope

- Import `financial_data.sql` into PostgreSQL
- Create and migrate `conversations` and `messages` tables
- Build `ConversationsModule` (CRUD)
- Build frontend conversation sidebar

### Tasks

#### Database

- [ ] Add recommended indexes to `financial_data`:
  ```sql
  CREATE INDEX idx_financial_data_company_year ON financial_data (company, year);
  CREATE INDEX idx_financial_data_sector_year ON financial_data (sector, year);
  CREATE INDEX idx_financial_data_ticker ON financial_data (ticker);
  ```
- [ ] Create `Conversation` entity with fields per `05_DATABASE.md`
- [ ] Create `Message` entity with all fields including `toolInput`, `toolOutput` JSONB, `isPartial`
- [ ] Write TypeORM migrations for `conversations` and `messages` tables
- [ ] Create database seed/restore script for `financial_data.sql`
- [ ] Document import command in README

#### Backend

- [ ] Create `ConversationsModule` with:
  - `ConversationsController`: `POST /conversations`, `GET /conversations`, `GET /conversations/:id`, `DELETE /conversations/:id`
  - `ConversationsService`: `create`, `findAll`, `findOne`, `delete`
  - All routes protected by `JwtAuthGuard`
- [ ] Enforce `WHERE userId = req.user.id` on all conversation queries
- [ ] Return `403 Forbidden` when accessing another user's conversation
- [ ] Auto-generate conversation title from first message text (max 60 chars) — implement as a utility, to be wired up in Phase 3
- [ ] Paginate `GET /conversations` with `limit` and `offset` query params
- [ ] `DELETE /conversations/:id` cascades to messages via FK constraint

#### Frontend

- [ ] Create `AppLayout` component (sidebar + main area)
- [ ] Create `ConversationSidebar` component:
  - Calls `GET /conversations` via TanStack Query
  - Shows skeleton while loading
  - Shows "No conversations yet" empty state
  - Renders `ConversationItem` for each conversation
- [ ] Create `ConversationItem` component:
  - Displays title and relative time
  - Highlights active conversation
  - Shows 🗑 trash icon on hover
- [ ] Create `DeleteConfirmationDialog` component (shadcn/ui Dialog)
- [ ] Wire up delete flow: hover → icon → dialog → `DELETE /conversations/:id` → remove from list
- [ ] Create "New Chat" button: calls `POST /conversations`, navigates to `/chat/:id`
- [ ] Connect TanStack Query `invalidateQueries` after create/delete

### Deliverables

- `financial_data` table populated and indexed
- `conversations` and `messages` tables with correct schema
- All 4 conversation endpoints functional
- Sidebar shows conversations, supports create and delete

### Acceptance Criteria

- [ ] `SELECT COUNT(*) FROM financial_data` returns 192
- [ ] `SELECT * FROM financial_data WHERE company = 'Apple' AND year = 2023` returns correct data
- [ ] `POST /conversations` creates a conversation linked to the authenticated user
- [ ] `GET /conversations` only returns conversations for the requesting user
- [ ] `GET /conversations/:id` returns messages in `createdAt ASC` order
- [ ] `DELETE /conversations/:id` from another user's token returns 403
- [ ] `DELETE /conversations/:id` cascades to messages (messages deleted too)
- [ ] Frontend sidebar lists conversations, shows skeleton during load
- [ ] Delete confirmation dialog appears before deletion
- [ ] After deletion, conversation is removed from sidebar list

### Dependencies

- Phase 1 complete (Auth working, users table exists)

---

## Phase 3 — Chat Core

### Goal

The chat page layout is complete. Users can send messages and receive synchronous (non-streaming) AI placeholder responses. The full message history loads when opening a conversation. The browser refresh restores the active conversation.

### Scope

- `ChatPage` with `MessageList` and `ChatInput`
- Message persistence (user messages saved to DB)
- `GET /conversations/:id` loads full message history
- Basic message rendering (no streaming, no AI yet)

### Tasks

#### Backend

- [ ] Create `ChatModule` with:
  - `ChatController`: `POST /chat`, `POST /chat/stop` (both stubbed for now)
  - `ChatService`: `sendMessage(userId, dto)` — saves user message, returns placeholder
- [ ] `POST /chat` protected by `JwtAuthGuard`
- [ ] Validate `SendMessageDto`: `conversationId` (UUID), `message` (string 1–4000 chars)
- [ ] On `POST /chat`: save user `Message` entity, return a stub assistant response synchronously
- [ ] Stub `POST /chat/stop` returning `{ stopped: true, content: '' }`
- [ ] Update `conversation.updatedAt` on every new message

#### Frontend

- [ ] Create `ChatPage` component:
  - Reads `:conversationId` from URL params
  - Calls `GET /conversations/:id` via TanStack Query
  - Shows `MessageSkeleton` during load
  - Renders `MessageList` with fetched messages
  - Shows `EmptyConversationState` if no messages
- [ ] Create `MessageList` component:
  - Renders `MessageBubble` for each message
  - Auto-scrolls to bottom on new message
  - Scroll suspension when user scrolls up
- [ ] Create `MessageBubble` component:
  - User messages: right-aligned, primary background
  - Assistant messages: left-aligned, card background
  - `isPartial` indicator for stopped messages
- [ ] Create `ChatInput` component:
  - Auto-expanding textarea
  - Disabled send button when empty
  - Submit on Enter, Shift+Enter for newline
- [ ] Wire chat submit: `POST /chat`, optimistically append user message, append stub response
- [ ] Update URL to `/chat/:conversationId` after first message using `history.replaceState`
- [ ] Create `EmptyConversationState` with example questions
- [ ] Implement browser refresh: URL param → fetch conversation → render messages

### Deliverables

- `ChatPage` renders correctly with message history
- Sending a message saves it and shows stub assistant response
- Browser refresh restores conversation
- All conversation navigation works

### Acceptance Criteria

- [ ] `/chat` shows empty state with example questions
- [ ] Sending a message creates it in the database and shows it in the UI
- [ ] URL updates to `/chat/:conversationId` on first message
- [ ] Reloading `/chat/:conversationId` loads and renders all messages in order
- [ ] No duplicate messages on reload (S5)
- [ ] Auto-scroll works: page scrolls to new messages automatically
- [ ] Scroll suspension works: auto-scroll stops when user scrolls up
- [ ] Message send is disabled while a previous request is in-flight

### Dependencies

- Phase 2 complete (conversations table, ConversationsModule, sidebar)

---

## Phase 4 — AI Integration

### Goal

The AI assistant answers financial questions using real OpenAI API calls. The `execute_sql` tool is called, validated, and executed against PostgreSQL. Responses are correct and grounded in data. No hallucination. (Non-streaming first — a single synchronous response.)

### Scope

- `OpenAIService` wrapping the OpenAI Node SDK
- `SqlToolService` with validation and execution
- System prompt engineering
- Tool definition
- Full synchronous (non-streaming) chat cycle

### Tasks

#### Backend

- [ ] Create `OpenAIService`:
  - Wraps OpenAI Node SDK client
  - `chatWithTools(messages, tools)`: makes a single completion call (non-streaming)
  - Extracts tool call or text response from completion
  - Configured via `OPENAI_API_KEY` env var
  - Configured via `OPENAI_MODEL` env var (default: `gpt-4o`)
- [ ] Create `SqlToolService`:
  - `validateSql(query: string)`: asserts SELECT-only, no DML/DDL, no semicolons
  - `execute(query: string)`: runs query against PostgreSQL, returns `{ rows, rowCount }`
  - Caps results at 100 rows
  - Uses read-only connection (or same connection with query-level enforcement)
- [ ] Define `EXECUTE_SQL_TOOL` constant (OpenAI function definition object)
- [ ] Define `SYSTEM_PROMPT` constant with grounding instructions
- [ ] Implement full AI chat cycle in `ChatService.sendMessage()`:
  1. Load conversation history from DB
  2. Build messages array `[system, ...history, userMessage]`
  3. Call `OpenAIService.chatWithTools()` with tool definition
  4. If response is `tool_call`: validate SQL, execute, append tool result, call OpenAI again
  5. Extract final text content
  6. Save all messages (user, tool, assistant) to DB
  7. Return final text response
- [ ] Handle 0-row SQL results: pass empty array back to OpenAI, let model say "not available"
- [ ] Handle SQL validation failure: return error message without calling OpenAI again
- [ ] Handle OpenAI API errors: catch and return `503` with user-friendly message

#### Testing

- [ ] Unit test `SqlToolService.validateSql()` for all accepted and rejected patterns
- [ ] Unit test `ChatService.sendMessage()` with mocked `OpenAIService` and `SqlToolService`
- [ ] Integration test: `POST /chat` with real PostgreSQL and mocked OpenAI

### Deliverables

- `POST /chat` returns a real AI-generated answer grounded in SQL data
- SQL tool execution confirmed in database logs
- S1 (valid question) passes
- S2 (missing data) passes — no fabricated numbers

### Acceptance Criteria

- [ ] "What was Apple's net income in 2023?" returns "$96.99 billion" (exact value from DB)
- [ ] "What was Apple's revenue in 2021?" returns a "not available" response — no number invented
- [ ] "What was OpenAI's net income?" returns a "not available" response
- [ ] SQL validation rejects any query with INSERT/UPDATE/DELETE/DROP
- [ ] SQL validation rejects queries targeting non-`financial_data` tables
- [ ] OpenAI API error returns `503` with friendly message, not a stack trace
- [ ] All unit tests for `SqlToolService` pass

### Dependencies

- Phase 3 complete (messages table, chat endpoint exists as stub)
- OpenAI API key available in `.env`

---

## Phase 5 — Streaming

### Goal

AI responses stream token-by-token. The SQL tool execution block appears in real time. Users can stop generation mid-stream. Partial responses are saved. The frontend renders tokens progressively.

### Scope

- NestJS SSE stream endpoint replacing synchronous `POST /chat`
- Frontend `useStream` hook consuming `ReadableStream`
- `SqlToolBlock` component with 4 states
- Stop generation via `AbortController`

### Tasks

#### Backend

- [ ] Refactor `ChatController.chat()` to return an SSE stream:
  - Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
  - Use `PassThrough` stream piped to `res.write()`
  - Emit `started` event with `messageId` immediately
- [ ] Refactor `OpenAIService` to expose:
  - `streamWithTools(messages, tools, onEvent, abortSignal)`: streams tool call deltas and tokens
  - Calls `onEvent` callback for each SSE event type
- [ ] Refactor `ChatService.orchestrateStream()`:
  - Create pending assistant `Message` entity in DB before streaming
  - Emit `tool_start`, `tool_query`, `tool_end` events at the correct moments
  - Emit `token` events for each content delta
  - Emit `done` event with token usage
  - On completion: update message content and `tokensUsed` in DB
- [ ] Implement `ChatService.stopStream(userId, dto)`:
  - Looks up active stream in `Map<messageId, AbortController>`
  - Calls `abort()` on the controller
  - Sets `isPartial = true` on the message
  - Returns current partial content
- [ ] Track active streams in an in-memory `Map<messageId, { controller, buffer }>`
- [ ] Clean up map entry after stream closes (success, stop, or error)

#### Frontend

- [ ] Create `useStream` hook:
  - Uses `fetch()` with `ReadableStream` reader (not `EventSource`)
  - Attaches `Authorization: Bearer` header
  - Parses `data: {...}\n\n` SSE lines
  - Dispatches events to a state machine reducer
- [ ] Create streaming state machine in `useChat` hook with states:
      `IDLE → SENDING → STREAMING_TOOL → STREAMING_ANSWER → DONE/STOPPED/ERROR`
- [ ] Update `ChatInput` to show Stop button (`[■]`) during streaming
- [ ] Wire Stop button to `POST /chat/stop` with stored `messageId`
- [ ] Create `SqlToolBlock` component with 4 visual states (see `07_UI_FLOW.md`)
- [ ] Create `StreamingIndicator` (blinking `▌` cursor)
- [ ] Implement token buffer: append to `useRef`, flush to state via `requestAnimationFrame`
- [ ] Update `MessageBubble` to pass content through `MarkdownRenderer`

### Deliverables

- `POST /chat` streams SSE events in real time
- `SqlToolBlock` renders correctly in all 4 states
- Tokens appear progressively in the UI
- Stop generation works and saves partial content

### Acceptance Criteria

- [ ] First streaming token appears within 2 seconds of sending a message
- [ ] `tool_start` event causes `SqlToolBlock` to appear in the UI
- [ ] `tool_query` event populates SQL text in `SqlToolBlock`
- [ ] `tool_end` event shows "Completed · N rows" badge
- [ ] Tokens appear character-by-character (or small chunks)
- [ ] Streaming cursor `▌` is visible and disappears on `done`
- [ ] Clicking Stop: stream halts immediately, partial message saved, Stop button disappears (S3)
- [ ] `isPartial: true` messages show a visual "generation was stopped" indicator
- [ ] Refreshing page while partial message exists renders it correctly (S5 extended)

### Dependencies

- Phase 4 complete (AI integration working synchronously)

---

## Phase 6 — Usage Limit

### Goal

Each user's OpenAI API spending is tracked in Redis. Requests are rejected when the user's hourly budget is exhausted. The budget resets automatically after 1 hour. The frontend shows a friendly message with time remaining.

### Scope

- `UsageModule` with `UsageService` and `UsageGuard`
- Redis integration for per-user spend tracking
- Cost calculation from token usage
- Frontend usage limit banner

### Tasks

#### Backend

- [ ] Configure `ioredis` client via `RedisModule` using `REDIS_URL` env var
- [ ] Create `UsageService`:
  - `checkLimit(userId)`: `GET usage:{userId}` → compare to `USAGE_BUDGET_USD` env var
  - `track(userId, costUsd)`: `INCRBYFLOAT usage:{userId} {cost}` + `EXPIRE` if new key
  - `getTimeToReset(userId)`: `TTL usage:{userId}` → seconds remaining
  - `calculateCost(promptTokens, completionTokens)`: pricing formula from model rates
- [ ] Create `UsageGuard`:
  - Runs before `ChatController` routes
  - Calls `UsageService.checkLimit(req.user.id)`
  - Throws `HttpException(429)` if over budget, with `resetIn: secondsRemaining`
- [ ] Apply `UsageGuard` to `POST /chat`
- [ ] Call `UsageService.track()` after every completed stream (full or partial)
- [ ] Configure via env vars: `USAGE_BUDGET_USD` (default: `1.0`), `USAGE_RESET_INTERVAL_SECONDS` (default: `3600`)
- [ ] Write unit tests for `UsageService` (check, track, TTL logic)

#### Frontend

- [ ] Handle `429` response from `POST /chat` in `useStream` hook
- [ ] Create `UsageLimitBanner` component:
  - Shows amber warning bar above `ChatInput`
  - Displays "Resets in X minutes" using `resetIn` from 429 response
  - Counts down in real time
  - Disappears when countdown reaches 0
- [ ] Disable `ChatInput` while `UsageLimitBanner` is visible
- [ ] Re-enable `ChatInput` when banner countdown expires

### Deliverables

- `UsageGuard` enforces budget on `POST /chat`
- Redis key with TTL tracks spend per user
- Frontend shows friendly 429 banner (S4)

### Acceptance Criteria

- [ ] Requests succeed when user spend is under the budget
- [ ] Request is rejected with 429 once budget is reached (S4)
- [ ] 429 response body includes `resetIn: N` (seconds)
- [ ] Frontend shows a user-friendly banner, not a raw error (S4)
- [ ] `resetIn` countdown is accurate
- [ ] After 1 hour (or TTL expiry), usage resets and new requests succeed
- [ ] Token cost from stopped streams is still deducted (S3 + S6 interaction)
- [ ] Unit tests for `UsageService` pass

### Dependencies

- Phase 5 complete (streaming with token usage in `done` event)
- Redis running (Phase 0)

---

## Phase 7 — UI Polish

### Goal

The application looks and feels production-quality. All loading states, empty states, and error states are implemented. Markdown renders correctly. Tables and charts display for appropriate queries. Animations are smooth.

### Scope

- `MarkdownRenderer` with all supported elements
- `DataChart` (Recharts BarChart + LineChart)
- `DataTable` (styled HTML table)
- All skeleton loading states
- All error states (toast, inline, banner)
- Smooth animations

### Tasks

#### Frontend — Rendering

- [ ] Create `MarkdownRenderer` component:
  - Wraps `react-markdown` with `remark-gfm`
  - Custom component overrides for: `table`, `code`, `pre`, `a`
  - `code` block with syntax highlighting for `sql` language
  - Security: no raw HTML pass-through
- [ ] Create `DataTable` component:
  - Zebra striping (alternating row background)
  - Numeric columns right-aligned
  - Horizontal scroll for overflow
  - Header row bold with tinted background
- [ ] Create `DataChart` component:
  - Parses ` ```chart {...} ``` ` code blocks from AI response
  - Renders `BarChart` or `LineChart` based on `type` field
  - Uses `ResponsiveContainer` from Recharts
  - Tooltip with formatted `$X.XX billion` values
  - Fallback to code block if JSON is malformed
- [ ] Update `MarkdownRenderer` to delegate `chart` code blocks to `DataChart`

#### Frontend — States

- [ ] Create `MessageSkeleton` component (skeleton bubbles for loading state)
- [ ] Create `ConversationSkeleton` component (skeleton items for sidebar)
- [ ] Implement `EmptyConversationState` with example question chips
- [ ] Implement sidebar "No conversations yet" empty state
- [ ] Implement `ErrorToast` component (top-right, auto-dismiss 5s)
- [ ] Show `ErrorToast` for network errors during chat
- [ ] Show inline error in `MessageBubble` for AI service errors
- [ ] Implement "Scroll to bottom" button when user scrolls up

#### Frontend — UX Details

- [ ] Conversation title auto-updates to first message text (60 char max) after first `done` event
- [ ] Sidebar conversation list sorted by `updatedAt DESC`, updates in real time after new messages
- [ ] `ConversationItem` time display: relative time ("2m ago", "Yesterday") using `date-fns`
- [ ] Active conversation highlighted in sidebar with left border accent
- [ ] Dark mode support via TailwindCSS `dark:` classes and system preference detection
- [ ] `ChatInput` textarea focus on page load
- [ ] Keyboard shortcut: `Ctrl/Cmd + Enter` as alternative send shortcut

### Deliverables

- Markdown, tables, and charts render correctly
- All loading, empty, and error states implemented
- App is visually polished and production-ready

### Acceptance Criteria

- [ ] Bold, italic, lists, headings render correctly in assistant messages
- [ ] Multi-row SQL results display as a styled table
- [ ] Year-over-year trend queries render a BarChart or LineChart
- [ ] Conversation list shows skeletons during initial load
- [ ] Messages show skeletons when switching conversations
- [ ] "No conversations" empty state shown for new users
- [ ] Empty conversation state with example questions shown for new chats
- [ ] Network error shows toast notification
- [ ] AI service error shows inline error with retry button
- [ ] Application looks polished at 1280×800 desktop resolution

### Dependencies

- Phase 5 complete (streaming infrastructure, `MarkdownRenderer` wired up)

---

## Phase 8 — Testing

### Goal

All six baseline scenarios (S1–S6) pass. Unit tests cover all services. Integration tests cover all API endpoints. E2E tests simulate the full user journey.

### Scope

- Unit tests: `AuthService`, `ChatService`, `SqlToolService`, `UsageService`
- Integration tests: all API endpoints
- E2E tests: S1–S6 using Playwright
- Manual test checklist verification

### Tasks

#### Unit Tests (Jest)

- [ ] `AuthService`: register (success, duplicate email), login (success, wrong password, missing user)
- [ ] `SqlToolService`: validate (SELECT pass, INSERT reject, UPDATE reject, DELETE reject, DROP reject, multi-statement reject)
- [ ] `ChatService`: message flow with mocked OpenAI and mocked SQL (tool call path, direct answer path, 0-row path)
- [ ] `UsageService`: checkLimit (under, at, over), track (new key sets TTL, existing key increments), calculateCost

#### Integration Tests (Jest + Supertest)

- [ ] `POST /auth/register` — success, duplicate email, invalid payload
- [ ] `POST /auth/login` — success, wrong credentials
- [ ] `GET /auth/me` — with and without token
- [ ] `POST /conversations` — success, auth required
- [ ] `GET /conversations` — returns only current user's conversations
- [ ] `GET /conversations/:id` — success, 403, 404
- [ ] `DELETE /conversations/:id` — success, 403, 404
- [ ] `POST /chat` — 401 unauthenticated, 400 invalid DTO, 403 wrong conversation
- [ ] `POST /chat/stop` — success, 404 no active stream

#### E2E Tests (Playwright)

- [ ] **S1** — Register → login → ask "What was Apple's net income in 2023?" → verify SqlToolBlock appears → verify streamed answer contains "$96.99 billion"
- [ ] **S2** — Ask "What was Apple's revenue in 2021?" → verify response says "not available" → verify no numbers in response
- [ ] **S3** — Start a long query → click Stop → verify stream halts → verify partial content saved → verify stop button disappears
- [ ] **S4** — Exhaust usage limit (mock Redis or set very low budget) → send message → verify 429 banner appears → verify input disabled → verify no raw error
- [ ] **S5** — Send a message → hard-refresh browser → verify conversation loads → verify messages in correct order → verify no duplicates
- [ ] **S6** — Click delete on a conversation → verify confirmation dialog appears → cancel → verify not deleted → confirm → verify conversation gone

#### Manual Test Checklist

- [ ] Table rendering: ask "Compare Apple, Google, and Microsoft revenue in 2024" → verify table renders
- [ ] Chart rendering: ask "Show Apple revenue trend 2022 to 2025" → verify chart renders
- [ ] Markdown rendering: bold, italic, lists all visible in assistant response
- [ ] Multiple conversations: create 3+ conversations, switch between them, verify correct content
- [ ] Logout: click logout → token cleared → redirect to login → `/chat` redirects to login
- [ ] Long message: send a very long query → verify textarea expands → verify it sends correctly
- [ ] Null data: ask "What was Goldman's revenue in 2024?" → verify response mentions data not available but provides net income

### Deliverables

- All unit tests passing
- All integration tests passing
- All 6 E2E scenarios passing
- Manual checklist signed off

### Acceptance Criteria

- [ ] `npm test` in `backend/` reports zero failures
- [ ] `npx playwright test` reports all 6 scenario tests passing
- [ ] Code coverage ≥ 80% on `ChatService`, `SqlToolService`, `UsageService`
- [ ] All 6 baseline scenarios (S1–S6) verified working end-to-end
- [ ] Manual checklist completed with no blocking issues

### Dependencies

- Phase 7 complete (full application working)

---

## Phase Dependencies

```
Phase 0 ← (none)
Phase 1 ← Phase 0
Phase 2 ← Phase 1
Phase 3 ← Phase 2
Phase 4 ← Phase 3
Phase 5 ← Phase 4
Phase 6 ← Phase 5  (needs token usage from 'done' event)
Phase 7 ← Phase 5  (can start once SSE infrastructure exists)
Phase 8 ← Phase 7
```

Phases 6 and 7 can be developed **in parallel** once Phase 5 is complete.

---

## Risk Register

| Risk                                                            | Likelihood | Impact | Mitigation                                                                                                        |
| --------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| OpenAI API rate limits during development                       | Medium     | Medium | Use a low-traffic dev key; add retry with exponential backoff                                                     |
| OpenAI tool calling behaviour changes between models            | Low        | High   | Pin model version in `OPENAI_MODEL` env var; test with gpt-4o specifically                                        |
| Redis TTL inconsistency for usage reset                         | Low        | Medium | Use `SETEX` (atomic) on first write; document behaviour in tests                                                  |
| SSE stream not flushing in production (reverse proxy buffering) | Medium     | High   | Add `X-Accel-Buffering: no` header; Traefik handles SSE natively — test end-to-end on k3s before final submission |
| JohnsonJohnson 2023 data anomaly confusing the AI               | Low        | Low    | System prompt does not instruct the AI to validate data — it reports whatever SQL returns                         |
| Large conversation history exceeding OpenAI context window      | Low        | Medium | Cap conversation history at last 20 messages sent to OpenAI (configurable)                                        |
| SQL injection via AI-generated queries                          | Low        | High   | `SqlToolService` strict validation before any execution; parameterized queries                                    |
