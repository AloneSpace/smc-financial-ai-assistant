# Architecture Document

**Project:** Financial AI Chat Assistant  
**Version:** 1.0  
**Status:** Planning  
**Date:** 2026-07-14

---

## Table of Contents

1. [Overall Architecture](#1-overall-architecture)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Layer](#4-database-layer)
5. [Redis Layer](#5-redis-layer)
6. [AI Layer](#6-ai-layer)
7. [Authentication Architecture](#7-authentication-architecture)
8. [Streaming Architecture](#8-streaming-architecture)
9. [SQL Tool Calling Architecture](#9-sql-tool-calling-architecture)
10. [Technology Justifications](#10-technology-justifications)

---

## 1. Overall Architecture

The application follows a **three-tier architecture** with a clear separation between presentation, application logic, and data persistence.

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER CLIENT                       │
│              React + TypeScript + Vite                   │
│           shadcn/ui  │  TailwindCSS  │  Recharts         │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP / SSE
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    NESTJS BACKEND                        │
│                                                          │
│   Auth Module │ Chat Module │ Conversation Module        │
│                                                          │
│        Guards │ Interceptors │ Pipes │ DTOs              │
└───────┬──────────────┬─────────────────┬────────────────┘
        │              │                 │
   ┌────▼────┐   ┌─────▼─────┐   ┌──────▼──────┐
   │PostgreSQL│   │   Redis   │   │  OpenAI API │
   │          │   │           │   │             │
   │ users    │   │ usage     │   │ Tool Calling│
   │ convos   │   │ tracking  │   │ Streaming   │
   │ messages │   │           │   │             │
   │ fin_data │   └───────────┘   └─────────────┘
   └──────────┘
```

### Architectural Principles

| Principle                  | Application                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Separation of Concerns** | Controllers handle HTTP, Services contain business logic, Repositories manage data access                            |
| **SQL Grounding**          | The AI layer is never allowed to answer from model knowledge; every financial fact must flow through the SQL tool    |
| **Streaming-First**        | The primary communication channel for AI responses is SSE (Server-Sent Events), not REST responses                   |
| **Defence in Depth**       | SQL injection prevention at the tool execution layer; JWT auth at the guard layer; user isolation at the query layer |
| **Feature-Based Modules**  | NestJS modules and React feature folders reflect domain boundaries, not technical layers                             |

---

## 2. Frontend Architecture

### 2.1 Technology Choices

| Technology          | Version     | Purpose                                              |
| ------------------- | ----------- | ---------------------------------------------------- |
| React               | 18+         | Component model and rendering                        |
| TypeScript          | 5+ (strict) | Type safety across the entire codebase               |
| Vite                | 5+          | Build tooling and dev server (HMR)                   |
| shadcn/ui           | Latest      | Accessible, unstyled-base component library          |
| TailwindCSS         | 3+          | Utility-first styling                                |
| TanStack Query      | v5          | Server state management, caching, background refetch |
| React Hook Form     | v7          | Form state management                                |
| Zod                 | v3          | Schema validation for forms and API responses        |
| Recharts            | v2          | Chart rendering (BarChart, LineChart)                |
| react-markdown      | v9          | Markdown rendering in chat messages                  |
| EventSource / fetch | native      | SSE streaming from backend                           |

### 2.2 Folder Structure

```
frontend/
├── src/
│   ├── app/                    # App entrypoint, router, providers
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── features/               # Domain-driven feature folders
│   │   ├── auth/               # Login, Register, auth state
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   └── types.ts
│   │   ├── chat/               # Chat input, message list, streaming
│   │   │   ├── components/
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── SqlToolBlock.tsx
│   │   │   │   ├── StreamingIndicator.tsx
│   │   │   │   ├── MarkdownRenderer.tsx
│   │   │   │   ├── DataTable.tsx
│   │   │   │   └── DataChart.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useChat.ts
│   │   │   │   └── useStream.ts
│   │   │   ├── api/
│   │   │   └── types.ts
│   │   └── conversations/      # Sidebar, conversation list, delete
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── api/
│   │       └── types.ts
│   ├── shared/                 # Cross-feature shared code
│   │   ├── components/         # Button, Modal, Spinner, etc.
│   │   ├── hooks/              # useLocalStorage, useDebounce
│   │   ├── lib/                # axios instance, queryClient
│   │   └── types/              # Global TypeScript types
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### 2.3 State Management Strategy

| State Type                             | Solution                     | Reason                                                           |
| -------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| Server state (conversations, messages) | TanStack Query               | Automatic caching, refetch, optimistic updates                   |
| Auth state (user, token)               | React Context + localStorage | Simple, global, persisted                                        |
| Form state (login, register)           | React Hook Form              | Performant, minimal re-renders                                   |
| Streaming buffer state                 | `useRef` + `useState`        | Streaming tokens appended imperatively to avoid re-render storms |
| UI state (sidebar open, modal)         | Local `useState`             | Component-local, no global state needed                          |

### 2.4 Streaming Client Architecture

The frontend receives a stream via the Fetch API with `ReadableStream`, not the EventSource API, because it needs to send an auth header (EventSource does not support custom headers).

```
useStream hook
├── fetch(POST /chat, { body, headers: { Authorization } })
├── response.body.getReader()
├── while (true)
│   ├── reader.read() → { done, value }
│   ├── decode Uint8Array → string
│   ├── parse SSE lines ("data: {...}\n\n")
│   └── dispatch event type:
│       ├── "token"      → append to message buffer
│       ├── "tool_start" → show SqlToolBlock (executing)
│       ├── "tool_query" → show SQL in SqlToolBlock
│       ├── "tool_end"   → show SqlToolBlock (completed)
│       ├── "done"       → finalise message, save to query cache
│       └── "error"      → show error state
```

---

## 3. Backend Architecture

### 3.1 Technology Choices

| Technology        | Version     | Purpose                                           |
| ----------------- | ----------- | ------------------------------------------------- |
| NestJS            | v10         | Modular Node.js framework with DI container       |
| TypeScript        | 5+ (strict) | Type safety throughout                            |
| TypeORM           | v0.3        | ORM for PostgreSQL with entity/repository pattern |
| @nestjs/jwt       | Latest      | JWT generation and validation                     |
| @nestjs/passport  | Latest      | Auth strategy abstraction                         |
| argon2            | Latest      | Password hashing                                  |
| class-validator   | Latest      | DTO input validation                              |
| class-transformer | Latest      | DTO serialisation/deserialisation                 |
| ioredis           | Latest      | Redis client with TTL and atomic operations       |
| openai (Node SDK) | v4          | OpenAI API client with streaming and tool calling |

### 3.2 NestJS Module Structure

```
backend/
└── src/
    ├── main.ts                 # Bootstrap, CORS, validation pipe
    ├── app.module.ts           # Root module
    │
    ├── modules/
    │   ├── auth/               # Authentication module
    │   │   ├── auth.module.ts
    │   │   ├── auth.controller.ts     # POST /auth/register, /login, GET /me
    │   │   ├── auth.service.ts        # register, login, validateUser
    │   │   ├── strategies/
    │   │   │   └── jwt.strategy.ts    # Passport JWT strategy
    │   │   ├── guards/
    │   │   │   └── jwt-auth.guard.ts
    │   │   └── dto/
    │   │       ├── register.dto.ts
    │   │       └── login.dto.ts
    │   │
    │   ├── chat/               # Chat + AI orchestration module
    │   │   ├── chat.module.ts
    │   │   ├── chat.controller.ts     # POST /chat, POST /chat/stop
    │   │   ├── chat.service.ts        # orchestrateChatStream()
    │   │   ├── openai.service.ts      # OpenAI SDK wrapper
    │   │   ├── sql-tool.service.ts    # execute_sql tool handler
    │   │   └── dto/
    │   │       ├── send-message.dto.ts
    │   │       └── stop-generation.dto.ts
    │   │
    │   ├── conversations/      # Conversation management module
    │   │   ├── conversations.module.ts
    │   │   ├── conversations.controller.ts  # GET, DELETE /conversations
    │   │   ├── conversations.service.ts
    │   │   └── dto/
    │   │
    │   ├── usage/              # Usage limit module
    │   │   ├── usage.module.ts
    │   │   ├── usage.service.ts       # trackUsage, checkLimit, resetUsage
    │   │   └── usage.guard.ts         # Pre-request spending check
    │   │
    │   └── database/           # Database entities and migrations
    │       ├── entities/
    │       │   ├── user.entity.ts
    │       │   ├── conversation.entity.ts
    │       │   ├── message.entity.ts
    │       │   └── financial-data.entity.ts
    │       └── migrations/
    │
    └── config/                 # Configuration (env vars)
        ├── database.config.ts
        ├── redis.config.ts
        └── openai.config.ts
```

### 3.3 Request Lifecycle

```
HTTP Request
    → NestJS Router
    → JwtAuthGuard       (validates Bearer token)
    → UsageGuard         (checks Redis spend limit)
    → ValidationPipe     (validates DTO via class-validator)
    → Controller         (thin: extracts params, calls service)
    → Service            (business logic)
    → Repository/ORM     (data access)
    → Response / SSE Stream
```

### 3.4 Controller Design Rule

Controllers contain **zero** business logic. Their only responsibilities are:

1. Extract and type-cast request parameters
2. Call the appropriate service method
3. Return the service result or pipe the SSE stream

```typescript
// Example: thin controller
@Post()
async sendMessage(
  @Request() req,
  @Body() dto: SendMessageDto,
  @Res() res: Response,
) {
  return this.chatService.streamResponse(req.user.id, dto, res);
}
```

---

## 4. Database Layer

### 4.1 PostgreSQL Role

PostgreSQL serves as the **single source of truth** for:

1. **Financial data** — the provided `financial_data` table (read-only by the AI tool)
2. **Application data** — users, conversations, messages

### 4.2 Entity Model

```
users
├── id            UUID PK
├── email         VARCHAR UNIQUE
├── passwordHash  VARCHAR
├── createdAt     TIMESTAMP

conversations
├── id            UUID PK
├── userId        UUID FK → users.id
├── title         VARCHAR
├── createdAt     TIMESTAMP
├── updatedAt     TIMESTAMP

messages
├── id            UUID PK
├── conversationId UUID FK → conversations.id
├── role          ENUM('user', 'assistant', 'tool')
├── content       TEXT
├── toolName      VARCHAR NULL
├── toolInput     JSONB NULL
├── toolOutput    JSONB NULL
├── tokensUsed    INTEGER NULL
├── createdAt     TIMESTAMP

financial_data
├── company       VARCHAR
├── ticker        VARCHAR
├── sector        VARCHAR
├── year          INTEGER
├── revenue       BIGINT NULL
├── net_income    BIGINT NULL
├── operating_income BIGINT NULL
├── gross_profit  BIGINT NULL
```

### 4.3 Access Pattern

| Actor            | Access Level                                      | Enforcement                        |
| ---------------- | ------------------------------------------------- | ---------------------------------- |
| AI SQL Tool      | `SELECT` on `financial_data` only                 | SQL validation in `SqlToolService` |
| Backend Services | Full CRUD on `users`, `conversations`, `messages` | TypeORM repositories               |
| Frontend         | No direct database access                         | All access via authenticated API   |

---

## 5. Redis Layer

### 5.1 Purpose

Redis is used exclusively for **usage limit tracking**. It is not used as a primary data store.

### 5.2 Data Structure

Each user's spending is tracked with a single Redis key:

```
Key:   usage:{userId}
Value: string (float, e.g. "0.00482")
TTL:   3600 seconds (1 hour, configurable)
```

### 5.3 Usage Operations

| Operation            | Redis Command                       | When                                              |
| -------------------- | ----------------------------------- | ------------------------------------------------- |
| Check limit          | `GET usage:{userId}`                | Before processing each chat request (UsageGuard)  |
| Increment usage      | `INCRBYFLOAT usage:{userId} {cost}` | After chat completion (including partial/stopped) |
| Set TTL on first use | `EXPIRE usage:{userId} 3600`        | Only when key is first created (auto-reset)       |
| Reset manually       | `DEL usage:{userId}`                | Not exposed in MVP; handled by TTL expiry         |

### 5.4 Cost Calculation

OpenAI pricing is calculated from token counts returned in the API response:

```
cost = (promptTokens / 1_000_000 * inputPricePerMToken)
     + (completionTokens / 1_000_000 * outputPricePerMToken)
```

Token counts are tracked per message in the `messages.tokensUsed` column for auditability.

---

## 6. AI Layer

### 6.1 Design Principle: Grounding by Constraint

The AI layer is designed so that hallucination is **architecturally impossible**, not merely discouraged:

1. The system prompt instructs the model to always call `execute_sql` before answering any financial question
2. The tool is the **only** way to retrieve financial data
3. The backend validates the SQL is a `SELECT`-only statement before execution
4. If the SQL returns no rows, the model is instructed to say the data is unavailable

### 6.2 System Prompt Design

The system prompt enforces three rules:

```
You are a financial data assistant. You answer questions about the financial
performance of US public companies.

Rules:
1. You MUST call the execute_sql tool for every financial question.
   Never answer from your training knowledge.
2. If the SQL query returns no rows, respond:
   "The requested data is not available in the database."
3. Never fabricate, estimate, or infer financial figures.

Available data: financial_data table with columns:
  company, ticker, sector, year, revenue, net_income,
  operating_income, gross_profit

Data covers approximately 49 companies from 2022 to 2025.
```

### 6.3 Tool Definition

```json
{
  "type": "function",
  "function": {
    "name": "execute_sql",
    "description": "Execute a SELECT SQL query against the financial_data table to retrieve financial information about US public companies.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "A valid PostgreSQL SELECT query against the financial_data table."
        }
      },
      "required": ["query"]
    }
  }
}
```

### 6.4 OpenAI Call Sequence

```
1. Build messages array:
   [system_prompt, ...conversation_history, new_user_message]

2. Call OpenAI (stream: true, tools: [execute_sql], tool_choice: "auto"):
   → Stream tool_call chunk if model calls execute_sql

3. On tool_call received:
   a. Emit SSE: { type: "tool_start" }
   b. Emit SSE: { type: "tool_query", query: "SELECT ..." }
   c. Validate SQL (SELECT only, no DROP/INSERT/UPDATE/DELETE)
   d. Execute on PostgreSQL
   e. Emit SSE: { type: "tool_end", rowCount: N }
   f. Append tool result to messages array

4. Call OpenAI again (stream: true, no tools) with tool result:
   → Stream final answer tokens

5. On each token:
   → Emit SSE: { type: "token", content: "..." }

6. On completion:
   → Emit SSE: { type: "done", usage: { promptTokens, completionTokens } }
   → Persist message + usage to PostgreSQL
   → Update Redis usage counter
```

### 6.5 SQL Validation Rules

The `SqlToolService` enforces the following before any query execution:

| Rule                          | Implementation                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Must start with `SELECT`      | Regex: `/^\s*SELECT\s/i`                                                               |
| No data modification keywords | Reject if contains `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`, `TRUNCATE` |
| No multiple statements        | Reject if contains `;` mid-query                                                       |
| Target table check            | Only allow queries referencing `financial_data`                                        |
| Result size limit             | Cap at 100 rows                                                                        |

---

## 7. Authentication Architecture

### 7.1 Flow

```
Registration:
  POST /auth/register
  → Validate DTO (email format, password min length)
  → Check email uniqueness
  → argon2.hash(password)           // Argon2id, @node-rs/argon2
  → INSERT INTO users
  → Return { accessToken: JWT }

Login:
  POST /auth/login
  → Validate DTO
  → SELECT user WHERE email = ?
  → argon2.verify(storedHash, password)
  → Return { accessToken: JWT }

Protected Request:
  HTTP Header: Authorization: Bearer <token>
  → JwtAuthGuard extracts token
  → JwtStrategy.validate() decodes payload
  → req.user = { id, email } attached
  → Controller receives typed user object
```

### 7.2 JWT Payload

```json
{
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "iat": 1720000000,
  "exp": 1720086400
}
```

### 7.3 Token Configuration

| Setting   | Value                  | Source                                |
| --------- | ---------------------- | ------------------------------------- |
| Algorithm | HS256                  | Default                               |
| Expiry    | 24 hours               | Configurable via `JWT_EXPIRY` env var |
| Secret    | 32+ char random string | `JWT_SECRET` env var                  |

### 7.4 User Isolation

Every database query that touches `conversations` or `messages` includes a `WHERE userId = :userId` clause derived from the validated JWT. There is no admin bypass in the MVP.

---

## 8. Streaming Architecture

### 8.1 Protocol: Server-Sent Events over HTTP

The `/chat` endpoint responds with:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Transfer-Encoding: chunked
```

Each event is a newline-delimited JSON string:

```
data: {"type":"tool_start"}\n\n
data: {"type":"tool_query","query":"SELECT ..."}\n\n
data: {"type":"tool_end","rowCount":4}\n\n
data: {"type":"token","content":"Apple"}\n\n
data: {"type":"token","content":"'s net"}\n\n
data: {"type":"done","usage":{"promptTokens":245,"completionTokens":87}}\n\n
```

### 8.2 NestJS SSE Implementation

NestJS natively supports SSE via `@Sse()` decorator (returning `Observable<MessageEvent>`). However, because the chat stream requires imperative token-by-token push from the OpenAI SDK callback, the implementation uses a **`PassThrough` stream piped to `res.write()`** pattern instead of `Observable`, giving precise control over when each chunk is flushed.

### 8.3 Stop Generation

```
Client clicks "Stop"
  → POST /chat/stop { conversationId, messageId }
  → Backend looks up active stream for that messageId
  → Calls controller.abortStream(messageId)
  → AbortController.abort() cancels the OpenAI SDK call
  → Partial content already written to response is preserved
  → Backend saves partial message to DB with { partial: true }
  → Backend calculates token cost of partial response
  → Redis usage updated with partial cost
  → SSE stream closes
```

Active streams are tracked in a `Map<messageId, AbortController>` held in `ChatService`. This map is **in-memory only** and is cleared on process restart (acceptable for MVP).

### 8.4 Frontend Streaming State Machine

```
IDLE
  → user submits message
SENDING
  → awaiting first byte from server
STREAMING_TOOL
  → tool_start received
  → tool_query received (show SQL)
STREAMING_ANSWER
  → tool_end received
  → tokens arriving
DONE
  → done event received
  → message saved to cache
ERROR
  → error event received or fetch fails
```

---

## 9. SQL Tool Calling Architecture

### 9.1 Why Tool Calling (Not RAG or Fine-Tuning)

| Approach                    | Hallucination Risk | Latency | Complexity |
| --------------------------- | ------------------ | ------- | ---------- |
| Answer from model weights   | High               | Low     | None       |
| RAG (embed + vector search) | Medium             | Medium  | High       |
| SQL Tool Calling ✓          | Zero (by design)   | Medium  | Medium     |
| Fine-tuning                 | Low                | Low     | Very High  |

SQL Tool Calling is the only approach that makes hallucination architecturally impossible: the model **cannot** answer a financial question without executing a SQL query, and the SQL result is the only data it receives.

### 9.2 Tool Calling Sequence (Detail)

```
┌──────────┐        ┌──────────────┐        ┌──────────┐     ┌──────────┐
│ Frontend │        │  NestJS      │        │ OpenAI   │     │ Postgres │
└────┬─────┘        └──────┬───────┘        └────┬─────┘     └────┬─────┘
     │  POST /chat         │                     │                │
     │ ──────────────────► │                     │                │
     │                     │  stream=true         │                │
     │                     │  tools=[execute_sql] │                │
     │                     │ ─────────────────── ►│                │
     │                     │                     │                │
     │                     │ ◄── tool_call chunk ─│                │
     │  SSE: tool_start    │                     │                │
     │ ◄────────────────── │                     │                │
     │  SSE: tool_query    │                     │                │
     │ ◄────────────────── │                     │                │
     │                     │  validate SQL        │                │
     │                     │  execute query       │                │
     │                     │ ────────────────────────────────────►│
     │                     │ ◄──── rows JSON ─────────────────────│
     │  SSE: tool_end      │                     │                │
     │ ◄────────────────── │                     │                │
     │                     │  append tool result  │                │
     │                     │  stream=true         │                │
     │                     │  (no tools this call)│                │
     │                     │ ─────────────────── ►│                │
     │  SSE: token ...     │                     │                │
     │ ◄────────────────── │ ◄─── token stream ──│                │
     │  SSE: done          │                     │                │
     │ ◄────────────────── │                     │                │
```

### 9.3 Conversation History Management

The conversation history passed to OpenAI follows the OpenAI messages format:

```json
[
  { "role": "system", "content": "<system_prompt>" },
  { "role": "user", "content": "What was Apple's net income in 2023?" },
  {
    "role": "assistant",
    "content": null,
    "tool_calls": [
      {
        "id": "call_abc",
        "function": {
          "name": "execute_sql",
          "arguments": "{\"query\":\"SELECT...\"}"
        }
      }
    ]
  },
  {
    "role": "tool",
    "content": "[{\"net_income\":96995000000}]",
    "tool_call_id": "call_abc"
  },
  {
    "role": "assistant",
    "content": "Apple's net income in 2023 was $96.99 billion."
  }
]
```

All messages in this format are stored in the `messages` table so the full conversation context can be reconstructed from the database on page refresh.

---

## 10. Technology Justifications

### 10.1 NestJS (vs. Express, Fastify, tRPC)

| Factor               | Decision                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Modularity**       | NestJS's module/provider system enforces the feature-based architecture required by the project      |
| **DI Container**     | Dependency Injection makes services testable in isolation without mocking module systems             |
| **Decorators**       | Guards, Interceptors, and Pipes are first-class, making the auth/validation/streaming pipeline clean |
| **TypeScript-first** | Native TypeScript support; no extra configuration required                                           |
| **SSE Support**      | Built-in `@Sse()` and `Observable` support simplifies streaming endpoint creation                    |

### 10.2 PostgreSQL (vs. MySQL, SQLite, MongoDB)

| Factor              | Decision                                                                              |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Relational Data** | Conversations → Messages is a clear parent/child relationship; SQL is the right model |
| **JSONB Support**   | Tool call inputs/outputs stored as JSONB for flexible querying                        |
| **SQL Grounding**   | The assignment specifically requires PostgreSQL                                       |
| **UUID Support**    | Native UUID generation for user and conversation IDs                                  |

### 10.3 Redis (vs. In-Memory Map, Database Column)

| Factor                | Decision                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| **TTL-based Reset**   | Redis TTL natively implements the "reset after 1 hour" requirement without a cron job                   |
| **Atomic Operations** | `INCRBYFLOAT` is atomic, preventing race conditions in concurrent requests                              |
| **Fast Reads**        | Spending check happens on every request; sub-millisecond Redis reads are acceptable latency             |
| **Scalability**       | If the backend were ever horizontally scaled, Redis provides a shared counter (in-memory Map would not) |

### 10.4 OpenAI Tool Calling (vs. LangChain, LlamaIndex)

| Factor                      | Decision                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| **No abstraction overhead** | The tool calling flow is simple and well-defined; an abstraction layer adds complexity without benefit |
| **Direct SDK control**      | The native OpenAI Node SDK gives precise control over streaming, token counts, and abort signals       |
| **Auditability**            | Raw API calls are easier to debug and audit than framework-abstracted chains                           |

### 10.5 React + Vite (vs. Next.js, Remix)

| Factor                   | Decision                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| **SPA only**             | There is no SEO requirement and no need for SSR; a SPA is the simplest correct choice              |
| **Vite HMR**             | Sub-100ms hot reload significantly improves developer experience during UI iteration               |
| **No framework lock-in** | Vite + React gives full control over routing and state without Next.js's opinions on data fetching |

### 10.6 TanStack Query (vs. SWR, Redux Toolkit Query)

| Factor                 | Decision                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Background refetch** | Conversation list automatically refetches when window regains focus                  |
| **Optimistic updates** | User message can be shown immediately before server confirmation                     |
| **Cache invalidation** | After sending a message, the conversation cache is invalidated and refetched cleanly |
| **Devtools**           | TanStack Query Devtools makes cache inspection trivial during development            |
