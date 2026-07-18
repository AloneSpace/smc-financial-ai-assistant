# Project Task Checklist

**Project:** Financial AI Chat Assistant  
**Version:** 1.0  
**Status:** Planning  
**Date:** 2026-07-14

> Use this checklist to track implementation progress. Each task maps to a phase in `08_IMPLEMENTATION_PLAN.md`. Tasks are ordered by recommended implementation sequence within each category.

---

## Table of Contents

1. [Infrastructure](#infrastructure)
2. [Database](#database)
3. [Authentication — Backend](#authentication--backend)
4. [Authentication — Frontend](#authentication--frontend)
5. [Conversations — Backend](#conversations--backend)
6. [Conversations — Frontend](#conversations--frontend)
7. [Chat Core — Backend](#chat-core--backend)
8. [Chat Core — Frontend](#chat-core--frontend)
9. [AI Integration](#ai-integration)
10. [Streaming — Backend](#streaming--backend)
11. [Streaming — Frontend](#streaming--frontend)
12. [Usage Limit — Backend](#usage-limit--backend)
13. [Usage Limit — Frontend](#usage-limit--frontend)
14. [UI Polish — Frontend](#ui-polish--frontend)
15. [Testing](#testing)
16. [Documentation](#documentation)
17. [Deployment](#deployment)

---

## Infrastructure

### Docker Compose (Local Development)

- [ ] Create `compose.yml` with `postgres`, `redis`, `backend`, `frontend` services
- [ ] Add named volumes for PostgreSQL persistence
- [ ] Add health checks to `postgres` and `redis` services
- [ ] Create `.env.example` documenting all required environment variables
- [ ] Create `.env` (git-ignored) with local development values
- [ ] Add `.gitignore` entries: `.env`, `node_modules/`, `dist/`, `*.local`

### k3s Kubernetes Manifests (`deploy/`)

- [ ] Create `deploy/namespace.yaml` — `finchat` namespace
- [ ] Create `deploy/configmap.yaml` — non-secret config (`OPENAI_MODEL`, `USAGE_BUDGET_USD`, `FRONTEND_URL`, `JWT_EXPIRY`)
- [ ] Create `deploy/secret.example.yaml` — base64 placeholder template for all secrets (never commit real values)
- [ ] Create `deploy/postgres/pvc.yaml` — PVC 5Gi, k3s local-path storage class
- [ ] Create `deploy/postgres/statefulset.yaml` — PostgreSQL 16, env from Secret, mounts PVC
- [ ] Create `deploy/postgres/service.yaml` — ClusterIP port 5432
- [ ] Create `deploy/redis/deployment.yaml` — Redis 7 Deployment
- [ ] Create `deploy/redis/service.yaml` — ClusterIP port 6379
- [ ] Create `deploy/backend/deployment.yaml` — NestJS, env from ConfigMap + Secret, liveness + readiness on `/health`
- [ ] Create `deploy/backend/service.yaml` — ClusterIP port 3000
- [ ] Create `deploy/frontend/deployment.yaml` — Nginx serving built React SPA
- [ ] Create `deploy/frontend/service.yaml` — ClusterIP port 80
- [ ] Create `deploy/ingress.yaml` — Traefik `IngressRoute`: `/api/*` → backend, `/*` → frontend
- [ ] Create `deploy/README.md` — k3s setup and apply steps

### Backend Project Setup

- [ ] Initialise NestJS project: `nest new backend --strict`
- [ ] Enable TypeScript `strict: true` in `tsconfig.json`
- [ ] Install `@nestjs/typeorm typeorm pg`
- [ ] Install `@nestjs/jwt @nestjs/passport passport passport-jwt @types/passport-jwt`
- [ ] Install `@nestjs/config`
- [ ] Install `class-validator class-transformer`
- [ ] Install `ioredis @types/ioredis`
- [ ] Install `openai`
- [ ] Install dev dependencies: `jest @types/jest ts-jest supertest @types/supertest`
- [ ] Configure `ConfigModule.forRoot({ isGlobal: true })` in `AppModule`
- [ ] Configure global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- [ ] Configure CORS in `main.ts` restricted to `FRONTEND_URL` env var
- [ ] Create `GET /health` endpoint returning `{ status: 'ok', timestamp: new Date() }`
- [ ] Verify PostgreSQL connection on startup (log success/failure)
- [ ] Verify Redis connection on startup (log success/failure)

### Frontend Project Setup

- [ ] Initialise Vite project: `npm create vite@latest frontend -- --template react-ts`
- [ ] Enable TypeScript `strict: true` in `tsconfig.json`
- [ ] Install `tailwindcss postcss autoprefixer` and run `npx tailwindcss init -p`
- [ ] Install and initialise `shadcn/ui`: button, input, card, dialog, skeleton, textarea, toast, badge
- [ ] Install `axios`
- [ ] Install `@tanstack/react-query @tanstack/react-query-devtools`
- [ ] Install `react-router-dom`
- [ ] Install `react-hook-form @hookform/resolvers zod`
- [ ] Install `react-markdown remark-gfm`
- [ ] Install `recharts`
- [ ] Install `date-fns`
- [ ] Install `lucide-react` (icons)
- [ ] Configure `tailwind.config.ts` with shadcn/ui preset and dark mode
- [ ] Create `src/shared/lib/axios.ts` — configured Axios instance with base URL
- [ ] Create `src/app/providers.tsx` — `QueryClientProvider` + `RouterProvider`
- [ ] Verify frontend renders at `http://localhost:5173`

---

## Database

### Schema & Migrations

- [ ] Create `User` TypeORM entity (`id`, `email`, `passwordHash`, `createdAt`)
- [ ] Create `Conversation` TypeORM entity (`id`, `userId`, `title`, `createdAt`, `updatedAt`)
- [ ] Create `Message` TypeORM entity (all fields including `toolInput` JSONB, `toolOutput` JSONB, `isPartial`)
- [ ] Create `FinancialData` TypeORM entity (matching `financial_data` table columns)
- [ ] Write TypeORM migration: `users` table
- [ ] Write TypeORM migration: `conversations` table with FK to users (CASCADE DELETE)
- [ ] Write TypeORM migration: `messages` table with FK to conversations (CASCADE DELETE)
- [ ] Configure TypeORM `synchronize: false` in production (use migrations only)

### Financial Data

- [ ] Write shell script `scripts/import-financial-data.sh` to restore `financial_data.sql`
- [ ] Add `financial_data` import step to `compose.yml` init (or README instructions)
- [ ] Create migration to add indexes:
  - `idx_financial_data_company_year` on `(company, year)`
  - `idx_financial_data_sector_year` on `(sector, year)`
  - `idx_financial_data_ticker` on `(ticker)`
- [ ] Create migrations to add application table indexes:
  - `idx_conversations_user_id` on `conversations (user_id, updated_at DESC)`
  - `idx_messages_conversation_id` on `messages (conversation_id, created_at ASC)`
- [ ] Verify: `SELECT COUNT(*) FROM financial_data` returns 192
- [ ] Verify: company + year lookup returns correct values

---

## Authentication — Backend

- [ ] Create `auth/` module folder structure (`module`, `controller`, `service`, `strategies/`, `guards/`, `dto/`)
- [ ] Create `RegisterDto`: `email` (IsEmail), `password` (MinLength 8, IsString)
- [ ] Create `LoginDto`: `email` (IsEmail), `password` (IsString, IsNotEmpty)
- [ ] Create `AuthService.register(dto)`:
  - Check email uniqueness → throw `ConflictException` if exists
  - `await argon2.hash(password)` — uses Argon2id by default
  - Save user entity
  - Return `{ accessToken, user }`
- [ ] Create `AuthService.login(dto)`:
  - Find user by email → throw `UnauthorizedException` if not found
  - `await argon2.verify(storedHash, password)` → throw `UnauthorizedException` if false
  - Return `{ accessToken, user }`
- [ ] Create `JwtStrategy` extending `PassportStrategy(Strategy)`:
  - Validates JWT signature using `JWT_SECRET`
  - Returns `{ id: payload.sub, email: payload.email }`
- [ ] Create `JwtAuthGuard` extending `AuthGuard('jwt')`
- [ ] Create `AuthController`:
  - `POST /auth/register` → `AuthService.register()`
  - `POST /auth/login` → `AuthService.login()`
  - `GET /auth/me` → `@UseGuards(JwtAuthGuard)`, return `req.user`
- [ ] Configure `JwtModule.register({ secret: JWT_SECRET, expiresIn: '24h' })`
- [ ] Unit test: `AuthService.register()` — success, duplicate email
- [ ] Unit test: `AuthService.login()` — success, wrong password, user not found

---

## Authentication — Frontend

- [ ] Create `features/auth/types.ts`: `User`, `AuthState`, `LoginDto`, `RegisterDto`
- [ ] Create `features/auth/api/auth.api.ts`: `register()`, `login()`, `getMe()` API calls
- [ ] Create `features/auth/AuthContext.tsx`:
  - State: `{ user, token, isLoading }`
  - Methods: `login(token, user)`, `logout()`
  - Persist token to `localStorage`
  - Call `GET /auth/me` on mount to validate stored token
- [ ] Configure Axios request interceptor: attach `Authorization: Bearer <token>`
- [ ] Configure Axios response interceptor: on 401 → clear auth + redirect to `/login`
- [ ] Create `features/auth/AuthGuard.tsx`:
  - Reads from `AuthContext`
  - Redirects to `/login?redirect=<currentPath>` if no token
  - Shows loading spinner while auth state resolves
- [ ] Create `features/auth/components/LoginPage.tsx`:
  - `react-hook-form` with Zod schema
  - Call `login()` on submit
  - Show field errors and server errors
  - Redirect to `?redirect` param or `/chat` on success
- [ ] Create `features/auth/components/RegisterPage.tsx`:
  - Same structure as LoginPage
  - Call `register()` on submit
  - Handle 409 error with specific message
- [ ] Apply `AuthGuard` to `/chat` route
- [ ] Redirect already-authenticated users away from `/login` and `/register`

---

## Conversations — Backend

- [ ] Create `conversations/` module folder structure
- [ ] Create `CreateConversationDto`: `title` (optional, MaxLength 255)
- [ ] Create `ConversationsService`:
  - `create(userId, dto)` — creates conversation, returns `ConversationSummaryDto`
  - `findAll(userId, limit, offset)` — paginated, ordered by `updatedAt DESC`
  - `findOne(userId, id)` — with messages ordered by `createdAt ASC`; throws 403/404
  - `delete(userId, id)` — verifies ownership; throws 403/404
  - `updateTitle(id, title)` — updates conversation title
  - `touch(id)` — updates `updatedAt` to now
- [ ] Create `ConversationsController`:
  - All routes protected by `JwtAuthGuard`
  - `POST /conversations` → `create()`
  - `GET /conversations?limit&offset` → `findAll()`
  - `GET /conversations/:id` → `findOne()`
  - `DELETE /conversations/:id` → `delete()`, returns 204
- [ ] Enforce `WHERE user_id = req.user.id` on ALL conversation queries
- [ ] Return `403 Forbidden` (not 404) when user accesses another user's resource

---

## Conversations — Frontend

- [ ] Create `features/conversations/types.ts`
- [ ] Create `features/conversations/api/conversations.api.ts`:
  - `createConversation()`, `getConversations()`, `getConversation(id)`, `deleteConversation(id)`
- [ ] Create `features/conversations/hooks/useConversations.ts` (TanStack Query)
- [ ] Create `features/conversations/hooks/useConversation.ts` (single conversation with messages)
- [ ] Create `features/conversations/components/ConversationSidebar.tsx`
- [ ] Create `features/conversations/components/ConversationItem.tsx`:
  - Active state highlighted
  - Hover reveals 🗑 trash icon
  - Relative timestamp using `date-fns`
- [ ] Create `features/conversations/components/DeleteConfirmationDialog.tsx`:
  - shadcn/ui `Dialog`
  - Shows conversation title
  - Cancel / Delete (destructive) buttons
  - Loading spinner on delete button during request
- [ ] Wire "New Chat" button: `POST /conversations` → navigate to `/chat/:id`
- [ ] Wire conversation click: navigate to `/chat/:id`
- [ ] Wire delete: confirm dialog → `DELETE /conversations/:id` → invalidate query cache
- [ ] Show `ConversationSkeleton` × 3 while conversations are loading

---

## Chat Core — Backend

- [ ] Create `chat/` module folder structure
- [ ] Create `SendMessageDto`: `conversationId` (IsUUID), `message` (IsString, Length 1–4000)
- [ ] Create `StopGenerationDto`: `conversationId` (IsUUID), `messageId` (IsUUID)
- [ ] Create `ChatService` (stubbed):
  - `sendMessage(userId, dto)` — saves user message, returns stub text
  - `stopStream(userId, dto)` — returns `{ stopped: false, content: '' }`
- [ ] Create `ChatController`:
  - `POST /chat` → `@UseGuards(JwtAuthGuard)` → call `ChatService.sendMessage()`
  - `POST /chat/stop` → `@UseGuards(JwtAuthGuard)` → call `ChatService.stopStream()`
- [ ] Verify conversation ownership before any message operation
- [ ] Save user message entity before calling AI
- [ ] Update `conversation.updatedAt` on each new message
- [ ] Auto-generate conversation title from first 60 chars of user message (when title is "New Conversation")

---

## Chat Core — Frontend

- [ ] Create `features/chat/types.ts`: `Message`, `StreamState`, `ChatEvent`
- [ ] Create `app/AppLayout.tsx` — sidebar + main area, 100vh, no outer scroll
- [ ] Create `features/chat/ChatPage.tsx`:
  - Reads `:conversationId` from URL params
  - Loads conversation via `useConversation(id)`
  - Renders `MessageList` + `ChatInput`
  - Shows `EmptyConversationState` when no messages
- [ ] Create `features/chat/components/MessageList.tsx`:
  - `overflow-y: auto`, flex column, grow
  - Auto-scroll to bottom on new message
  - Suspend auto-scroll when user scrolls up
  - "↓ Scroll to bottom" button when suspended
- [ ] Create `features/chat/components/MessageBubble.tsx`:
  - User: right-aligned, blue background
  - Assistant: left-aligned, card background
  - `isPartial` badge: "— Generation was stopped"
- [ ] Create `features/chat/components/ChatInput.tsx`:
  - Auto-expanding textarea (max 5 rows)
  - Send button disabled when empty
  - Enter submits, Shift+Enter newlines
- [ ] Create `features/chat/components/EmptyConversationState.tsx`
- [ ] Wire `ChatInput` submit to `POST /chat` (stub response for now)
- [ ] Update URL to `/chat/:conversationId` on first message via `history.replaceState`
- [ ] Invalidate `useConversations` cache after first message (sidebar update)

---

## AI Integration

- [ ] Create `config/openai.config.ts`: `OPENAI_API_KEY`, `OPENAI_MODEL` env vars
- [ ] Create `chat/openai.service.ts`:
  - Initialise `new OpenAI({ apiKey })` client
  - `chatWithTools(messages, tools)` — single completion call, returns full response
  - `streamWithTools(messages, tools, onEvent, abortSignal)` — streaming call
- [ ] Create `chat/constants/sql-tool.constant.ts` — `EXECUTE_SQL_TOOL` OpenAI tool definition
- [ ] Create `chat/constants/system-prompt.constant.ts` — grounding system prompt
- [ ] Create `chat/sql-tool.service.ts`:
  - `validateSql(query: string): void` — throws if invalid
  - `execute(query: string): Promise<{ rows: object[], rowCount: number }>` — runs query
  - Cap results at 100 rows via `LIMIT 100` appended to query
- [ ] Implement full AI cycle in `ChatService.sendMessage()`:
  1. Load conversation history from DB (last 20 messages)
  2. Build `[system, ...history, userMessage]` array
  3. Call `OpenAIService.chatWithTools(messages, [EXECUTE_SQL_TOOL])`
  4. If `tool_call`: validate → execute SQL → append tool result → call OpenAI again
  5. Save user message + tool message + assistant message to DB
  6. Return final text
- [ ] Handle 0-row result: pass empty array, let model say "not available"
- [ ] Handle `SqlValidationError`: return error message, do not call OpenAI
- [ ] Catch all `OpenAI` SDK errors: log and throw `ServiceUnavailableException`
- [ ] Unit test `SqlToolService.validateSql()`: ≥10 test cases
- [ ] Unit test `ChatService.sendMessage()` with mocked dependencies

---

## Streaming — Backend

- [ ] Refactor `ChatController.chat()` to SSE:
  - Set response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`
  - Use `res.write()` directly with `PassThrough` stream
- [ ] Create `writeEvent(res, event)` utility: serialises to `data: {...}\n\n`
- [ ] Refactor `OpenAIService.streamWithTools()`:
  - Accepts `AbortSignal`
  - Calls callback `onDelta(chunk)` for each streamed chunk
  - Accumulates tool call arguments from deltas
  - Fires `onToolCallComplete(toolCall)` when tool call is fully received
  - Fires `onToken(content)` for content deltas
  - Fires `onComplete(usage)` on finish
- [ ] Refactor `ChatService.orchestrateStream(userId, dto, res)`:
  - Create pending `Message` entity → emit `started` with `messageId`
  - On `onToolCallComplete`: validate SQL → execute → emit `tool_start`, `tool_query`, `tool_end`
  - On `onToken`: buffer content → emit `token`
  - On `onComplete`: update message in DB → emit `done` with usage
  - On abort: set `isPartial = true` on message → emit `done` with `isPartial: true`
- [ ] Maintain `Map<messageId, { controller: AbortController, buffer: string }>` in `ChatService`
- [ ] Implement `ChatService.stopStream(userId, dto)`:
  - Verify ownership
  - Call `controller.abort()`
  - Return `{ stopped: true, content: buffer }`
- [ ] Clean up map entry in a `finally` block after stream closes

---

## Streaming — Frontend

- [ ] Create `features/chat/hooks/useStream.ts`:
  - `fetch()` with `ReadableStream` reader
  - `TextDecoder` + chunk accumulator for partial SSE lines
  - Parse `data: {...}\n\n` events
  - Expose `startStream(dto)`, `stopStream()`
- [ ] Create stream state machine reducer (actions: `SEND`, `TOOL_START`, `TOOL_QUERY`, `TOOL_END`, `TOKEN`, `DONE`, `STOP`, `ERROR`)
- [ ] Create `features/chat/hooks/useChat.ts`:
  - Combines `useStream` + state machine
  - Exposes `sendMessage()`, `stopGeneration()`, `streamState`, `currentMessage`
- [ ] Create `features/chat/components/SqlToolBlock.tsx` with 4 visual states
- [ ] Create `features/chat/components/StreamingIndicator.tsx` (`▌` cursor, CSS blink animation)
- [ ] Update `ChatInput`: show Stop `[■]` button in `STREAMING_*` states
- [ ] Wire Stop button to `useChat.stopGeneration()`
- [ ] Implement token buffer: `useRef<string>` + `requestAnimationFrame` flush to state
- [ ] Update `MessageBubble` to render streaming tokens via `MarkdownRenderer`
- [ ] Store `messageId` from `started` event in `useChat` state for stop calls

---

## Usage Limit — Backend

- [ ] Create `config/redis.config.ts`: `REDIS_URL`, `USAGE_BUDGET_USD`, `USAGE_RESET_INTERVAL_SECONDS`
- [ ] Create `usage/` module folder
- [ ] Create `UsageService`:
  - `checkLimit(userId)`: `GET usage:{userId}` → parse float → compare to budget
  - `track(userId, costUsd)`: `INCRBYFLOAT` + conditional `EXPIRE` on new key
  - `getTimeToReset(userId)`: `TTL usage:{userId}` → returns seconds (or 0)
  - `calculateCost(promptTokens, completionTokens, model)`: pricing formula
- [ ] Create `UsageGuard`:
  - `canActivate(context)`: extracts `req.user.id`
  - Calls `UsageService.checkLimit()`
  - If over budget: `throw new HttpException({ statusCode: 429, message: '...', resetIn }, 429)`
- [ ] Apply `UsageGuard` to `POST /chat` (after `JwtAuthGuard`)
- [ ] Call `UsageService.track()` after stream completes (including partial stop)
- [ ] Unit test `UsageService`: under budget → allowed, at budget → rejected, TTL set on first write

---

## Usage Limit — Frontend

- [ ] Handle `429` in `useStream` hook: dispatch `LIMIT_REACHED` action with `resetIn`
- [ ] Create `features/chat/components/UsageLimitBanner.tsx`:
  - Amber/yellow warning bar
  - "Resets in X minutes" countdown using `resetIn`
  - `setInterval` countdown updating every second
  - Dispatches `LIMIT_RESET` action when countdown reaches 0
- [ ] Disable `ChatInput` when stream state is `LIMIT_REACHED`
- [ ] Re-enable `ChatInput` when banner expires

---

## UI Polish — Frontend

### Rendering

- [ ] Create `features/chat/components/MarkdownRenderer.tsx`:
  - Wraps `react-markdown` with `remark-gfm`
  - Custom `code` renderer for syntax highlighting (SQL keyword colours)
  - Custom `table` renderer delegating to `DataTable`
  - Intercept ` ```chart ``` ` code blocks → render `DataChart`
  - No raw HTML pass-through
- [ ] Create `features/chat/components/DataTable.tsx`:
  - Zebra striping
  - Numeric columns right-aligned
  - Horizontal scroll wrapper for wide tables
  - Header row: bold + subtle background
- [ ] Create `features/chat/components/DataChart.tsx`:
  - Parse `chart` code block JSON
  - Render `BarChart` for `type: "bar"`
  - Render `LineChart` for `type: "line"`
  - `ResponsiveContainer` from Recharts
  - Tooltips formatted as `$X.XX billion`
  - Graceful fallback to code block on JSON parse error

### Loading States

- [ ] Create `shared/components/MessageSkeleton.tsx` (2 user + 2 assistant skeleton bubbles)
- [ ] Create `shared/components/ConversationSkeleton.tsx` (3 skeleton sidebar items)
- [ ] Show `ConversationSkeleton` while `useConversations` is loading
- [ ] Show `MessageSkeleton` while `useConversation` is loading

### Error States

- [ ] Create `shared/components/ErrorToast.tsx` (shadcn/ui Toast, auto-dismiss 5s)
- [ ] Show `ErrorToast` on network error during chat
- [ ] Show inline error message in `MessageBubble` when `error` SSE event received
- [ ] "Try Again" button in inline AI error message re-submits the last user message

### UX Details

- [ ] Auto-focus `ChatInput` textarea on page load and conversation switch
- [ ] Update conversation title in sidebar after first `done` event
- [ ] Sort sidebar list by `updatedAt DESC` — active conversation moves to top after each message
- [ ] Relative timestamps in sidebar using `date-fns` (`formatDistanceToNow`)
- [ ] Active conversation: left border accent + background tint
- [ ] Dark mode support using TailwindCSS `dark:` classes and `prefers-color-scheme`
- [ ] "↓ Scroll to bottom" floating button when user scrolls up in `MessageList`
- [ ] `SqlToolBlock`: collapsible SQL query if > 8 lines with "Show full query" toggle

---

## Testing

### Backend Unit Tests (Jest)

- [ ] `AuthService.register()` — success, duplicate email, hash verified
- [ ] `AuthService.login()` — success, wrong password, user not found
- [ ] `SqlToolService.validateSql()` — SELECT (pass), INSERT (reject), UPDATE (reject), DELETE (reject), DROP (reject), multi-statement with `;` (reject)
- [ ] `SqlToolService.execute()` — returns rows, handles empty result
- [ ] `ChatService.sendMessage()` — tool call path (mocked), direct answer path, 0-row path
- [ ] `UsageService.checkLimit()` — under budget, at budget, over budget
- [ ] `UsageService.track()` — new key sets TTL, existing key increments, does not reset TTL
- [ ] `UsageService.calculateCost()` — correct formula for prompt + completion tokens

### Backend Integration Tests (Jest + Supertest)

- [ ] `POST /auth/register` — 201 success, 409 duplicate, 400 invalid email
- [ ] `POST /auth/login` — 200 success, 401 wrong credentials
- [ ] `GET /auth/me` — 200 with token, 401 without token
- [ ] `POST /conversations` — 201 created, 401 unauthenticated
- [ ] `GET /conversations` — 200 returns only current user's data
- [ ] `GET /conversations/:id` — 200 with messages, 403 other user, 404 not found
- [ ] `DELETE /conversations/:id` — 204 success, 403 other user, 404 not found
- [ ] `POST /chat` — 401 unauthenticated, 400 invalid DTO, 403 wrong conversation, 429 over limit
- [ ] `POST /chat/stop` — 200 stopped, 404 no active stream

### Frontend Unit Tests (Vitest)

- [ ] `useStream` hook — parses SSE events correctly
- [ ] Stream state machine reducer — all state transitions
- [ ] `SqlToolService.validateSql()` — coverage for edge cases
- [ ] `DataChart` — renders without crashing on valid JSON, falls back on invalid JSON
- [ ] `MarkdownRenderer` — renders all supported Markdown elements

### E2E Tests (Playwright)

- [ ] **S1** — Register → login → ask valid question → SqlToolBlock visible → streamed answer correct
- [ ] **S2** — Ask about unavailable data → response says "not available" → no numbers fabricated
- [ ] **S3** — Start stream → click Stop → stream halts → partial content shown
- [ ] **S4** — Exceed usage limit → 429 banner appears → input disabled → reset countdown visible
- [ ] **S5** — Send message → hard-refresh → conversation restored → messages in order → no duplicates
- [ ] **S6** — Click delete → confirmation dialog appears → cancel → not deleted → confirm → gone

### Manual Test Checklist

- [ ] Table renders for: "Compare Apple, Google, Microsoft revenue in 2024"
- [ ] Chart renders for: "Show Apple revenue trend 2022 to 2025"
- [ ] Null data handled: "What was Goldman's revenue in 2024?"
- [ ] Negative income handled: "What was Intel's net income in 2024?"
- [ ] Logout clears session and blocks re-entry
- [ ] Multiple conversations: create 3, switch between all, correct messages per conversation
- [ ] Delete last conversation: empty state shown after deletion
- [ ] Long message (> 500 chars): textarea expands, sends correctly
- [ ] Sidebar updates conversation order after each message

---

## Documentation

- [ ] `docs/01_REQUIREMENTS.md` — source of truth
- [ ] `docs/02_PRD.md` ✅
- [ ] `docs/03_ARCHITECTURE.md` ✅
- [ ] `docs/04_SYSTEM_DESIGN.md` ✅
- [ ] `docs/05_DATABASE.md` ✅
- [ ] `docs/06_API_SPEC.md` ✅
- [ ] `docs/07_UI_FLOW.md` ✅
- [ ] `docs/08_IMPLEMENTATION_PLAN.md` ✅
- [ ] `docs/09_TASKS.md` ✅ (this file)
- [ ] `docs/10_AI_RULES.md` ✅
- [ ] `docs/11_TEST_PLAN.md` ✅
- [ ] `docs/CLAUDE.md` ✅
- [ ] `docs/README.md` ✅
- [ ] Inline JSDoc comments on all public service methods
- [ ] `OPENAI_MODEL` default and pricing updated in `.env.example` if model changes

---

## Deployment

### Docker Compose (Dev verification)

- [ ] Verify `compose.yml` runs cleanly from a fresh `docker compose up --build`
- [ ] Verify financial data import works as part of Docker startup
- [ ] Verify `GET /health` returns 200 in Docker environment
- [ ] Test complete user flow in Docker environment

### k3s Deployment

- [ ] Build and push Docker images for `backend` and `frontend` to a registry (or import into k3s via `k3s ctr images import`)
- [ ] Apply namespace: `kubectl apply -f deploy/namespace.yaml`
- [ ] Create real Secret from template: `kubectl create secret generic finchat-secrets -n finchat --from-env-file=.env`
- [ ] Apply ConfigMap: `kubectl apply -f deploy/configmap.yaml`
- [ ] Apply all manifests: `kubectl apply -k deploy/`
- [ ] Verify all pods reach `Running` state: `kubectl get pods -n finchat`
- [ ] Verify PostgreSQL PVC is bound: `kubectl get pvc -n finchat`
- [ ] Import financial data into the PostgreSQL pod: `kubectl exec -n finchat deploy/postgres -- psql -U postgres finchat -f /financial_data.sql`
- [ ] Verify Traefik ingress routes correctly: `curl https://<k3s-host>/api/health`
- [ ] Verify SSE streaming works through Traefik (no buffering)
- [ ] Verify `.env` and real Secrets are not committed to git
- [ ] Verify all environment variables are documented in `.env.example`
- [ ] Verify `npm run build` completes with zero TypeScript errors in `backend/`
- [ ] Verify `npm run build` completes with zero TypeScript errors in `frontend/`
- [ ] Add `README.md` setup instructions tested from a clean machine clone
