# Product Requirements Document (PRD)

**Project:** Financial AI Chat Assistant  
**Version:** 1.0  
**Status:** Planning  
**Date:** 2026-07-14  
**Author:** Architecture Team

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals](#3-goals)
4. [Target Users](#4-target-users)
5. [User Stories](#5-user-stories)
6. [Functional Features](#6-functional-features)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Success Metrics](#8-success-metrics)
9. [Out of Scope](#9-out-of-scope)

---

## 1. Project Overview

The **Financial AI Chat Assistant** is a full-stack web application that allows authenticated users to ask natural-language questions about the financial performance of US public companies.

Every answer the assistant produces is **grounded exclusively in PostgreSQL data** retrieved via SQL Tool Calling. The assistant never fabricates, estimates, or infers financial figures from its training knowledge. When data is not available in the database, it explicitly says so.

The application provides a polished, real-time chat experience with:

- Token-by-token streaming responses
- Visible SQL tool execution rendered in the UI
- Markdown, table, and chart rendering for rich financial analysis
- Full conversation history, per-user isolation, and a configurable usage spending limit

---

## 2. Problem Statement

### 2.1 The Hallucination Problem

General-purpose language models (LLMs) can and do fabricate financial figures with high confidence. For a financial context, this is unacceptable. A user asking "What was Apple's net income in 2023?" must receive the exact figure from the database — not an approximation from model weights.

### 2.2 The Access Problem

Raw financial data lives in a database. Most non-technical users cannot write SQL. There is no ergonomic interface for asking ad-hoc analytical questions over financial data tables.

### 2.3 The Trust Problem

When an AI answers a financial question, the user has no way to know whether the answer is fabricated or retrieved. Making the SQL execution step visible in the UI addresses this trust gap directly.

### 2.4 Summary

| Problem                                       | Impact                                    |
| --------------------------------------------- | ----------------------------------------- |
| LLM hallucination on financial figures        | Incorrect data leads to wrong decisions   |
| No natural-language interface to financial DB | Non-technical users cannot query data     |
| Opaque AI reasoning                           | Users cannot verify the source of answers |
| No conversation history                       | Users cannot revisit past queries         |
| Unconstrained AI usage                        | Unbounded OpenAI API costs per user       |

---

## 3. Goals

### 3.1 Primary Goals

| #   | Goal                                                                      | Priority |
| --- | ------------------------------------------------------------------------- | -------- |
| G1  | Every AI answer is sourced exclusively from the PostgreSQL database       | P0       |
| G2  | Zero hallucinated financial figures                                       | P0       |
| G3  | SQL tool execution is visibly rendered in the chat UI as it happens       | P0       |
| G4  | Responses stream token-by-token in real time                              | P0       |
| G5  | Authenticated users can manage their own conversation history             | P1       |
| G6  | Per-user configurable spending limit is enforced and resets automatically | P1       |
| G7  | Application handles all six baseline scenarios (S1–S6) correctly          | P0       |

### 3.2 Secondary Goals

| #   | Goal                                                                 | Priority |
| --- | -------------------------------------------------------------------- | -------- |
| G8  | Rich data visualisation with tables and charts for multi-row results | P1       |
| G9  | Clean, modern, responsive UI using shadcn/ui and TailwindCSS         | P1       |
| G10 | Production-quality architecture suitable for FAANG-level code review | P1       |

---

## 4. Target Users

### 4.1 Primary User

**Financial Analyst / Internal Business User**

A non-technical user who needs quick answers about the revenue, net income, operating income, or gross profit of US public companies across multiple years. They ask questions in plain English and expect accurate, sourced answers with clear data visualisation.

**Characteristics:**

- Comfortable with a chat interface
- Does not write SQL
- Needs to trust that numbers are accurate
- Wants to compare companies, sectors, and time periods quickly

### 4.2 Secondary User

**Interview Evaluator / Senior Engineer**

A technical reviewer assessing the implementation quality. They will examine the codebase architecture, streaming implementation, SQL grounding mechanism, usage limit enforcement, UI polish, and documentation quality.

---

## 5. User Stories

### 5.1 Authentication

| ID    | Story                                                                                         | Acceptance Criteria                                                                           |
| ----- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| US-01 | As a new user, I can register with an email and password so that I can access the application | Registration succeeds with valid credentials; duplicate email is rejected                     |
| US-02 | As a registered user, I can log in so that I can access my conversations                      | Valid credentials return an auth token; invalid credentials are rejected with a clear message |
| US-03 | As a logged-in user, I can log out so that my session is terminated                           | Token is invalidated; user is redirected to login                                             |

### 5.2 Chat

| ID    | Story                                                                             | Acceptance Criteria                                                                     |
| ----- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| US-04 | As a user, I can type a financial question and receive a streamed answer          | Response begins streaming within 2 seconds; tokens appear in real time                  |
| US-05 | As a user, I can see the SQL query being executed as part of the answer           | A visible SQL tool call block appears in the chat before the final answer               |
| US-06 | As a user, when I ask about unavailable data, I am told clearly it does not exist | No numbers are fabricated; a plain-English "not available" message is returned          |
| US-07 | As a user, I can stop a response mid-generation                                   | Streaming stops immediately; partial content is preserved; usage cost is still deducted |
| US-08 | As a user, multi-row answers are rendered as formatted tables                     | Result sets with multiple rows render as Markdown or HTML tables                        |
| US-09 | As a user, trend or comparison queries render as charts                           | Bar/line charts are rendered for year-over-year or multi-company comparisons            |

### 5.3 Conversation Management

| ID    | Story                                                                      | Acceptance Criteria                                                                     |
| ----- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| US-10 | As a user, I can view my past conversations in a sidebar                   | All my conversations are listed, newest first                                           |
| US-11 | As a user, I can open a past conversation and see the full message history | All messages load correctly in order with no duplicates                                 |
| US-12 | As a user, I can delete a conversation after confirming                    | A confirmation dialog is shown; confirmed deletion removes the conversation permanently |
| US-13 | As a user, when I refresh the browser, my current conversation is restored | Page reload preserves the active conversation state                                     |

### 5.4 Usage Limit

| ID    | Story                                                                           | Acceptance Criteria                                                |
| ----- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| US-14 | As a user, my API spending is tracked and limited to a configurable budget      | Default limit: $1 per reset interval (default: 1 hour)             |
| US-15 | As a user, when I exceed my limit, I see a friendly message instead of an error | A clear, non-technical message explains the limit has been reached |
| US-16 | As a user, my usage resets automatically after the reset interval               | Usage counter resets after 1 hour; new requests are accepted       |

---

## 6. Functional Features

### 6.1 Feature: User Authentication

**Description:** Standard email/password registration and login with JWT-based session management.

**Requirements:**

- `POST /auth/register` — create a new user account
- `POST /auth/login` — authenticate and receive a JWT
- `GET /auth/me` — return the authenticated user's profile
- Passwords are hashed (Argon2id)
- JWT tokens carry user identity for downstream authorization
- Each user's conversations are fully isolated

---

### 6.2 Feature: AI Chat with SQL Grounding

**Description:** The user sends a natural-language financial question. The backend forwards it to OpenAI with a defined SQL tool. OpenAI calls the tool, the backend executes the SQL against PostgreSQL, returns the result to OpenAI, and OpenAI produces a final answer.

**SQL Tool Flow:**

```
User Message
    → NestJS Backend
    → OpenAI (with SQL tool definition)
    → OpenAI calls execute_sql(query)
    → Backend validates + executes SQL on PostgreSQL
    → Result returned to OpenAI
    → OpenAI generates final answer
    → Answer streamed to frontend
```

**Rules:**

- LLM is never given direct database access
- All SQL is validated before execution (read-only SELECT only)
- No financial data may come from model weights
- If data is not in the database, the answer must say so

---

### 6.3 Feature: SQL Tool Visibility

**Description:** When a SQL tool call is in progress, the frontend renders a visible component showing:

1. "Executing SQL..." indicator
2. The SQL query itself (syntax-highlighted)
3. "Running..." status
4. "Completed" status once results are returned

This component streams into the chat in real time alongside the response.

---

### 6.4 Feature: Streaming Responses

**Description:** AI responses are delivered token-by-token using Server-Sent Events (SSE) or chunked HTTP streaming from the NestJS backend.

**Requirements:**

- Response begins streaming within 2 seconds of submission
- Each token appears immediately as it is generated
- Partial content is visible and readable during generation
- Stop Generation is supported at any point
- Markdown is rendered progressively as tokens arrive

---

### 6.5 Feature: Rich Response Rendering

**Description:** Final AI responses may include:

| Format     | Condition                                  | Component                      |
| ---------- | ------------------------------------------ | ------------------------------ |
| Plain text | Simple single-value answers                | Markdown renderer              |
| Markdown   | Headers, lists, bold, italic               | `react-markdown` or equivalent |
| Table      | Multi-row result sets (≥2 rows)            | HTML/Markdown table            |
| Bar Chart  | Year-over-year for a single company/metric | Recharts BarChart              |
| Line Chart | Trend over time                            | Recharts LineChart             |
| Code Block | SQL displayed in tool call                 | Syntax-highlighted code block  |

---

### 6.6 Feature: Conversation Management

**Description:** Each authenticated user can create, view, and delete conversations.

**Requirements:**

- Conversations are created automatically on first message
- Conversation list is displayed in a sidebar, sorted by last activity
- Clicking a conversation loads its full message history
- Deleting a conversation requires explicit user confirmation
- Browser refresh restores the current conversation from the server

---

### 6.7 Feature: Stop Generation

**Description:** While an AI response is streaming, the user can click "Stop" to halt generation.

**Requirements:**

- Streaming stops immediately on the server side
- Partial content generated so far is preserved in the database
- The partial message appears in the conversation as the final message
- The OpenAI token cost up to the point of stopping is still deducted from the user's usage budget

---

### 6.8 Feature: Usage Limit Enforcement

**Description:** Each user has a configurable spending limit tracked in Redis.

**Configuration (defaults):**

- Budget: `$1.00`
- Reset interval: `1 hour`

**Requirements:**

- Every successful AI chat request increments the user's usage in Redis
- Usage is calculated from actual OpenAI API token consumption
- When a user's cumulative spend reaches or exceeds the budget, further requests are rejected
- The rejection response is a clean, user-friendly message (not a 500 error)
- Usage resets automatically after the configured interval (TTL on the Redis key)
- Configuration values should be in environment variables

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Requirement                   | Target                        |
| ----------------------------- | ----------------------------- |
| Time to first streaming token | < 2 seconds                   |
| PostgreSQL query execution    | < 500ms for any dataset query |
| Chat message persistence      | < 100ms (async, non-blocking) |
| Frontend initial load         | < 3 seconds                   |
| Conversation list load        | < 1 second                    |

### 7.2 Reliability

| Requirement                           | Target                                             |
| ------------------------------------- | -------------------------------------------------- |
| AI hallucination rate                 | 0% — system design prevents it entirely            |
| SQL execution errors surfaced to user | Yes — clean error message, never raw stack trace   |
| Data integrity                        | Conversation messages are never lost or duplicated |
| Stop generation consistency           | Partial message always saved                       |

### 7.3 Security

| Requirement              | Notes                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Authentication           | JWT required on all protected endpoints                                            |
| User isolation           | Users can only access their own conversations                                      |
| SQL injection prevention | All SQL executed via parameterized tool call; backend validates SQL is SELECT-only |
| Password security        | Passwords hashed with argon2 before storage; never stored in plaintext             |
| Environment secrets      | API keys and DB credentials stored in `.env`, never committed                      |
| CORS                     | Restricted to known frontend origin                                                |

### 7.4 Maintainability

| Requirement            | Notes                                                           |
| ---------------------- | --------------------------------------------------------------- |
| Architecture           | Feature-based folder structure (NestJS modules, React features) |
| Separation of concerns | Controllers thin, business logic in Services                    |
| Type safety            | TypeScript strict mode throughout                               |
| Validation             | DTO validation with `class-validator` on all API inputs         |
| Documentation          | This document set; inline JSDoc on complex functions            |

### 7.5 User Experience

| Requirement         | Notes                                                     |
| ------------------- | --------------------------------------------------------- |
| Streaming animation | Smooth token-by-token cursor animation                    |
| Loading states      | Skeletons or spinners for async operations                |
| Empty states        | Informative empty state when no conversations exist       |
| Error states        | Friendly, actionable error messages for all failure modes |
| Responsive layout   | Works on desktop browsers (mobile is out of scope)        |

---

## 8. Success Metrics

### 8.1 Correctness (Weight: 40%)

| Scenario                  | Expected Result                                                      |
| ------------------------- | -------------------------------------------------------------------- |
| S1 — Valid question       | Correct answer, streamed, SQL visible, Markdown/table/chart rendered |
| S2 — Missing data         | "Data not available" message, zero fabricated numbers                |
| S3 — Stop generation      | Stream stops, partial content saved, usage deducted                  |
| S4 — Usage limit exceeded | Friendly rejection, no server error                                  |
| S5 — Browser refresh      | Conversation restored, order preserved, no duplicates                |
| S6 — Delete conversation  | Confirmation shown, conversation permanently removed                 |

### 8.2 UI/UX (Weight: 25%)

- Chat interface is visually polished and modern
- Streaming animation is smooth
- SQL tool execution block is clearly visible and readable
- Tables and charts render correctly for appropriate queries
- All loading, error, and empty states are implemented

### 8.3 Engineering Quality (Weight: 25%)

- Clean NestJS module structure
- Business logic isolated in Services
- TypeScript strict mode, no `any`
- Proper error handling throughout
- No hardcoded credentials or financial values

### 8.4 Documentation (Weight: 10%)

- All documents in this `docs/` folder are complete
- `README.md` enables a new developer to run the project with Docker in under 10 minutes
- API design is clear and consistent

---

## 9. Out of Scope

The following are explicitly **not** part of this project:

| Item                                  | Reason                                         |
| ------------------------------------- | ---------------------------------------------- |
| Real-time or live market data         | Only the provided static dataset is used       |
| Data for years outside 2022–2025      | Not in the provided SQL dump                   |
| Companies not in the provided dataset | Not in the provided SQL dump                   |
| Financial advice or recommendations   | The assistant reports data only, never advises |
| Portfolio management or tracking      | Out of product scope                           |
| Mobile-responsive design              | Desktop browser is the target                  |
| Multi-tenancy / organization accounts | Single-user account model only                 |
| Admin dashboard                       | No admin-level features required               |
| Data ingestion pipeline               | SQL dump is the only data source               |
| Multi-language support (i18n)         | English only                                   |
| Export to PDF/CSV                     | Not required                                   |
| Email notifications                   | Not required                                   |
| OAuth (Google, GitHub, etc.)          | Email/password only                            |
