# API Specification

**Project:** Financial AI Chat Assistant  
**Version:** 1.0  
**Status:** Planning  
**Date:** 2026-07-14

> **Important:** This document defines the API contract only. No implementation has been written yet. All types are TypeScript notation for clarity. All monetary values in responses are raw integers (USD, no formatting). Formatting is the responsibility of the frontend.

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Authentication Endpoints](#2-authentication-endpoints)
   - [POST /auth/register](#21-post-authregister)
   - [POST /auth/login](#22-post-authlogin)
   - [GET /auth/me](#23-get-authme)
3. [Conversation Endpoints](#3-conversation-endpoints)
   - [POST /conversations](#31-post-conversations)
   - [GET /conversations](#32-get-conversations)
   - [GET /conversations/:id](#33-get-conversationsid)
   - [DELETE /conversations/:id](#34-delete-conversationsid)
4. [Chat Endpoints](#4-chat-endpoints)
   - [POST /chat](#41-post-chat)
   - [POST /chat/stop](#42-post-chatstop)
5. [SSE Event Reference](#5-sse-event-reference)
6. [Error Response Reference](#6-error-response-reference)

---

## 1. Global Conventions

### 1.1 Base URL

```
Development:  http://localhost:3000
Production:   https://<deployment-host>
```

All endpoints are served from the root. No `/api/v1` prefix is required in the MVP.

### 1.2 Authentication

All endpoints except `POST /auth/register` and `POST /auth/login` require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Requests without a valid token receive `401 Unauthorized`.

### 1.3 Content Type

| Direction                         | Content-Type        |
| --------------------------------- | ------------------- |
| Request body                      | `application/json`  |
| Standard response                 | `application/json`  |
| Streaming response (`POST /chat`) | `text/event-stream` |

### 1.4 Error Response Shape

All non-2xx responses return a consistent error body:

```typescript
{
  statusCode: number;   // HTTP status code
  message:   string;   // Human-readable description
  error?:    string;   // HTTP error name (e.g. "Unauthorized")
}
```

### 1.5 Shared Type Definitions

```typescript
// Used across multiple endpoints
type UUID = string // format: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

type ISOTimestamp = string // format: "2026-07-14T10:30:00.000Z"

type MessageRole = "user" | "assistant" | "tool"

interface UserDto {
  id: UUID
  email: string
  createdAt: ISOTimestamp
}

interface ConversationSummaryDto {
  id: UUID
  title: string
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
}

interface MessageDto {
  id: UUID
  conversationId: UUID
  role: MessageRole
  content: string
  toolName: string | null
  toolInput: Record<string, unknown> | null
  toolOutput: Record<string, unknown>[] | null
  tokensUsed: number | null
  isPartial: boolean
  createdAt: ISOTimestamp
}
```

---

## 2. Authentication Endpoints

### 2.1 POST /auth/register

Register a new user account.

**Authentication:** None required

**Request Body:**

```typescript
{
  email: string // Must be a valid email address
  password: string // Minimum 8 characters
}
```

**Request Example:**

```json
{
  "email": "analyst@example.com",
  "password": "securepassword123"
}
```

**Success Response — `201 Created`:**

```typescript
{
  accessToken: string // Signed JWT, expires in 24h
  user: UserDto
}
```

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "analyst@example.com",
    "createdAt": "2026-07-14T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status            | Condition                                  | Message                                                                 |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `400 Bad Request` | Invalid email format or password too short | `"email must be an email"` / `"password must be at least 8 characters"` |
| `409 Conflict`    | Email already registered                   | `"An account with this email already exists"`                           |

---

### 2.2 POST /auth/login

Authenticate an existing user and receive a JWT.

**Authentication:** None required

**Request Body:**

```typescript
{
  email: string
  password: string
}
```

**Request Example:**

```json
{
  "email": "analyst@example.com",
  "password": "securepassword123"
}
```

**Success Response — `200 OK`:**

```typescript
{
  accessToken: string
  user: UserDto
}
```

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "analyst@example.com",
    "createdAt": "2026-07-14T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status             | Condition                             | Message                    |
| ------------------ | ------------------------------------- | -------------------------- |
| `400 Bad Request`  | Missing or malformed fields           | `"email must be an email"` |
| `401 Unauthorized` | Email not found or password incorrect | `"Invalid credentials"`    |

> **Security note:** Both "email not found" and "password incorrect" return the same `401` message to prevent user enumeration.

---

### 2.3 GET /auth/me

Return the authenticated user's profile.

**Authentication:** Required

**Request Body:** None

**Success Response — `200 OK`:**

```typescript
UserDto
```

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "analyst@example.com",
  "createdAt": "2026-07-14T10:00:00.000Z"
}
```

**Error Responses:**

| Status             | Condition                          | Message          |
| ------------------ | ---------------------------------- | ---------------- |
| `401 Unauthorized` | Token missing, invalid, or expired | `"Unauthorized"` |

---

## 3. Conversation Endpoints

### 3.1 POST /conversations

Create a new empty conversation. Returns the conversation ID which is used when sending the first message.

**Authentication:** Required

**Request Body:**

```typescript
{
  title?: string; // Optional. Defaults to "New Conversation". Max 255 chars.
}
```

**Request Example:**

```json
{}
```

```json
{
  "title": "Apple Financial Analysis"
}
```

**Success Response — `201 Created`:**

```typescript
ConversationSummaryDto
```

```json
{
  "id": "c1d2e3f4-a5b6-7890-cdef-012345678901",
  "title": "New Conversation",
  "createdAt": "2026-07-14T10:05:00.000Z",
  "updatedAt": "2026-07-14T10:05:00.000Z"
}
```

**Error Responses:**

| Status             | Condition                    | Message                                                   |
| ------------------ | ---------------------------- | --------------------------------------------------------- |
| `400 Bad Request`  | Title exceeds 255 characters | `"title must be shorter than or equal to 255 characters"` |
| `401 Unauthorized` | Invalid token                | `"Unauthorized"`                                          |

---

### 3.2 GET /conversations

Return a paginated list of the authenticated user's conversations, sorted by most recently updated first.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type    | Required | Default | Description                                  |
| --------- | ------- | -------- | ------- | -------------------------------------------- |
| `limit`   | integer | No       | `20`    | Number of conversations to return. Max: `50` |
| `offset`  | integer | No       | `0`     | Number of conversations to skip              |

**Request Example:**

```
GET /conversations?limit=20&offset=0
Authorization: Bearer <token>
```

**Success Response — `200 OK`:**

```typescript
{
  data:   ConversationSummaryDto[];
  total:  number;  // Total count for pagination
  limit:  number;
  offset: number;
}
```

```json
{
  "data": [
    {
      "id": "c1d2e3f4-a5b6-7890-cdef-012345678901",
      "title": "Apple Financial Analysis",
      "createdAt": "2026-07-14T10:05:00.000Z",
      "updatedAt": "2026-07-14T10:15:00.000Z"
    },
    {
      "id": "d2e3f4a5-b6c7-8901-defg-123456789012",
      "title": "Tech Sector Comparison 2024",
      "createdAt": "2026-07-13T09:00:00.000Z",
      "updatedAt": "2026-07-13T09:10:00.000Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Error Responses:**

| Status             | Condition     | Message          |
| ------------------ | ------------- | ---------------- |
| `401 Unauthorized` | Invalid token | `"Unauthorized"` |

---

### 3.3 GET /conversations/:id

Return a single conversation with its complete message history, ordered chronologically.

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Description         |
| --------- | ---- | ------------------- |
| `id`      | UUID | The conversation ID |

**Request Example:**

```
GET /conversations/c1d2e3f4-a5b6-7890-cdef-012345678901
Authorization: Bearer <token>
```

**Success Response — `200 OK`:**

```typescript
{
  id:        UUID;
  title:     string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  messages:  MessageDto[];  // Ordered by createdAt ASC
}
```

```json
{
  "id": "c1d2e3f4-a5b6-7890-cdef-012345678901",
  "title": "Apple Financial Analysis",
  "createdAt": "2026-07-14T10:05:00.000Z",
  "updatedAt": "2026-07-14T10:15:00.000Z",
  "messages": [
    {
      "id": "m1a2b3c4-d5e6-7890-fghi-111111111111",
      "conversationId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
      "role": "user",
      "content": "What was Apple's net income in 2023?",
      "toolName": null,
      "toolInput": null,
      "toolOutput": null,
      "tokensUsed": null,
      "isPartial": false,
      "createdAt": "2026-07-14T10:06:00.000Z"
    },
    {
      "id": "m2b3c4d5-e6f7-8901-ghij-222222222222",
      "conversationId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
      "role": "tool",
      "content": "[{\"net_income\":96995000000}]",
      "toolName": "execute_sql",
      "toolInput": {
        "query": "SELECT net_income FROM financial_data WHERE company = 'Apple' AND year = 2023"
      },
      "toolOutput": [{ "net_income": 96995000000 }],
      "tokensUsed": null,
      "isPartial": false,
      "createdAt": "2026-07-14T10:06:02.000Z"
    },
    {
      "id": "m3c4d5e6-f7a8-9012-hijk-333333333333",
      "conversationId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
      "role": "assistant",
      "content": "Apple's net income in 2023 was **$96.99 billion**, reflecting a slight decrease from $99.80 billion in 2022.",
      "toolName": null,
      "toolInput": null,
      "toolOutput": null,
      "tokensUsed": 312,
      "isPartial": false,
      "createdAt": "2026-07-14T10:06:05.000Z"
    }
  ]
}
```

**Error Responses:**

| Status             | Condition                                | Message                    |
| ------------------ | ---------------------------------------- | -------------------------- |
| `401 Unauthorized` | Invalid token                            | `"Unauthorized"`           |
| `403 Forbidden`    | Conversation belongs to a different user | `"Forbidden"`              |
| `404 Not Found`    | Conversation ID does not exist           | `"Conversation not found"` |

---

### 3.4 DELETE /conversations/:id

Permanently delete a conversation and all its messages.

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Description                   |
| --------- | ---- | ----------------------------- |
| `id`      | UUID | The conversation ID to delete |

**Request Body:** None

> **UX Note:** The frontend must show a confirmation dialog **before** calling this endpoint. The API performs deletion immediately with no undo capability.

**Success Response — `204 No Content`:**

```
(empty body)
```

**Error Responses:**

| Status             | Condition                                | Message                    |
| ------------------ | ---------------------------------------- | -------------------------- |
| `401 Unauthorized` | Invalid token                            | `"Unauthorized"`           |
| `403 Forbidden`    | Conversation belongs to a different user | `"Forbidden"`              |
| `404 Not Found`    | Conversation ID does not exist           | `"Conversation not found"` |

---

## 4. Chat Endpoints

### 4.1 POST /chat

Send a user message and receive the AI response as a real-time SSE stream.

**Authentication:** Required

**Content-Type (Response):** `text/event-stream`

> **Note:** This endpoint does **not** use the standard JSON response format. It opens an SSE stream that stays active until the AI finishes generating. See [Section 5](#5-sse-event-reference) for the full event reference.

**Request Body:**

```typescript
{
  conversationId: UUID // Must exist and belong to the authenticated user
  message: string // The user's question. Min 1 char, max 4000 chars.
}
```

**Request Example:**

```json
{
  "conversationId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
  "message": "What was Apple's net income in 2023?"
}
```

**Response Headers (on success):**

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Response Body:** A sequence of SSE events. See [Section 5](#5-sse-event-reference).

**Error Responses (returned as `application/json` before the stream opens):**

| Status                    | Condition                                | Message                                                   |
| ------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `400 Bad Request`         | `conversationId` missing or invalid UUID | `"conversationId must be a UUID"`                         |
| `400 Bad Request`         | `message` empty or too long              | `"message must be between 1 and 4000 characters"`         |
| `401 Unauthorized`        | Invalid or missing token                 | `"Unauthorized"`                                          |
| `403 Forbidden`           | Conversation belongs to a different user | `"Forbidden"`                                             |
| `404 Not Found`           | Conversation does not exist              | `"Conversation not found"`                                |
| `429 Too Many Requests`   | User's hourly spending limit reached     | See below                                                 |
| `503 Service Unavailable` | OpenAI API unreachable                   | `"AI service temporarily unavailable. Please try again."` |

**429 Error Body:**

```typescript
{
  statusCode: 429
  message: string // "You have reached your hourly usage limit."
  resetIn: number // Seconds until the limit resets
}
```

```json
{
  "statusCode": 429,
  "message": "You have reached your hourly usage limit. Your budget will reset in 42 minutes.",
  "resetIn": 2520
}
```

---

### 4.2 POST /chat/stop

Abort an in-progress AI stream. The partial response generated so far is preserved.

**Authentication:** Required

**Request Body:**

```typescript
{
  conversationId: UUID // The conversation containing the active stream
  messageId: UUID // The ID of the assistant message currently streaming
}
```

> **Note:** The `messageId` is communicated to the frontend in the `started` SSE event emitted at the beginning of every stream (see [Section 5](#5-sse-event-reference)).

**Request Example:**

```json
{
  "conversationId": "c1d2e3f4-a5b6-7890-cdef-012345678901",
  "messageId": "m3c4d5e6-f7a8-9012-hijk-444444444444"
}
```

**Success Response — `200 OK`:**

```typescript
{
  messageId: UUID
  stopped: boolean // true if stream was active and stopped; false if already done
  content: string // Partial content saved
}
```

```json
{
  "messageId": "m3c4d5e6-f7a8-9012-hijk-444444444444",
  "stopped": true,
  "content": "Apple's net income in 2023 was **$96.99 billion**,"
}
```

**Error Responses:**

| Status             | Condition                                          | Message                      |
| ------------------ | -------------------------------------------------- | ---------------------------- |
| `400 Bad Request`  | Missing or invalid fields                          | `"messageId must be a UUID"` |
| `401 Unauthorized` | Invalid token                                      | `"Unauthorized"`             |
| `403 Forbidden`    | Message belongs to a different user's conversation | `"Forbidden"`                |
| `404 Not Found`    | No active stream found for this messageId          | `"No active stream found"`   |

---

## 5. SSE Event Reference

The `POST /chat` endpoint streams a series of newline-delimited JSON events. Each event has the format:

```
data: <JSON string>\n\n
```

### 5.1 Event Type: `started`

Emitted immediately when the stream opens, before any AI processing begins.

```typescript
{
  type: "started"
  messageId: UUID // ID of the assistant message being created
}
```

```
data: {"type":"started","messageId":"m3c4d5e6-f7a8-9012-hijk-444444444444"}\n\n
```

**Frontend action:** Store `messageId` so it can be passed to `POST /chat/stop` if the user clicks Stop.

---

### 5.2 Event Type: `tool_start`

Emitted when the AI decides to call the `execute_sql` tool.

```typescript
{
  type: "tool_start"
}
```

```
data: {"type":"tool_start"}\n\n
```

**Frontend action:** Render a `SqlToolBlock` component in loading state.

---

### 5.3 Event Type: `tool_query`

Emitted once the full SQL query string has been assembled from the streaming tool call arguments.

```typescript
{
  type: "tool_query"
  query: string // The SQL query to be executed
}
```

```
data: {"type":"tool_query","query":"SELECT net_income FROM financial_data WHERE company = 'Apple' AND year = 2023"}\n\n
```

**Frontend action:** Display the SQL query in the `SqlToolBlock` with syntax highlighting.

---

### 5.4 Event Type: `tool_end`

Emitted after the SQL query has been executed and results returned to the AI.

```typescript
{
  type: "tool_end"
  rowCount: number // Number of rows returned by the query
}
```

```
data: {"type":"tool_end","rowCount":1}\n\n
```

**Frontend action:** Update `SqlToolBlock` to "Completed" state. Show row count badge. Transition streaming state to `STREAMING_ANSWER`.

---

### 5.5 Event Type: `token`

Emitted for each text token in the final AI response.

```typescript
{
  type: "token"
  content: string // A single token or short string fragment
}
```

```
data: {"type":"token","content":"Apple"}\n\n
data: {"type":"token","content":"'s net income"}\n\n
data: {"type":"token","content":" in 2023 was"}\n\n
data: {"type":"token","content":" **$96.99 billion**."}\n\n
```

**Frontend action:** Append each token to the message buffer. Render the accumulated buffer as Markdown ~60fps.

---

### 5.6 Event Type: `done`

Emitted once when the AI has finished generating and all data has been persisted.

```typescript
{
  type: "done"
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    estimatedCostUsd: number // Floating point, e.g. 0.000387
  }
  isPartial: boolean // true if generation was stopped by the user
}
```

```
data: {"type":"done","usage":{"promptTokens":312,"completionTokens":42,"totalTokens":354,"estimatedCostUsd":0.000387},"isPartial":false}\n\n
```

**Frontend action:** Finalise the message in the UI. Invalidate the TanStack Query cache for this conversation. Hide the Stop button. Unlock the input field.

---

### 5.7 Event Type: `tool_error`

Emitted if the SQL validation fails (e.g., the AI generated invalid SQL). The stream closes after this event.

```typescript
{
  type: "tool_error"
  message: string // Description of what failed
}
```

```
data: {"type":"tool_error","message":"Generated SQL failed validation: only SELECT queries are permitted"}\n\n
```

**Frontend action:** Display the error inside the `SqlToolBlock`. Show a retry prompt.

---

### 5.8 Event Type: `error`

Emitted for unexpected errors (e.g., OpenAI API failure mid-stream). The stream closes after this event.

```typescript
{
  type: "error"
  message: string
}
```

```
data: {"type":"error","message":"AI service error. Please try again."}\n\n
```

**Frontend action:** Show an error toast. Unlock the input field.

---

### 5.9 Complete Event Sequence (Happy Path)

```
data: {"type":"started","messageId":"m3c4d5e6-..."}\n\n
data: {"type":"tool_start"}\n\n
data: {"type":"tool_query","query":"SELECT net_income FROM financial_data WHERE company = 'Apple' AND year = 2023"}\n\n
data: {"type":"tool_end","rowCount":1}\n\n
data: {"type":"token","content":"Apple"}\n\n
data: {"type":"token","content":"'s net income in 2023"}\n\n
data: {"type":"token","content":" was **$96.99 billion**."}\n\n
data: {"type":"done","usage":{"promptTokens":312,"completionTokens":42,"totalTokens":354,"estimatedCostUsd":0.000387},"isPartial":false}\n\n
```

---

## 6. Error Response Reference

### 6.1 Standard Error Codes

| HTTP Status                 | When Used                                                                |
| --------------------------- | ------------------------------------------------------------------------ |
| `400 Bad Request`           | DTO validation failure (missing field, wrong type, constraint violation) |
| `401 Unauthorized`          | JWT missing, malformed, expired, or revoked                              |
| `403 Forbidden`             | Authenticated user does not own the requested resource                   |
| `404 Not Found`             | Resource with the given ID does not exist                                |
| `409 Conflict`              | Uniqueness constraint violation (e.g., duplicate email)                  |
| `429 Too Many Requests`     | User's hourly spending limit has been reached                            |
| `500 Internal Server Error` | Unexpected server error (must never include stack traces in production)  |
| `503 Service Unavailable`   | Upstream dependency (OpenAI API) unreachable                             |

### 6.2 Validation Error Shape (400)

NestJS ValidationPipe returns a structured error body for DTO validation failures:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

### 6.3 Never Expose Internals

The following must **never** appear in a production API response:

- Stack traces
- SQL query text (except inside SSE `tool_query` events, where it is intentional)
- Database error messages
- Environment variable names
- Internal service URLs

---

## Appendix: Endpoint Summary

| Method   | Path                 | Auth | Description                                |
| -------- | -------------------- | ---- | ------------------------------------------ |
| `POST`   | `/auth/register`     | ❌   | Register new user                          |
| `POST`   | `/auth/login`        | ❌   | Login, receive JWT                         |
| `GET`    | `/auth/me`           | ✅   | Get current user profile                   |
| `POST`   | `/conversations`     | ✅   | Create new conversation                    |
| `GET`    | `/conversations`     | ✅   | List user's conversations                  |
| `GET`    | `/conversations/:id` | ✅   | Get conversation with messages             |
| `DELETE` | `/conversations/:id` | ✅   | Delete conversation permanently            |
| `POST`   | `/chat`              | ✅   | Send message, stream AI response (SSE)     |
| `POST`   | `/chat/stop`         | ✅   | Abort active stream, save partial response |
