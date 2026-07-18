# AI Engineering Rules

**Project:** Financial AI Chat Assistant  
**Version:** 1.0  
**Status:** Active  
**Date:** 2026-07-15

> These rules are permanent instructions for any AI coding session (Claude Code, GitHub Copilot, Cursor, etc.) working on this codebase. Every generated line of code must comply with these rules. Rules take precedence over convenience.

---

## Table of Contents

1. [Fundamental Principles](#1-fundamental-principles)
2. [Architecture Rules](#2-architecture-rules)
3. [Folder Structure](#3-folder-structure)
4. [Naming Conventions](#4-naming-conventions)
5. [TypeScript Rules](#5-typescript-rules)
6. [NestJS Rules](#6-nestjs-rules)
7. [React Rules](#7-react-rules)
8. [AI & SQL Rules](#8-ai--sql-rules)
9. [Error Handling](#9-error-handling)
10. [Logging](#10-logging)
11. [Security Rules](#11-security-rules)
12. [Performance Rules](#12-performance-rules)
13. [Testing Standards](#13-testing-standards)
14. [Code Review Checklist](#14-code-review-checklist)

---

## 1. Fundamental Principles

These are non-negotiable. They apply everywhere, always.

| Rule                                                     | Rationale                                                                               |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Never hallucinate financial data**                     | Every financial figure in the UI comes from PostgreSQL via the SQL tool. No exceptions. |
| **Never bypass the SQL tool**                            | The AI assistant must never answer a financial question from model knowledge.           |
| **Never fabricate a number**                             | If SQL returns 0 rows or a NULL, the response must say so. Never substitute a guess.    |
| **Never implement features outside REQUIREMENTS.md**     | Scope creep produces unmaintainable code and a failing interview submission.            |
| **Never over-engineer**                                  | The simplest correct solution wins. No premature abstraction.                           |
| **Never generate production code during planning phase** | Planning documents must be approved before any implementation begins.                   |
| **Business logic belongs in Services**                   | Controllers are thin. They extract, validate, and delegate — nothing more.              |
| **Favour readability over cleverness**                   | The next engineer reading this code is as important as the compiler.                    |

---

## 2. Architecture Rules

### 2.1 General

- **Layered separation is mandatory.** Every module follows: Controller → Service → Repository/Entity. Never skip a layer and never reverse the direction.
- **No circular dependencies.** If module A needs module B and B needs A, extract the shared logic to a new module C.
- **One module per domain.** `auth`, `chat`, `conversations`, `usage` are the four backend domains. Do not merge them.
- **Shared utilities go in `shared/`.** If a function is used by more than one module, it belongs in a shared location — not duplicated.
- **Configuration is environment-driven.** No hardcoded URLs, ports, keys, or thresholds. All must come from `@nestjs/config` on the backend and Vite env vars on the frontend.

### 2.2 Backend Architecture

- **Controllers handle HTTP only.** Route decoration, DTO extraction, and calling one service method. No `if` statements, no database calls, no business logic.
- **Services own all business logic.** Validation beyond DTO constraints, orchestration, error translation, and response shaping all live in Services.
- **Entities are data shapes only.** TypeORM entities define the DB schema. They must not contain business methods or validation logic.
- **Guards are cross-cutting concerns.** `JwtAuthGuard` and `UsageGuard` apply to routes without modifying the service layer.
- **Never expose raw TypeORM entities in API responses.** Always transform to a DTO before returning. Use `class-transformer` or map manually.

### 2.3 Frontend Architecture

- **Feature-based folder structure is mandatory.** Code for `auth`, `chat`, and `conversations` lives in `src/features/`. Cross-cutting code lives in `src/shared/`.
- **Every feature owns its API calls.** `features/auth/api/auth.api.ts` — not a global `api.ts` dumping ground.
- **No prop drilling beyond two levels.** If a prop passes through more than two component layers, use Context or a query hook.
- **Server state via TanStack Query.** Do not use `useState` to cache API responses. Every server fetch goes through `useQuery` or `useMutation`.
- **Local UI state via `useState` or `useReducer`.** Component-local toggles, form state (via React Hook Form), and modal visibility are not global state.

---

## 3. Folder Structure

### 3.1 Backend

```
backend/src/
├── main.ts                        # Bootstrap only. No logic.
├── app.module.ts                  # Root module. Imports feature modules.
├── config/                        # Configuration factories
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── openai.config.ts
└── modules/
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── dto/
    │   │   ├── register.dto.ts
    │   │   └── login.dto.ts
    │   ├── guards/
    │   │   └── jwt-auth.guard.ts
    │   └── strategies/
    │       └── jwt.strategy.ts
    ├── chat/
    │   ├── chat.module.ts
    │   ├── chat.controller.ts
    │   ├── chat.service.ts
    │   ├── openai.service.ts
    │   ├── sql-tool.service.ts
    │   ├── constants/
    │   │   ├── sql-tool.constant.ts
    │   │   └── system-prompt.constant.ts
    │   └── dto/
    │       ├── send-message.dto.ts
    │       └── stop-generation.dto.ts
    ├── conversations/
    │   ├── conversations.module.ts
    │   ├── conversations.controller.ts
    │   ├── conversations.service.ts
    │   └── dto/
    │       └── create-conversation.dto.ts
    ├── usage/
    │   ├── usage.module.ts
    │   ├── usage.service.ts
    │   └── usage.guard.ts
    └── database/
        ├── database.module.ts
        ├── entities/
        │   ├── user.entity.ts
        │   ├── conversation.entity.ts
        │   ├── message.entity.ts
        │   └── financial-data.entity.ts
        └── migrations/
            └── <timestamp>-<description>.ts
```

### 3.2 Frontend

```
frontend/src/
├── main.tsx                       # React DOM render only.
├── app/
│   ├── App.tsx                    # Router outlet.
│   ├── router.tsx                 # Route definitions.
│   └── providers.tsx              # QueryClient, AuthContext, Toaster.
├── features/
│   ├── auth/
│   │   ├── api/auth.api.ts
│   │   ├── components/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── hooks/useAuth.ts
│   │   ├── AuthContext.tsx
│   │   ├── AuthGuard.tsx
│   │   └── types.ts
│   ├── chat/
│   │   ├── api/chat.api.ts
│   │   ├── components/
│   │   │   ├── ChatPage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── SqlToolBlock.tsx
│   │   │   ├── StreamingIndicator.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── DataChart.tsx
│   │   │   ├── EmptyConversationState.tsx
│   │   │   └── UsageLimitBanner.tsx
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   └── useStream.ts
│   │   └── types.ts
│   └── conversations/
│       ├── api/conversations.api.ts
│       ├── components/
│       │   ├── ConversationSidebar.tsx
│       │   ├── ConversationItem.tsx
│       │   └── DeleteConfirmationDialog.tsx
│       ├── hooks/
│       │   ├── useConversations.ts
│       │   └── useConversation.ts
│       └── types.ts
└── shared/
    ├── components/
    │   ├── AppLayout.tsx
    │   ├── ErrorToast.tsx
    │   ├── MessageSkeleton.tsx
    │   ├── ConversationSkeleton.tsx
    │   └── Spinner.tsx
    ├── hooks/
    │   └── useLocalStorage.ts
    ├── lib/
    │   ├── axios.ts               # Configured Axios instance.
    │   └── queryClient.ts         # TanStack QueryClient instance.
    └── types/
        └── index.ts               # Shared global types.
```

### 3.3 Rules

- **One component per file.** No barrel files that re-export 20 components.
- **No `index.ts` barrel files for components.** Import directly: `import { ChatInput } from '@/features/chat/components/ChatInput'`.
- **`types.ts` per feature.** Each feature has its own type file. Do not add feature-specific types to `shared/types/`.
- **Test files co-located.** `auth.service.spec.ts` lives next to `auth.service.ts`, not in a separate `__tests__/` folder.

---

## 4. Naming Conventions

### 4.1 Files

| Type              | Convention                                 | Example                    |
| ----------------- | ------------------------------------------ | -------------------------- |
| NestJS module     | `kebab-case.module.ts`                     | `chat.module.ts`           |
| NestJS controller | `kebab-case.controller.ts`                 | `auth.controller.ts`       |
| NestJS service    | `kebab-case.service.ts`                    | `sql-tool.service.ts`      |
| NestJS guard      | `kebab-case.guard.ts`                      | `jwt-auth.guard.ts`        |
| NestJS strategy   | `kebab-case.strategy.ts`                   | `jwt.strategy.ts`          |
| TypeORM entity    | `kebab-case.entity.ts`                     | `financial-data.entity.ts` |
| DTO               | `kebab-case.dto.ts`                        | `send-message.dto.ts`      |
| React component   | `PascalCase.tsx`                           | `SqlToolBlock.tsx`         |
| React hook        | `camelCase.ts`                             | `useStream.ts`             |
| API module        | `kebab-case.api.ts`                        | `conversations.api.ts`     |
| Type file         | `types.ts` per feature                     | `features/chat/types.ts`   |
| Test file         | `*.spec.ts` (unit) / `*.e2e-spec.ts` (E2E) | `auth.service.spec.ts`     |

### 4.2 Variables & Functions

| Type                   | Convention                             | Example                                   |
| ---------------------- | -------------------------------------- | ----------------------------------------- |
| Variables              | `camelCase`                            | `conversationId`, `accessToken`           |
| Constants              | `UPPER_SNAKE_CASE`                     | `SYSTEM_PROMPT`, `EXECUTE_SQL_TOOL`       |
| Functions / methods    | `camelCase`, verb-first                | `validateSql()`, `findConversation()`     |
| Boolean variables      | `is` / `has` / `can` prefix            | `isPartial`, `hasError`, `canRetry`       |
| Event handlers (React) | `handle` prefix                        | `handleSubmit`, `handleDelete`            |
| Async functions        | No `async` suffix — just be consistent | `sendMessage()`, not `sendMessageAsync()` |

### 4.3 Types & Interfaces

| Type                    | Convention                                        | Example                              |
| ----------------------- | ------------------------------------------------- | ------------------------------------ |
| TypeScript interfaces   | `PascalCase`                                      | `MessageDto`, `StreamEvent`          |
| TypeScript type aliases | `PascalCase`                                      | `MessageRole`, `StreamState`         |
| Enums                   | `PascalCase` (name) + `UPPER_SNAKE_CASE` (values) | `enum MessageRole { USER = 'user' }` |
| Generic type params     | Single capital or descriptive                     | `T`, `TEntity`, `TResult`            |

### 4.4 Database

| Type            | Convention                     | Example                               |
| --------------- | ------------------------------ | ------------------------------------- |
| Table names     | `snake_case`, plural           | `users`, `conversations`, `messages`  |
| Column names    | `snake_case`                   | `user_id`, `created_at`, `is_partial` |
| Index names     | `idx_{table}_{columns}`        | `idx_messages_conversation_id`        |
| Migration files | `{timestamp}-{description}.ts` | `1720000000000-create-users.ts`       |

### 4.5 API

| Type             | Convention                     | Example                                           |
| ---------------- | ------------------------------ | ------------------------------------------------- |
| URL paths        | `kebab-case`, plural resources | `/conversations`, `/auth/register`                |
| Query parameters | `camelCase`                    | `?limit=20&offset=0`                              |
| JSON body fields | `camelCase`                    | `{ "conversationId": "...", "message": "..." }`   |
| HTTP verbs       | Use semantically correct verbs | `POST` (create), `GET` (read), `DELETE` (destroy) |

---

## 5. TypeScript Rules

- **`strict: true` is mandatory.** Enable in both `backend/tsconfig.json` and `frontend/tsconfig.json`. Never disable it.
- **No `any`.** Using `any` is a bug waiting to happen. Use `unknown` and narrow with type guards, or define the correct type.
- **No `as` type assertions except at system boundaries.** Casting with `as` suppresses type errors. Only use it when receiving untyped external data (e.g., parsing JSON from OpenAI response) — and immediately validate the shape.
- **No non-null assertions (`!`) unless the null case is provably impossible.** If it could be null, handle it.
- **Prefer `interface` for object shapes, `type` for unions and aliases.** This is convention; be consistent within the project.
- **Return types on all public service methods.** The compiler should not have to infer what a service method returns.
- **Avoid `Promise<any>`.** Always type the resolved value.
- **Use `readonly` on properties that should not be mutated after construction.**
- **Use `const` over `let` everywhere possible.** Only use `let` if the variable must be reassigned.
- **No unused variables or imports.** Enable `noUnusedLocals` and `noUnusedParameters` in `tsconfig.json`.

```typescript
// ❌ Wrong
async function getUser(id: any): Promise<any> {
  return repo.findOne(id as string)
}

// ✅ Correct
async function getUser(id: string): Promise<UserDto> {
  const user = await repo.findOne({ where: { id } })
  if (!user) throw new NotFoundException("User not found")
  return toUserDto(user)
}
```

---

## 6. NestJS Rules

### 6.1 Controllers

- Controllers must be **thin**. The maximum allowed logic in a controller method is:
  1. Destructure `@Request()`, `@Body()`, `@Param()`, `@Query()`
  2. Call **one** service method
  3. Return the result
- Never put `if` statements, database calls, or business logic in a controller.
- Always use `@UseGuards(JwtAuthGuard)` on any route that requires authentication. Never check the token manually.

```typescript
// ❌ Wrong
@Post()
async create(@Body() dto: CreateConversationDto, @Request() req) {
  const existing = await this.repo.find({ where: { userId: req.user.id } });
  if (existing.length >= 100) throw new BadRequestException('Too many conversations');
  return this.conversationsService.create(req.user.id, dto);
}

// ✅ Correct
@Post()
async create(@Body() dto: CreateConversationDto, @Request() req) {
  return this.conversationsService.create(req.user.id, dto);
}
// The limit check belongs in ConversationsService.create()
```

### 6.2 Services

- Services are the **only** place for business logic.
- Services must throw NestJS-typed exceptions (`NotFoundException`, `ForbiddenException`, `ConflictException`) — not raw `Error`.
- Services must validate all input assumptions beyond what DTOs provide.
- Services must never return raw TypeORM entities. Map to a DTO first.

### 6.3 DTOs

- Every incoming request body must have a DTO.
- Every DTO must be decorated with `class-validator` decorators.
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` must be enabled in `main.ts`.
- DTOs are **not** TypeORM entities. Never mix them.

### 6.4 Dependency Injection

- Never instantiate services with `new` inside other services or controllers. Use NestJS DI.
- Never use `module.get()` to fetch services at runtime unless in a bootstrap script.

### 6.5 Modules

- Every module is `@Module({ imports, controllers, providers, exports })` — be explicit.
- Only export what other modules need. Internal services stay private.
- Use `@Global()` sparingly — only for truly cross-cutting providers (e.g., `ConfigModule`).

---

## 7. React Rules

### 7.1 Components

- **One component per file.** Never define two exported components in the same file.
- **Components are pure renderers.** Logic lives in hooks. If a component has more than 10 lines of non-JSX logic, extract it to a custom hook.
- **Props interfaces are always named.** Never use inline `{ prop: type }` as a prop type for a named component.
- **No prop spreading on HTML elements** (`<div {...props}>`). Spread to component wrappers is acceptable.
- **All lists require a stable `key` prop.** Never use array index as a key for a list that can be reordered or filtered.

```typescript
// ❌ Wrong
export function MessageList({ messages }: { messages: Message[] }) {
  return messages.map((m, i) => <MessageBubble key={i} message={m} />);
}

// ✅ Correct
interface MessageListProps {
  messages: Message[];
}
export function MessageList({ messages }: MessageListProps) {
  return messages.map((m) => <MessageBubble key={m.id} message={m} />);
}
```

### 7.2 Hooks

- **Custom hooks start with `use`.** Always.
- **Hooks must not be called conditionally.** Follow the Rules of Hooks strictly.
- **`useEffect` dependencies must be complete.** Never suppress exhaustive-deps warnings.
- **Side effects belong in `useEffect` or event handlers.** Never trigger side effects during render.
- **`useRef` for values that should not trigger re-renders** (e.g., the streaming token buffer).

### 7.3 State Management

- **Server state → TanStack Query.** Conversations list, conversation messages, user profile.
- **Global UI state → React Context.** Auth state (token + user).
- **Form state → React Hook Form.** Login, register.
- **Component UI state → `useState`.** Modal open/close, sidebar toggle.
- **Streaming buffer → `useRef`.** Token accumulation must not trigger per-token re-renders.
- **Never store derived data in state.** If a value can be computed from existing state or props, compute it — don't store it.

### 7.4 Async & Data Fetching

- **Every `useQuery` must handle loading and error states.** No bare data renders without checking `isLoading` and `isError`.
- **Optimistic updates must be rolled back on error.** When optimistically adding a user message, `onError` must remove it.
- **Query keys must be arrays and consistently structured.** `['conversation', id]` not `'conversation' + id`.
- **Invalidate queries after mutations.** After sending a message, invalidate `['conversations']` so the sidebar updates.

### 7.5 Forms

- **All forms use React Hook Form with a Zod schema.** No uncontrolled inputs without React Hook Form.
- **Validation errors display inline below the field.** Not in a toast, not in an alert.
- **Submit buttons show a loading state** and are disabled during submission.
- **Never clear a form on a failed submission.** Preserve user input so they can correct and retry.

---

## 8. AI & SQL Rules

These rules govern all interactions between the NestJS backend and the OpenAI API, and the SQL tool execution layer.

### 8.1 SQL Execution Rules

- **Only `SELECT` statements are permitted.** `SqlToolService.validateSql()` must reject any query that is not a SELECT.
- **Validation is non-negotiable.** Never execute a query received from the LLM without first validating it.
- **No multi-statement queries.** Reject any query containing a semicolon within the body.
- **Results are always capped.** Every execution appends `LIMIT 100` if not already present, or explicitly checks the LIMIT value.
- **The LLM never accesses application tables.** Queries touching `users`, `conversations`, or `messages` must be rejected. Only `financial_data` is permitted.
- **NULL is not zero.** `SqlToolService` must return NULL values as-is. Never coerce NULL to 0.

```typescript
// ❌ Wrong
async execute(query: string) {
  return this.dataSource.query(query); // No validation
}

// ✅ Correct
async execute(query: string): Promise<SqlResult> {
  this.validateSql(query);               // Throws on invalid
  const safeQuery = this.appendLimit(query, 100);
  const rows = await this.dataSource.query(safeQuery);
  return { rows, rowCount: rows.length };
}
```

### 8.2 System Prompt Rules

- **The system prompt is a constant.** It lives in `constants/system-prompt.constant.ts`. It must never be constructed dynamically using user input.
- **The system prompt is always the first message.** Never omit it from the messages array sent to OpenAI.
- **The system prompt instructs the model to always use the SQL tool.** The model must never answer a financial question without executing a query.
- **The system prompt communicates data boundaries.** It must state the available companies, years, and what to do when data is unavailable.

### 8.3 Conversation History Rules

- **History is capped at the last 20 messages.** Sending the full history of a long conversation will exceed the context window. The cap is configurable via `OPENAI_MAX_HISTORY_MESSAGES` env var.
- **Tool messages are included in history.** When reconstructing history from the database, include `role: 'tool'` messages so the model understands the context of previous tool calls.
- **Never send raw database row data as part of the user message.** Financial data enters the conversation only via the tool result message.

### 8.4 OpenAI API Rules

- **The API key lives in `OPENAI_API_KEY` env var.** Never hardcode it.
- **The model is configurable.** `OPENAI_MODEL` env var, defaulting to `gpt-4o`.
- **All OpenAI SDK calls are wrapped in try/catch.** SDK errors must be caught and translated to `ServiceUnavailableException`.
- **Token usage from every response must be stored.** The `usage` object from the completion response is saved to `messages.tokensUsed` for auditability.
- **AbortController is used for stop generation.** Never kill the process or close the connection abruptly.

---

## 9. Error Handling

### 9.1 Backend Error Handling

- **Use NestJS exception classes.** Always throw `NotFoundException`, `ForbiddenException`, `UnauthorizedException`, `ConflictException`, `BadRequestException`, or `HttpException` — never raw `Error`.
- **Never let errors bubble to the HTTP layer with internal details.** Use the NestJS global exception filter (built-in) which strips stack traces in production.
- **All async service methods must have try/catch** for external calls (OpenAI, Redis, PostgreSQL). Catch, log, and re-throw as a typed NestJS exception.
- **Distinguish 403 from 404.** When a user requests a resource that exists but belongs to another user, return `403 Forbidden`, not `404 Not Found`. Never reveal that the resource exists via a 404 to the wrong user.
- **Never swallow errors silently.** If you catch an error and do not rethrow, you must at minimum log it.

```typescript
// ❌ Wrong
async findOne(userId: string, id: string) {
  try {
    return await this.repo.findOne({ where: { id } });
  } catch (e) {
    return null; // Silent swallow
  }
}

// ✅ Correct
async findOne(userId: string, id: string): Promise<ConversationWithMessagesDto> {
  const conversation = await this.repo.findOne({ where: { id } });
  if (!conversation) throw new NotFoundException('Conversation not found');
  if (conversation.userId !== userId) throw new ForbiddenException();
  return toConversationDto(conversation);
}
```

### 9.2 Frontend Error Handling

- **Every `useQuery` and `useMutation` has an `onError` handler.** Never leave error states unhandled.
- **Network errors show a toast.** Unexpected fetch failures display a non-blocking error toast.
- **AI service errors render inline.** Errors from the SSE stream render inside the assistant message bubble, not as a toast.
- **Form errors are inline.** Validation errors appear below the relevant field.
- **Never display raw error messages from the server to the user.** Display a human-readable message. Log the technical detail to the console.
- **The `error` SSE event must always unlock the chat input.** The user should never be stuck with a disabled input after an error.

---

## 10. Logging

### 10.1 Backend Logging

- **Use NestJS built-in `Logger`.** Never use `console.log` in production code. Instantiate: `private readonly logger = new Logger(ServiceName.name)`.
- **Log at the correct level:**
  - `logger.log()` — normal operations (request received, service started)
  - `logger.warn()` — unexpected but recoverable (OpenAI returned no tool call when one was expected)
  - `logger.error()` — failures that need attention (database connection failed, OpenAI API error)
  - `logger.debug()` — detailed diagnostic info (SQL query being executed — only in development)
- **Never log sensitive data.** No passwords, JWT tokens, API keys, or user emails in log messages.
- **Log the SQL query before execution** at `debug` level (not `log` — it would be excessive in production).
- **Log OpenAI API errors** with the status code and message (not the full response body).

```typescript
// ✅ Correct
this.logger.debug(`Executing SQL: ${query}`)
this.logger.log(
  `Stream completed for messageId=${messageId}, tokens=${usage.totalTokens}`,
)
this.logger.error(`OpenAI API error: ${error.status} ${error.message}`)
```

### 10.2 Frontend Logging

- **No `console.log` in committed code.** Use `console.error` only for genuinely unexpected errors.
- **Log stream parse errors to `console.error`.** If an SSE line cannot be parsed, log the raw line for debugging.
- **No logging of auth tokens or user data.**

---

## 11. Security Rules

### 11.1 Authentication & Authorisation

- **All protected routes use `JwtAuthGuard`.** No manual token parsing in controllers or services.
- **User isolation is enforced at the query level.** Every database query involving user data includes `WHERE user_id = :userId`. Never fetch all records and filter in JavaScript.
- **Passwords are hashed with Argon2id (`@node-rs/argon2`).** Never store plaintext passwords. Never log passwords. Node.js v26 does not natively support Argon2 — the `@node-rs/argon2` library is required (Rust-based, no node-gyp, Docker-friendly).
- **JWT secrets must be ≥ 32 characters.** Enforce in configuration validation.
- **Identical error messages for user not found and wrong password.** Prevent user enumeration.

### 11.2 SQL Injection Prevention

- **The AI-generated SQL is validated before execution.** `SqlToolService.validateSql()` is always called first.
- **Never use string concatenation to build SQL.** All dynamic values use parameterized queries.
- **The `financial_data` query is restricted to SELECT.** Even if an attacker manipulates the LLM prompt, the validation layer rejects DML and DDL.
- **Table name is not dynamic.** The system prompt instructs the model to query `financial_data` specifically. No dynamic table name injection is possible.

### 11.3 Input Validation

- **Every API input is validated via `class-validator` DTOs.** `ValidationPipe` with `whitelist: true` strips extra fields.
- **Message length is capped at 4000 characters.** Prevent prompt injection via oversized inputs.
- **UUIDs are validated with `@IsUUID()`.** Never pass raw path params to database queries.
- **CORS is restricted to the known frontend origin.** No wildcard `*` in production.

### 11.4 Secrets & Configuration

- **No secrets in code.** API keys, JWT secrets, database passwords, and Redis URLs are in `.env` only.
- **`.env` is git-ignored.** Verify this in the first commit.
- **`.env.example` contains only placeholder values**, never real secrets.
- **Production environment uses different secrets** from development.

### 11.5 HTTP Security

- **Never return stack traces in production API responses.** NestJS's default exception filter handles this.
- **SSE endpoint headers include `X-Accel-Buffering: no`** to prevent nginx from buffering the stream.
- **No sensitive data in URL query parameters.** Tokens travel in the `Authorization` header only.

---

## 12. Performance Rules

### 12.1 Database

- **All common query patterns have indexes.** The `(company, year)` composite index must exist before any financial queries run.
- **Eager loading is only used when the data is always needed.** Load messages only when `GET /conversations/:id` is called, not when listing conversations.
- **Pagination is mandatory** on `GET /conversations`. Never return an unbounded result set.
- **Query at most the last 20 messages** when building the OpenAI context array. Do not load the full conversation history.

### 12.2 Streaming

- **Token buffer uses `useRef`, not `useState`.** Accumulate tokens in a ref and flush to state at ~60fps via `requestAnimationFrame`. This prevents per-token re-renders.
- **The SSE response is flushed immediately on each write.** Call `res.flushHeaders()` and avoid any response buffering middleware.
- **AbortController is used to cancel OpenAI requests.** Never wait for an OpenAI request to complete if the user has stopped the stream.

### 12.3 Frontend

- **TanStack Query caches conversation data.** Do not refetch a conversation the user already has locally unless they navigate away and back.
- **React Query `staleTime` for conversation list: 30 seconds.** The sidebar does not need to refetch on every window focus.
- **Images and icons use `lucide-react` (tree-shaken).** Do not import the entire icon set.
- **Recharts `ResponsiveContainer` wraps all charts.** Never set fixed pixel widths on chart containers.

---

## 13. Testing Standards

### 13.1 What to Test

- **Services: test all business logic paths.** Happy path, error path, and edge cases.
- **SqlToolService: test every validation rule** with a dedicated test case (SELECT pass, INSERT reject, etc.).
- **UsageService: test the TTL logic explicitly.** Verify that the first write sets the TTL and subsequent writes do not reset it.
- **ChatService: test with mocked OpenAI and mocked SqlToolService.** Never make real API calls in unit tests.
- **E2E tests cover all 6 baseline scenarios (S1–S6).**

### 13.2 What NOT to Test

- **Do not test framework behaviour.** Do not test that `ValidationPipe` rejects invalid DTOs — that is NestJS's responsibility.
- **Do not test TypeORM.** Do not test that `repo.save()` persists to the database — that is TypeORM's responsibility.
- **Do not test trivial getters** that simply return a field.

### 13.3 Test Structure

- **Arrange / Act / Assert pattern** in every test.
- **One assertion per test** (where practical). A test named "should return user" should not also test that it throws on error.
- **Mock external dependencies** (`OpenAI`, `Redis`, `TypeORM repositories`) via Jest's `jest.fn()` or `jest.spyOn()`.
- **Test file naming: `*.spec.ts` for unit, `*.e2e-spec.ts` for E2E.** Co-located with the file under test.
- **`describe` blocks map to the class or function under test.** Nested `describe` blocks for method names.

```typescript
// ✅ Correct structure
describe('SqlToolService', () => {
  describe('validateSql', () => {
    it('should accept a valid SELECT query', () => { ... });
    it('should reject INSERT statements', () => { ... });
    it('should reject DROP TABLE statements', () => { ... });
    it('should reject multi-statement queries with semicolons', () => { ... });
  });
});
```

### 13.4 Test Coverage Targets

| Module                 | Minimum Coverage |
| ---------------------- | ---------------- |
| `ChatService`          | 80%              |
| `SqlToolService`       | 90%              |
| `UsageService`         | 85%              |
| `AuthService`          | 80%              |
| `ConversationsService` | 75%              |

---

## 14. Code Review Checklist

Before marking any implementation task as complete, verify:

### Architecture

- [ ] No business logic in controllers
- [ ] No database calls from outside services
- [ ] No cross-module imports that bypass DI
- [ ] No hardcoded configuration values

### AI Safety

- [ ] `SqlToolService.validateSql()` is called before every SQL execution
- [ ] System prompt is present in every OpenAI call
- [ ] 0-row SQL result does not produce a fabricated answer
- [ ] NULL metric is not reported as zero

### TypeScript

- [ ] No `any` type used
- [ ] No `as` assertions except at validated external boundaries
- [ ] No unused variables or imports
- [ ] All public service methods have explicit return types

### Security

- [ ] All protected routes have `@UseGuards(JwtAuthGuard)`
- [ ] All user-scoped queries include `WHERE user_id = req.user.id`
- [ ] No secrets in code or committed `.env`
- [ ] 403 returned (not 404) for cross-user resource access

### Frontend

- [ ] No list rendered without stable `key` props
- [ ] All `useQuery` calls handle `isLoading` and `isError`
- [ ] No raw server error message shown to the user
- [ ] Streaming token buffer uses `useRef`, not `useState`

### Testing

- [ ] New service methods have unit tests
- [ ] New API endpoints have integration tests
- [ ] No real API calls (OpenAI, Redis) in unit tests
- [ ] All 6 E2E scenarios still pass after changes

### General

- [ ] No `console.log` in committed code
- [ ] No TODO comments in committed code (open a task instead)
- [ ] TypeScript compiles with `strict: true`, zero errors
- [ ] `docker compose up --build` starts cleanly
