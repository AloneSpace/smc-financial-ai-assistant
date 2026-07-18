# REQUIREMENTS.md

# Financial AI Chat Assistant

**Interview Take-home Assignment - Requirement Specification**

---

# Project Overview

Build an AI-powered financial chat application that allows authenticated users to ask questions about financial statements of U.S. public companies.

The assistant **must answer only from the provided PostgreSQL database** and **must never hallucinate financial information**.

The application should provide a polished chat experience with streaming responses, visible SQL tool execution, conversation history, authentication, and usage limit control.

---

# Objectives

- Build a modern AI Chat application.
- Ensure every answer is grounded in SQL data.
- Prevent hallucinated financial information.
- Provide an excellent user experience.
- Produce production-quality architecture and documentation.

---

# Tech Stack

## Frontend

- React
- TypeScript
- shadcn/ui
- Tailwind CSS

## Backend

- NestJS
- PostgreSQL
- Redis
- OpenAI API

## Infrastructure

- Docker Compose

---

# Functional Requirements

## 1. User Authentication

The system shall provide:

- User Registration
- User Login
- User Logout

Requirements

- Users authenticate securely.
- Users only access their own data.
- Conversations are isolated per user.

---

## 2. AI Chat

Users can ask financial questions such as

- Company Revenue
- Net Income
- Operating Income
- Gross Profit
- Multi-company comparisons
- Multi-year comparisons

Example

> What was Apple's net income in 2023?

---

## 3. SQL Grounding

Every AI response must be generated from PostgreSQL data.

Workflow

User Question

↓

LLM

↓

SQL Tool

↓

PostgreSQL

↓

SQL Result

↓

LLM

↓

Final Response

### Rules

- Never fabricate numbers.
- Never estimate values.
- Never answer from model knowledge.
- Every answer must come from SQL results.

---

## 4. SQL Tool Calling

Whenever the AI executes SQL, the UI must visibly display the tool execution.

Example

```text
Executing SQL...

SELECT ...

Running...

Completed
```

Users should clearly understand that data is retrieved from the database.

---

## 5. Streaming Response

Responses must stream token-by-token.

Requirements

- Real-time streaming
- Smooth UX
- Partial response visible immediately
- Stop generation supported

---

## 6. Markdown Rendering

Assistant responses should correctly render

- Headings
- Lists
- Tables
- Code blocks
- Markdown formatting

---

## 7. Table Rendering

Whenever multiple rows are returned, render them as tables.

Example

| Company | Revenue |
| ------- | ------- |

---

## 8. Chart Rendering

When financial trends are requested, display charts.

Examples

- Revenue by Year
- Net Income Comparison
- Company Ranking

Recommended charts

- Line Chart
- Bar Chart

---

## 9. Conversation Management

The application must support

- Create Conversation
- Open Previous Conversation
- Conversation History
- Delete Conversation

---

## 10. Delete Conversation

Deleting a conversation requires confirmation.

Expected Flow

User

↓

Confirmation Dialog

↓

Delete

↓

Conversation Removed

---

## 11. Stop Generation

Users may stop AI generation at any time.

Requirements

- Stop streaming immediately
- Preserve generated content
- Save partial response
- Usage cost still deducted

---

## 12. Browser Refresh

Refreshing the browser should

- Reload conversation history
- Preserve message order
- Prevent duplicates
- Continue normal usage

---

## 13. Usage Limit

Each user has a configurable spending limit.

Default

- Budget: $1
- Reset Interval: 1 Hour

Requirements

- Track usage
- Reject requests after limit exceeded
- Display friendly message
- Automatically reset usage

---

# Database Requirements

Database

PostgreSQL

Provided SQL Dump

financial_data.sql

Dataset

- 48 Companies
- Years 2022-2025
- 192 Rows

Columns

- company
- ticker
- sector
- year
- revenue
- gross_profit
- operating_income
- net_income

---

# Data Constraints

The dataset only contains

- 48 companies
- Years 2022-2025

If requested data does not exist,

the assistant must reply

> The requested data is not available in the database.

Never fabricate financial information.

---

# Infrastructure Requirements

Docker Compose must include

- PostgreSQL
- Redis

Requirements

- Easy local setup
- SQL restore process
- Environment configuration

---

# Redis Requirements

Redis should be used for

- Usage tracking
- Reset interval
- Optional caching

---

# OpenAI Requirements

The application must use OpenAI API.

Required capabilities

- Tool Calling
- Streaming Responses

---

# API Requirements

Suggested APIs

Authentication

- POST /auth/register
- POST /auth/login
- GET /auth/me

Chat

- POST /chat
- POST /chat/stop

Conversation

- GET /conversations
- GET /conversations/:id
- DELETE /conversations/:id

---

# Non-functional Requirements

## Performance

- Streaming responses
- Responsive interface
- Fast database queries

---

## Reliability

- No hallucination
- Stable conversation history
- Correct SQL execution

---

## Security

- Authentication
- User isolation
- Protected APIs

---

## Maintainability

- Modular architecture
- Clean code
- Feature-based structure

---

## User Experience

The application should feel

- Modern
- Responsive
- Clean
- Easy to understand

Loading, streaming, and tool execution should all provide visual feedback.

---

# Baseline Scenarios

## S1 — Valid Financial Question

Example

> What was Apple's net income in 2023?

Expected

- SQL executed
- Streamed response
- Correct answer
- Markdown rendering
- Table or Chart when appropriate

Status

- [ ]

---

## S2 — Missing Data

Example

> Apple Revenue in 2021

Expected

- Inform the user data is unavailable.
- Never fabricate numbers.

Status

- [ ]

---

## S3 — Stop Generation

Expected

- Stop streaming
- Save partial response
- Deduct usage cost

Status

- [ ]

---

## S4 — Usage Limit Exceeded

Expected

- Reject request
- Friendly message
- No server error

Status

- [ ]

---

## S5 — Browser Refresh

Expected

- Restore conversation
- Preserve order
- No duplicate messages

Status

- [ ]

---

## S6 — Delete Conversation

Expected

- Confirmation dialog
- Conversation removed permanently

Status

- [ ]

---

# Hidden Requirements (Architecture Considerations)

Although not explicitly required, the following are strongly recommended.

## Backend

- Clean Architecture
- Thin Controllers
- Business Logic in Services
- Repository Pattern (optional)
- DTO Validation
- JWT Authentication

---

## Frontend

- Feature-based Architecture
- Reusable Components
- TanStack Query
- React Hook Form
- Zod Validation

---

## AI Layer

- SQL Tool Isolation
- Prompt Protection
- No Direct Database Access by LLM
- SQL Validation
- Structured Tool Calling

---

## UX

- Loading States
- Empty States
- Error States
- Smooth Streaming Animation
- Visible SQL Execution
- Markdown Rendering
- Table Rendering
- Chart Rendering

---

# Deliverables

The final submission should include

- Complete Source Code
- Docker Compose
- PostgreSQL Loader
- README
- Environment Configuration
- Documentation
- Working Application

The application must successfully pass all baseline scenarios (S1-S6).

---

# Evaluation Criteria

| Category                   | Weight |
| -------------------------- | ------ |
| Correctness (S1-S6)        | 40%    |
| UI / UX                    | 25%    |
| Engineering & Code Quality | 25%    |
| Documentation              | 10%    |
