# System Design Document

**Project:** Financial AI Chat Assistant  
**Version:** 1.0  
**Status:** Planning  
**Date:** 2026-07-14

---

## Table of Contents

1. [System Context Diagram](#1-system-context-diagram)
2. [Component Diagram](#2-component-diagram)
3. [Authentication Flow](#3-authentication-flow)
4. [Chat Flow](#4-chat-flow)
5. [SQL Tool Calling Flow](#5-sql-tool-calling-flow)
6. [Streaming Flow](#6-streaming-flow)
7. [Usage Limit Flow](#7-usage-limit-flow)
8. [Full End-to-End Sequence Diagram](#8-full-end-to-end-sequence-diagram)

---

## 1. System Context Diagram

### Diagram

```mermaid
graph TB
    User(["👤 Authenticated User\n(Desktop Browser)"])
    OpenAI["☁️ OpenAI API\nGPT-4o · Tool Calling · Streaming"]

    subgraph K3s["k3s Cluster  —  namespace: finchat"]
        direction TB

        subgraph Ingress["Traefik Ingress Controller"]
            ING["IngressRoute\n/ → frontend-svc\n/api → backend-svc"]
        end

        subgraph App["Application Layer"]
            FE["React Frontend Pod\nNginx · Built SPA"]
            BE["NestJS Backend Pod\nREST API · SSE Streaming"]
        end

        subgraph Data["Data Layer"]
            PG[("🐘 PostgreSQL\nStatefulSet + PVC\nfinancial_data · app tables")]
            Redis[("⚡ Redis\nDeployment + PVC\nUsage Tracking · TTL Reset")]
        end

        CM["ConfigMap\nnon-secret env vars"]
        SEC["Secret\nDB creds · JWT · API key"]
    end

    User <-->|"HTTPS"| ING
    ING -->|"ClusterIP"| FE
    ING -->|"ClusterIP"| BE
    FE <-->|"REST API / SSE\n(in-cluster)"| BE
    BE <-->|"HTTPS"| OpenAI
    BE <-->|"ClusterIP :5432"| PG
    BE <-->|"ClusterIP :6379"| Redis
    BE -. reads .-> CM
    BE -. reads .-> SEC
```

### Explanation

| Actor / System                     | Role                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Authenticated User**             | Human operating the chat application via a desktop browser                                                |
| **k3s Cluster**                    | Lightweight Kubernetes running all workloads in the `finchat` namespace                                   |
| **Traefik Ingress**                | k3s default ingress controller. Routes `/` → frontend, `/api` → backend. Supports SSE streaming natively. |
| **React Frontend Pod**             | Nginx serving the pre-built React SPA                                                                     |
| **NestJS Backend Pod**             | Orchestrates all business logic: JWT validation, usage limits, OpenAI calls, SQL execution, SSE streaming |
| **OpenAI API**                     | External LLM. Receives conversation history + tool definitions; returns tool calls and answer tokens      |
| **PostgreSQL (StatefulSet + PVC)** | Persistent data store. StatefulSet for stable identity; PVC via k3s local-path provisioner                |
| **Redis (Deployment + PVC)**       | Per-user cumulative spend with TTL-based hourly reset                                                     |
| **ConfigMap**                      | Non-sensitive env vars (model name, limits, URLs) mounted into pods                                       |
| **Secret**                         | Sensitive values: `OPENAI_API_KEY`, `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL` — never committed to git    |

The browser never contacts OpenAI, PostgreSQL, or Redis directly. All access is mediated by the NestJS backend pod via in-cluster DNS (e.g. `postgres-svc.finchat.svc.cluster.local`).

---

## 2. Component Diagram

### Diagram

```mermaid
graph TB
    subgraph Browser["Browser"]
        subgraph FE["React Application"]
            Router["React Router\nRoute Guards"]
            subgraph AuthFeat["auth/"]
                LoginPage["LoginPage"]
                RegisterPage["RegisterPage"]
                AuthCtx["AuthContext\n(JWT store)"]
            end
            subgraph ChatFeat["chat/"]
                ChatPage["ChatPage"]
                ChatInput["ChatInput"]
                MessageList["MessageList"]
                MsgBubble["MessageBubble"]
                SqlBlock["SqlToolBlock"]
                MdRenderer["MarkdownRenderer"]
                DataTable["DataTable"]
                DataChart["DataChart"]
                useChat["useChat()"]
                useStream["useStream()"]
            end
            subgraph ConvFeat["conversations/"]
                Sidebar["ConversationSidebar"]
                ConvList["ConversationList"]
                DeleteDlg["DeleteDialog"]
                useConvs["useConversations()"]
            end
            subgraph Shared["shared/"]
                AxiosInst["axios instance\n(attach JWT)"]
                QueryClient["TanStack QueryClient"]
            end
        end
    end

    subgraph NestJS["NestJS Backend"]
        subgraph AuthMod["Auth Module"]
            AuthCtrl["AuthController\nPOST /auth/register\nPOST /auth/login\nGET  /auth/me"]
            AuthSvc["AuthService\nregister · login · validateUser"]
            JwtStrat["JwtStrategy\nPassport JWT"]
            JwtGuard["JwtAuthGuard"]
        end
        subgraph ChatMod["Chat Module"]
            ChatCtrl["ChatController\nPOST /chat\nPOST /chat/stop"]
            ChatSvc["ChatService\norchestrateStream()"]
            OAISvc["OpenAIService\nstreamWithTools()"]
            SqlToolSvc["SqlToolService\nvalidate · execute"]
        end
        subgraph ConvMod["Conversations Module"]
            ConvCtrl["ConversationsController\nGET /conversations\nGET /conversations/:id\nDELETE /conversations/:id"]
            ConvSvc["ConversationsService"]
        end
        subgraph UsageMod["Usage Module"]
            UsageSvc["UsageService\ncheckLimit · track · reset"]
            UsageGuard["UsageGuard"]
        end
        subgraph DBMod["Database Module"]
            UserEnt["User Entity"]
            ConvEnt["Conversation Entity"]
            MsgEnt["Message Entity"]
            FinEnt["FinancialData Entity"]
        end
    end

    PG[("PostgreSQL")]
    Redis[("Redis")]
    OpenAI["OpenAI API"]

    Router --> AuthFeat
    Router --> ChatFeat
    Router --> ConvFeat
    useChat --> AxiosInst
    useStream --> AxiosInst
    useConvs --> QueryClient

    AxiosInst -->|"REST"| AuthCtrl
    AxiosInst -->|"SSE"| ChatCtrl
    AxiosInst -->|"REST"| ConvCtrl

    JwtGuard --> JwtStrat
    AuthCtrl --> AuthSvc
    AuthSvc --> UserEnt

    ChatCtrl --> JwtGuard
    ChatCtrl --> UsageGuard
    ChatCtrl --> ChatSvc
    ChatSvc --> OAISvc
    ChatSvc --> SqlToolSvc
    ChatSvc --> MsgEnt
    OAISvc --> OpenAI
    SqlToolSvc --> FinEnt
    UsageGuard --> UsageSvc
    UsageSvc --> Redis

    ConvCtrl --> JwtGuard
    ConvCtrl --> ConvSvc
    ConvSvc --> ConvEnt
    ConvSvc --> MsgEnt

    UserEnt --> PG
    ConvEnt --> PG
    MsgEnt --> PG
    FinEnt --> PG
```

### Explanation

The component diagram shows three distinct layers:

1. **Browser layer** — Feature-based React components. Each feature folder owns its own API calls, hooks, and components. Shared infrastructure (axios instance with JWT interceptor, TanStack QueryClient) is in `shared/`.

2. **NestJS layer** — Domain modules with thin controllers delegating to services. The critical chain is `ChatController → ChatService → OpenAIService + SqlToolService`. Guards intercept every chat request before it reaches the controller.

3. **Infrastructure layer** — PostgreSQL (persistence), Redis (usage), OpenAI (inference).

---

## 3. Authentication Flow

### Diagram

```mermaid
sequenceDiagram
    actor User
    participant FE as React Frontend
    participant BE as NestJS AuthController
    participant AuthSvc as AuthService
    participant PG as PostgreSQL

    rect rgb(230, 245, 255)
        Note over User,PG: Registration
        User->>FE: Submit register form (email, password)
        FE->>FE: Zod validation (client-side)
        FE->>BE: POST /auth/register { email, password }
        BE->>BE: ValidationPipe (class-validator DTO)
        BE->>AuthSvc: register(dto)
        AuthSvc->>PG: SELECT * FROM users WHERE email = ?
        alt Email already exists
            PG-->>AuthSvc: row returned
            AuthSvc-->>BE: ConflictException
            BE-->>FE: 409 Conflict
            FE-->>User: "Email already registered"
        else Email available
            PG-->>AuthSvc: no row
            AuthSvc->>AuthSvc: argon2.hash(password) [Argon2id]
            AuthSvc->>PG: INSERT INTO users (email, passwordHash)
            PG-->>AuthSvc: user created
            AuthSvc-->>BE: { accessToken: signJWT(userId) }
            BE-->>FE: 201 { accessToken }
            FE->>FE: Store token · set AuthContext
            FE-->>User: Redirect → /chat
        end
    end

    rect rgb(230, 255, 230)
        Note over User,PG: Login
        User->>FE: Submit login form (email, password)
        FE->>BE: POST /auth/login { email, password }
        BE->>AuthSvc: login(dto)
        AuthSvc->>PG: SELECT * FROM users WHERE email = ?
        alt User not found
            PG-->>AuthSvc: no row
            AuthSvc-->>BE: UnauthorizedException
            BE-->>FE: 401 { message: "Invalid credentials" }
        else User found
            PG-->>AuthSvc: user row
            AuthSvc->>AuthSvc: argon2.verify(storedHash, password)
            alt Password mismatch
                AuthSvc-->>BE: UnauthorizedException
                BE-->>FE: 401 { message: "Invalid credentials" }
            else Password valid
                AuthSvc-->>BE: { accessToken: signJWT(userId) }
                BE-->>FE: 200 { accessToken }
                FE->>FE: Store token · set AuthContext
                FE-->>User: Redirect → /chat
            end
        end
    end

    rect rgb(255, 250, 220)
        Note over User,PG: Protected Request
        FE->>BE: GET /auth/me (Authorization: Bearer <token>)
        BE->>BE: JwtAuthGuard.canActivate()
        alt Token invalid or expired
            BE-->>FE: 401 Unauthorized
            FE-->>User: Redirect → /login
        else Token valid
            BE->>BE: JwtStrategy.validate(payload) → req.user
            BE->>PG: SELECT * FROM users WHERE id = payload.sub
            PG-->>BE: user row
            BE-->>FE: 200 { id, email, createdAt }
        end
    end
```

### Explanation

- **Registration** uses Argon2id (`@node-rs/argon2`) before storing the password. On success, a JWT is returned immediately — the user is logged in after registering.
- **Login** uses the same generic "Invalid credentials" error for both "user not found" and "wrong password" to prevent user enumeration attacks.
- **Protected requests** use Passport's `JwtStrategy` which decodes the token, validates expiry, and attaches `req.user` — consumed by all downstream services.

---

## 4. Chat Flow

### Diagram

```mermaid
flowchart TD
    A(["User submits message"]) --> B["FE: fetch POST /chat\nwith ReadableStream reader"]
    B --> C{"JwtAuthGuard"}
    C -- "401 Invalid token" --> D(["FE: redirect to /login"])
    C -- "Valid" --> E{"UsageGuard:\nRedis GET usage:userId"}
    E -- "≥ budget limit" --> F["Return 429\nfriendly limit message"]
    F --> G(["FE: show usage limit banner"])
    E -- "Under limit" --> H["Save user message\nto DB (role: user)"]
    H --> I["Load full conversation\nhistory from DB"]
    I --> J["Build OpenAI messages array\n[system, ...history, userMsg]"]
    J --> K["OpenAI stream call\ntools: execute_sql\ntool_choice: auto"]
    K --> L{"OpenAI response\ndelta type?"}

    L -- "tool_call delta" --> M["Accumulate tool call arguments"]
    M --> N["Emit SSE: tool_start"]
    N --> O["Emit SSE: tool_query with SQL"]
    O --> P{"SqlToolService:\nvalidate SQL"}
    P -- "Invalid SQL\n(DML/DDL/injection)" --> Q["Emit SSE: tool_error"]
    Q --> R(["FE: show error in SqlToolBlock"])
    P -- "Valid SELECT" --> S["Execute on PostgreSQL\n(financial_data table)"]
    S --> T{"Rows returned?"}
    T -- "0 rows" --> U["tool result: empty array"]
    T -- "N rows" --> V["tool result: JSON rows"]
    U --> W["Emit SSE: tool_end\nrowCount: 0"]
    V --> W2["Emit SSE: tool_end\nrowCount: N"]
    W --> X["Append tool result\nto messages array"]
    W2 --> X
    X --> Y["Second OpenAI stream call\n(no tools, with tool result)"]

    L -- "content delta" --> AA["Emit SSE: token"]
    Y --> AA

    AA --> AB{"User clicked Stop?"}
    AB -- "Yes" --> AC["AbortController.abort()\npartial = true"]
    AC --> AD["Emit SSE: done\nwith partial flag"]
    AB -- "No" --> AE{"OpenAI stream\nfinished?"}
    AE -- "More tokens" --> AA
    AE -- "Done" --> AD2["Emit SSE: done\nwith token usage"]

    AD --> AF["Save partial assistant\nmessage to DB"]
    AD2 --> AF2["Save full assistant\nmessage to DB"]
    AF --> AG["Redis INCRBYFLOAT\n(partial cost)"]
    AF2 --> AG2["Redis INCRBYFLOAT\n(full cost)"]
    AG --> AH(["FE: render partial message\nStop button disappears"])
    AG2 --> AI(["FE: render complete response\nMarkdown + Table + Chart"])
```

### Explanation

The chat flow diagram captures all branches:

- **Authentication failure** — redirect before any processing begins
- **Usage limit** — rejected cleanly with a 429 before hitting OpenAI
- **SQL validation failure** — surfaces as a tool error visible in the UI
- **No rows** — model receives empty result, instructs to say "data not available"
- **Stop generation** — AbortController cancels the OpenAI stream; partial content is always saved
- **Happy path** — tool call executes, model streams final answer, response persisted and rendered

---

## 5. SQL Tool Calling Flow

### Diagram

```mermaid
sequenceDiagram
    participant ChatSvc as ChatService
    participant OAISvc as OpenAIService
    participant OpenAI as OpenAI API
    participant SqlSvc as SqlToolService
    participant PG as PostgreSQL
    participant SSE as SSE Response Stream

    ChatSvc->>OAISvc: streamWithTools(messages, tools)
    OAISvc->>OpenAI: POST /v1/chat/completions\n{ stream: true, tools: [execute_sql], tool_choice: "auto" }

    loop Streaming chunks
        OpenAI-->>OAISvc: delta chunk
        alt chunk.delta.tool_calls exists
            OAISvc-->>ChatSvc: onToolCallDelta(chunk)
            ChatSvc->>ChatSvc: Accumulate tool name + arguments string
        else chunk.delta.content exists
            OAISvc-->>ChatSvc: onToken(content)
            ChatSvc->>SSE: write({ type: "token", content })
        else chunk.finish_reason = "tool_calls"
            OAISvc-->>ChatSvc: onToolCallComplete(toolCall)
        end
    end

    Note over ChatSvc,SSE: Tool call fully received
    ChatSvc->>SSE: write({ type: "tool_start" })
    ChatSvc->>ChatSvc: JSON.parse(toolCall.function.arguments)
    ChatSvc->>SSE: write({ type: "tool_query", query: parsedQuery })

    ChatSvc->>SqlSvc: validateAndExecute(parsedQuery)
    SqlSvc->>SqlSvc: Assert: starts with SELECT
    SqlSvc->>SqlSvc: Assert: no INSERT/UPDATE/DELETE/DROP
    SqlSvc->>SqlSvc: Assert: no semicolon mid-query
    SqlSvc->>SqlSvc: Assert: references financial_data

    alt Validation fails
        SqlSvc-->>ChatSvc: ValidationError
        ChatSvc->>SSE: write({ type: "tool_error", message })
        ChatSvc->>SSE: close()
    else Validation passes
        SqlSvc->>PG: pool.query(sql)
        PG-->>SqlSvc: { rows: [...], rowCount: N }
        SqlSvc-->>ChatSvc: { rows, rowCount }
        ChatSvc->>SSE: write({ type: "tool_end", rowCount: N })

        Note over ChatSvc,OpenAI: Append tool result, continue stream
        ChatSvc->>ChatSvc: Append { role: "tool", content: JSON.stringify(rows) } to messages
        ChatSvc->>OAISvc: streamFinalAnswer(messages)
        OAISvc->>OpenAI: POST /v1/chat/completions\n{ stream: true, no tools }

        loop Final answer tokens
            OpenAI-->>OAISvc: delta chunk
            OAISvc-->>ChatSvc: onToken(content)
            ChatSvc->>SSE: write({ type: "token", content })
        end

        OpenAI-->>OAISvc: finish_reason: "stop"
        OAISvc-->>ChatSvc: onComplete(usage)
        ChatSvc->>SSE: write({ type: "done", usage })
        ChatSvc->>SSE: close()
    end
```

### Explanation

Two separate OpenAI calls are made per chat turn:

1. **First call** — includes the `execute_sql` tool definition. OpenAI responds with a tool call request instead of an answer. This stream contains the tool call arguments (the SQL query), which are accumulated incrementally.

2. **Second call** — includes the tool result (the SQL rows as JSON). OpenAI generates the final natural-language answer. This stream contains the response tokens.

This two-call pattern is standard OpenAI tool calling behaviour. The SSE stream to the frontend is kept open for both calls, so the user sees a continuous experience: SQL block appears → answer streams in.

---

## 6. Streaming Flow

### State Machine

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Idle : Page loaded

    Idle --> Sending : User submits message\nfetch() initiated

    Sending --> LimitReached : SSE / 429 received
    Sending --> StreamingTool : SSE tool_start received
    Sending --> StreamingAnswer : SSE token received\n(no tool call path)
    Sending --> Error : Network error\nor 4xx/5xx

    StreamingTool --> StreamingTool : SSE tool_query\n(update SQL display)
    StreamingTool --> StreamingAnswer : SSE tool_end received
    StreamingTool --> Error : SSE tool_error

    StreamingAnswer --> StreamingAnswer : SSE token\n(append to buffer)
    StreamingAnswer --> Done : SSE done received
    StreamingAnswer --> Stopped : User clicks Stop\nPOST /chat/stop

    Done --> Idle : Message saved\nReady for next input
    Stopped --> Idle : Partial message saved\nStop button hidden
    LimitReached --> Idle : Banner shown\nInput disabled temporarily
    Error --> Idle : Error toast shown\nUser can retry
```

### SSE Event Format

```
data: {"type":"tool_start"}\n\n
data: {"type":"tool_query","query":"SELECT company, net_income FROM financial_data WHERE company = 'Apple' AND year = 2023"}\n\n
data: {"type":"tool_end","rowCount":1}\n\n
data: {"type":"token","content":"Apple"}\n\n
data: {"type":"token","content":"'s net income"}\n\n
data: {"type":"token","content":" in 2023 was"}\n\n
data: {"type":"token","content":" **$96.99 billion**."}\n\n
data: {"type":"done","usage":{"promptTokens":312,"completionTokens":42}}\n\n
```

### Frontend SSE Consumer

```mermaid
flowchart TD
    A["fetch(POST /chat, { headers: { Authorization } })"]
    A --> B["response.body.getReader()"]
    B --> C["TextDecoder.decode(chunk)"]
    C --> D["Split on double newline\n(SSE event boundary)"]
    D --> E["Strip 'data: ' prefix"]
    E --> F["JSON.parse(line)"]
    F --> G{"event.type"}
    G -- "tool_start" --> H["setStreamState: STREAMING_TOOL\nshow SqlToolBlock (loading)"]
    G -- "tool_query" --> I["setSqlQuery(event.query)\nshow SQL in SqlToolBlock"]
    G -- "tool_end" --> J["setStreamState: STREAMING_ANSWER\nmark SqlToolBlock complete\nrowCount badge"]
    G -- "token" --> K["appendToBuffer(event.content)\nre-render MessageBubble"]
    G -- "done" --> L["setStreamState: DONE\nfinaliseMessage()\ninvalidate query cache"]
    G -- "error" --> M["setStreamState: ERROR\nshow error toast"]
    H --> N["Loop: reader.read()"]
    I --> N
    J --> N
    K --> N
    L --> O(["Stream closed"])
    M --> O
```

### Explanation

The frontend uses `fetch()` instead of `EventSource` because `EventSource` does not support custom headers — the `Authorization: Bearer <token>` header cannot be set. Using `fetch()` with a `ReadableStream` reader provides equivalent SSE functionality with full control over request headers.

Each token is appended to a `useRef` buffer (not `useState`) to avoid triggering a re-render on every single token. A `requestAnimationFrame` loop or a debounced flush commits the buffer to state ~60fps, producing a smooth animation without overwhelming React's reconciler.

---

## 7. Usage Limit Flow

### Diagram

```mermaid
flowchart TD
    A(["POST /chat received"]) --> B["UsageGuard.canActivate()"]
    B --> C["Redis: GET usage:{userId}"]
    C --> D{"Key exists in Redis?"}
    D -- "No\n(first request or after reset)" --> E["currentSpend = 0.0"]
    D -- "Yes" --> F["currentSpend = parseFloat(value)"]
    E --> G
    F --> G{"currentSpend\n≥ BUDGET_LIMIT?"}
    G -- "Yes" --> H["Throw HttpException 429"]
    H --> I["Response body:\n{ statusCode: 429,\n  message: 'You have reached your hourly usage limit.\n  Your limit will reset in X minutes.',\n  resetIn: secondsRemaining }"]
    I --> J(["FE: display friendly limit banner\nDisable input until reset"])

    G -- "No" --> K["Allow request to proceed"]
    K --> L["... Chat processing ...\n(OpenAI + SQL execution)"]
    L --> M["tokenUsage = { promptTokens, completionTokens }"]
    M --> N["cost = calculateCost(tokenUsage)"]
    N --> O{"Redis key\nalready exists?"}
    O -- "No" --> P["SETEX usage:{userId}\n{RESET_TTL_SECONDS}\n{cost}"]
    O -- "Yes" --> Q["INCRBYFLOAT usage:{userId} {cost}\n(TTL not reset — stays original)"]
    P --> R(["Usage tracked\nTTL = RESET_INTERVAL"])
    Q --> R

    subgraph AutoReset["Automatic Reset (no cron needed)"]
        S(["RESET_INTERVAL elapses\n(default: 3600s)"])
        S --> T["Redis TTL expires\nKey deleted automatically"]
        T --> U(["Next request:\nKey not found → fresh start"])
    end
```

### Explanation

Key design decisions in the usage limit implementation:

| Decision                              | Rationale                                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Redis TTL for reset**               | No cron job required. Redis natively expires the key after `RESET_INTERVAL` seconds. First write uses `SETEX` to set the value and TTL atomically. |
| **INCRBYFLOAT for increment**         | Atomic operation — safe under concurrent requests from the same user. No race condition between check and increment.                               |
| **TTL not refreshed on increment**    | The reset clock starts at the user's first request, not their last. This prevents users from extending their window by making requests.            |
| **429 with `resetIn`**                | The response includes `resetIn: secondsRemaining` (from `TTL` command) so the frontend can show "resets in 42 minutes" without polling.            |
| **Cost deducted for stopped streams** | Partial OpenAI responses still consume tokens. Fairness and deterrence of abuse require deducting the cost even when stopped.                      |

---

## 8. Full End-to-End Sequence Diagram

### Diagram: Happy Path (S1 — Valid Financial Question)

```mermaid
sequenceDiagram
    actor User
    participant FE as React Frontend
    participant BE as NestJS Backend
    participant JWTGuard as JwtAuthGuard
    participant UsageGuard as UsageGuard
    participant ChatSvc as ChatService
    participant OpenAI as OpenAI API
    participant SqlSvc as SqlToolService
    participant PG as PostgreSQL
    participant Redis as Redis

    User->>FE: "What was Apple's net income in 2023?"
    FE->>FE: Append optimistic user message to UI
    FE->>BE: POST /chat { conversationId, message }\nAuthorization: Bearer <jwt>

    BE->>JWTGuard: canActivate(context)
    JWTGuard->>JWTGuard: Verify JWT signature + expiry
    JWTGuard-->>BE: req.user = { id, email }

    BE->>UsageGuard: canActivate(context)
    UsageGuard->>Redis: GET usage:{userId}
    Redis-->>UsageGuard: "0.00312" (under limit)
    UsageGuard-->>BE: Allowed

    BE->>ChatSvc: streamResponse(userId, dto, res)
    ChatSvc->>PG: INSERT message (role: user)
    ChatSvc->>PG: SELECT messages WHERE conversationId = ? ORDER BY createdAt
    PG-->>ChatSvc: conversation history
    ChatSvc->>BE: Set headers: Content-Type: text/event-stream

    ChatSvc->>OpenAI: POST /v1/chat/completions\n{ stream: true, tools: [execute_sql] }
    OpenAI-->>ChatSvc: delta: tool_call { execute_sql, "SELECT..." }

    ChatSvc->>FE: SSE: {"type":"tool_start"}
    ChatSvc->>FE: SSE: {"type":"tool_query","query":"SELECT net_income FROM financial_data WHERE company='Apple' AND year=2023"}
    ChatSvc->>SqlSvc: validateAndExecute(query)
    SqlSvc->>PG: SELECT net_income FROM financial_data WHERE company='Apple' AND year=2023
    PG-->>SqlSvc: [{ net_income: 96995000000 }]
    SqlSvc-->>ChatSvc: { rows: [...], rowCount: 1 }
    ChatSvc->>FE: SSE: {"type":"tool_end","rowCount":1}

    ChatSvc->>OpenAI: POST /v1/chat/completions\n{ stream: true, messages: [..., toolResult] }
    OpenAI-->>ChatSvc: token: "Apple"
    ChatSvc->>FE: SSE: {"type":"token","content":"Apple"}
    OpenAI-->>ChatSvc: token: "'s net income in 2023 was"
    ChatSvc->>FE: SSE: {"type":"token","content":"'s net income in 2023 was"}
    OpenAI-->>ChatSvc: token: " **$96.99 billion**."
    ChatSvc->>FE: SSE: {"type":"token","content":" **$96.99 billion**."}
    OpenAI-->>ChatSvc: finish_reason: "stop", usage: { prompt: 312, completion: 42 }
    ChatSvc->>FE: SSE: {"type":"done","usage":{"promptTokens":312,"completionTokens":42}}

    ChatSvc->>PG: INSERT messages (role: tool + role: assistant)
    ChatSvc->>Redis: INCRBYFLOAT usage:{userId} 0.000387

    FE->>FE: Render streamed message\nMarkdown: "Apple's net income in 2023 was **$96.99 billion**."
    FE-->>User: Complete rendered response visible
```

### Explanation

This diagram traces every hop in the happy-path scenario (S1). Notable points:

1. The optimistic user message is shown in the UI immediately (before the server confirms persistence) to eliminate perceived latency.
2. JWT and Usage guards run synchronously before any database or OpenAI operations begin.
3. The SSE stream is opened **before** the OpenAI call starts, so the frontend can begin rendering the tool execution block as soon as the first tool_call delta arrives.
4. Two OpenAI calls are made in the same SSE session — the connection stays open throughout.
5. Database and Redis writes happen **after** the SSE stream closes, so they do not block the response perceived by the user.
