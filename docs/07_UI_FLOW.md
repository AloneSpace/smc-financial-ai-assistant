# UI Flow Document

**Project:** Financial AI Chat Assistant  
**Version:** 1.0  
**Status:** Planning  
**Date:** 2026-07-14

---

## Table of Contents

1. [User Journey Overview](#1-user-journey-overview)
2. [Navigation & Routing](#2-navigation--routing)
3. [Layout System](#3-layout-system)
4. [Screen: Login](#4-screen-login)
5. [Screen: Register](#5-screen-register)
6. [Screen: Chat (Main)](#6-screen-chat-main)
7. [Component: Conversation Sidebar](#7-component-conversation-sidebar)
8. [Component: Message List](#8-component-message-list)
9. [Component: SQL Tool Block](#9-component-sql-tool-block)
10. [Component: Chat Input](#10-component-chat-input)
11. [Streaming States](#11-streaming-states)
12. [Markdown Rendering](#12-markdown-rendering)
13. [Table Rendering](#13-table-rendering)
14. [Chart Rendering](#14-chart-rendering)
15. [Loading States](#15-loading-states)
16. [Empty States](#16-empty-states)
17. [Error States](#17-error-states)
18. [Delete Conversation Flow](#18-delete-conversation-flow)
19. [Browser Refresh Behaviour](#19-browser-refresh-behaviour)
20. [Component Inventory](#20-component-inventory)

---

## 1. User Journey Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Complete User Journey                         │
└─────────────────────────────────────────────────────────────────────┘

New User
  ↓
/login ──── "Don't have an account?" ────→ /register
  ↓                                             ↓
Login form                               Register form
  ↓ success                                     ↓ success
  └──────────────────┬──────────────────────────┘
                     ↓
             /chat  (new conversation)
             • Empty state shown
             • Sidebar visible with no conversations
                     ↓
             User types first question
                     ↓
             Conversation auto-created
             URL → /chat/:conversationId
                     ↓
             ┌── Streaming begins ─────────────────┐
             │  1. User message appears (optimistic) │
             │  2. SqlToolBlock: "Executing SQL..."   │
             │  3. SQL query shown                    │
             │  4. SqlToolBlock: "Completed (N rows)" │
             │  5. Tokens stream in one-by-one        │
             │  6. Markdown renders progressively     │
             │  7. done event → input re-enabled      │
             └────────────────────────────────────── ┘
                     ↓
             Response fully rendered
             (table or chart if applicable)
                     ↓
             ┌── User options ─────────────────────┐
             │  • Ask follow-up question             │
             │  • Click past conversation            │
             │  • Delete conversation                │
             │  • Refresh browser (state restored)   │
             └────────────────────────────────────── ┘
```

---

## 2. Navigation & Routing

### 2.1 Route Map

| Path | Component | Auth Required | Description |
|---|---|---|---|
| `/login` | `LoginPage` | No | Login form. Redirects to `/chat` if already authenticated |
| `/register` | `RegisterPage` | No | Registration form. Redirects to `/chat` if already authenticated |
| `/chat` | `ChatPage` | Yes | New conversation view. Shows empty state. |
| `/chat/:conversationId` | `ChatPage` | Yes | Loads and displays the specified conversation |
| `*` (catch-all) | `NotFoundPage` | No | 404 page with link back to `/chat` |

### 2.2 Auth Guard Behaviour

```
User navigates to /chat
  ↓
AuthGuard checks AuthContext for valid token
  ├── Token valid → render route
  └── No token / expired → redirect to /login?redirect=/chat/:id
                                              ↑
                              After login, redirect back to original URL
```

### 2.3 URL Behaviour During Chat

When a user sends their first message in a new conversation:
1. The backend creates the conversation
2. The frontend receives the `conversationId` from the SSE `started` event
3. The URL is updated to `/chat/:conversationId` using `history.replaceState` (no page reload, no navigation)
4. The conversation appears at the top of the sidebar list

---

## 3. Layout System

### 3.1 Auth Layout (Login / Register)

```
┌────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│         ┌─────────────────────────┐             │
│         │       App Logo          │             │
│         │                         │             │
│         │   [Form Card Content]   │             │
│         │                         │             │
│         └─────────────────────────┘             │
│                                                 │
│                                                 │
└────────────────────────────────────────────────┘
  Full-viewport centered, neutral background
```

### 3.2 App Layout (Chat)

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌───────────────────────────────────────────┐ │
│  │              │  │                                           │ │
│  │  Sidebar     │  │            Chat Area                      │ │
│  │  260px fixed │  │            flex-1                         │ │
│  │              │  │                                           │ │
│  │  [Logo]      │  │  ┌──────────────────────────────────────┐ │ │
│  │              │  │  │        Message List                  │ │ │
│  │  [+ New]     │  │  │        (scrollable, flex-col)        │ │ │
│  │              │  │  │                                      │ │ │
│  │  ──────────  │  │  └──────────────────────────────────────┘ │ │
│  │              │  │                                           │ │
│  │  Conv #1     │  │  ┌──────────────────────────────────────┐ │ │
│  │  Conv #2     │  │  │           Chat Input Bar             │ │ │
│  │  Conv #3     │  │  │  [Textarea      ] [Send] / [Stop]    │ │ │
│  │              │  │  └──────────────────────────────────────┘ │ │
│  │  ──────────  │  │                                           │ │
│  │  [Logout]    │  │                                           │ │
│  └──────────────┘  └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
  100vw × 100vh, no scroll on outer container
```

| Region | Width | Scroll | Notes |
|---|---|---|---|
| Sidebar | 260px (fixed) | Vertical on conversation list | Collapsible on smaller viewports |
| Chat area | `flex-1` | Message list scrolls independently | Uses `overflow-y: auto` |
| Input bar | Full width of chat area | None | Sticky at bottom |

---

## 4. Screen: Login

### 4.1 Layout

```
┌─────────────────────────────────┐
│         💬 FinChat               │   ← App name / logo
│                                  │
│  Email                           │
│  ┌──────────────────────────┐    │
│  │ analyst@example.com      │    │
│  └──────────────────────────┘    │
│                                  │
│  Password                        │
│  ┌──────────────────────────┐    │
│  │ ••••••••••••             │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │       Sign In            │    │   ← Primary button
│  └──────────────────────────┘    │
│                                  │
│  Don't have an account?          │
│  Register here                   │   ← Link to /register
└─────────────────────────────────┘
```

### 4.2 Behaviours

| Event | Behaviour |
|---|---|
| Submit with valid credentials | Show loading spinner on button → success → redirect to `/chat` |
| Submit with wrong credentials | Show inline error: "Invalid email or password" below the form |
| Submit with empty fields | Field-level validation error: "Email is required" / "Password is required" |
| Already authenticated | Redirect immediately to `/chat` |
| Press Enter in password field | Triggers form submit |

---

## 5. Screen: Register

### 5.1 Layout

```
┌─────────────────────────────────┐
│         💬 FinChat               │
│                                  │
│  Email                           │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  Password  (min 8 characters)    │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │      Create Account      │    │
│  └──────────────────────────┘    │
│                                  │
│  Already have an account?        │
│  Sign in here                    │
└─────────────────────────────────┘
```

### 5.2 Behaviours

| Event | Behaviour |
|---|---|
| Submit with valid new email | Create account → auto-login → redirect to `/chat` |
| Submit with duplicate email | Inline error: "An account with this email already exists" |
| Password < 8 characters | Field-level error: "Password must be at least 8 characters" |
| Invalid email format | Field-level error: "Please enter a valid email address" |

---

## 6. Screen: Chat (Main)

### 6.1 New Conversation (Empty State)

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌───────────────────────────────────────────┐ │
│  │ 💬 FinChat    │  │                                           │ │
│  │              │  │                                           │ │
│  │ [+ New Chat] │  │              💬                           │ │
│  │              │  │                                           │ │
│  │  No chats    │  │   Ask a question about US company         │ │
│  │  yet.        │  │   financial data                          │ │
│  │              │  │                                           │ │
│  │              │  │   Examples:                               │ │
│  │              │  │   • "What was Apple's net income in 2023?"│ │
│  │              │  │   • "Compare NVDA and MSFT revenue 2024"  │ │
│  │              │  │   • "Top 5 companies by revenue in 2025"  │ │
│  │              │  │                                           │ │
│  │              │  │                                           │ │
│  │  ──────────  │  │ ┌─────────────────────────────────────┐  │ │
│  │  [Logout]    │  │ │ Ask about financial data...    [→]  │  │ │
│  └──────────────┘  │ └─────────────────────────────────────┘  │ │
│                    └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Active Conversation with Messages

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌───────────────────────────────────────────┐ │
│  │ 💬 FinChat    │  │  Apple Financial Analysis                 │ │
│  │              │  │ ─────────────────────────────────────────  │ │
│  │ [+ New Chat] │  │                                           │ │
│  │              │  │        ╔═══════════════════════════╗      │ │
│  │ ● Apple      │  │        ║ What was Apple's net      ║      │ │
│  │   Financial  │  │        ║ income in 2023?           ║      │ │
│  │              │  │        ╚═══════════════════════════╝      │ │
│  │   Tech Sec.  │  │        [user bubble, right-aligned]       │ │
│  │   Comparison │  │                                           │ │
│  │              │  │  ┌─────────────────────────────────────┐  │ │
│  │              │  │  │ 🔧 SQL Tool                         │  │ │
│  │              │  │  │ ────────────────────────────────    │  │ │
│  │              │  │  │ SELECT net_income                   │  │ │
│  │              │  │  │ FROM financial_data                 │  │ │
│  │              │  │  │ WHERE company = 'Apple'             │  │ │
│  │              │  │  │   AND year = 2023                   │  │ │
│  │              │  │  │                                     │  │ │
│  │              │  │  │ ✅ Completed · 1 row                │  │ │
│  │              │  │  └─────────────────────────────────────┘  │ │
│  │              │  │                                           │ │
│  │              │  │  Apple's net income in 2023 was           │ │
│  │              │  │  **$96.99 billion**.                      │ │
│  │              │  │                                           │ │
│  │  ──────────  │  │ ┌─────────────────────────────────────┐  │ │
│  │  [Logout]    │  │ │ Ask a follow-up...             [→]  │  │ │
│  └──────────────┘  │ └─────────────────────────────────────┘  │ │
│                    └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Component: Conversation Sidebar

### 7.1 Structure

```
┌──────────────────────┐
│  💬 FinChat           │   ← Logo / brand
│                       │
│  ┌──────────────────┐ │
│  │  + New Chat      │ │   ← Creates new conversation via POST /conversations
│  └──────────────────┘ │
│                       │
│  ─── Recent ───────── │
│                       │
│  ┌──────────────────┐ │
│  │ ● Apple Analysis │ │   ← Active conversation (highlighted)
│  │   2m ago         │ │
│  └──────────────────┘ │
│  ┌──────────────────┐ │
│  │  Tech Comparison │ │
│  │   1h ago         │ │
│  └──────────────────┘ │
│  ┌──────────────────┐ │
│  │  Revenue 2024    │ │
│  │   Yesterday      │ │
│  └──────────────────┘ │
│                       │
│  (scrollable list)    │
│                       │
│  ─────────────────── │
│                       │
│  ┌──────────────────┐ │
│  │  Logout          │ │
│  └──────────────────┘ │
└──────────────────────┘
```

### 7.2 Conversation Item Hover State

When a conversation item is hovered, a delete icon (🗑) appears on the right:

```
┌──────────────────────────┐
│  Tech Comparison    [🗑] │   ← trash icon appears on hover
│  1h ago                  │
└──────────────────────────┘
```

Clicking the trash icon triggers the [Delete Conversation Flow](#18-delete-conversation-flow).

### 7.3 Behaviours

| Interaction | Behaviour |
|---|---|
| Click conversation | Navigate to `/chat/:id`, load messages |
| Click "+ New Chat" | `POST /conversations`, navigate to new `/chat/:id` |
| Click Logout | Clear auth token, redirect to `/login` |
| New conversation created | Inserted at the top of the list |
| Conversation deleted | Removed from list; if it was active, show empty state |
| Active conversation | Highlighted with left border accent and background tint |

---

## 8. Component: Message List

### 8.1 Message Bubble Types

#### User Message (right-aligned)

```
                 ╔════════════════════════════════╗
                 ║  What was Apple's net income   ║
                 ║  in 2023?                      ║
                 ╚════════════════════════════════╝
                                    user@example.com · 10:06
```

- Background: primary colour (e.g. blue-600)
- Text: white
- Alignment: right
- Max width: 70% of chat area

#### Assistant Message (left-aligned)

```
  🤖
  ┌──────────────────────────────────────────────────────┐
  │  [SqlToolBlock — see Section 9]                       │
  │                                                       │
  │  Apple's net income in 2023 was **$96.99 billion**.   │
  │  This represents a slight decrease from $99.80B       │
  │  in 2022, driven by lower iPhone demand in...         │
  └──────────────────────────────────────────────────────┘
  AI Assistant · 10:06
```

- Background: neutral card (e.g. gray-50 / dark:gray-800)
- Text: default
- Alignment: left
- Max width: 85% of chat area (wider to accommodate tables and charts)

### 8.2 Message Auto-Scroll

- The message list auto-scrolls to the bottom when:
  - A new message is appended
  - A streaming token is received
- Auto-scroll is **suspended** if the user manually scrolls up
- Auto-scroll **resumes** when the user scrolls back to the bottom
- A "↓ Scroll to bottom" button appears when suspended

### 8.3 Partial Message Indicator

When a conversation is loaded and the last assistant message has `isPartial: true`:

```
  🤖
  ┌──────────────────────────────────────────────────────┐
  │  Apple's net income in 2023 was **$96.99 billion**,  │
  │  ▌                                                   │
  │                          ── Generation was stopped ── │
  └──────────────────────────────────────────────────────┘
```

---

## 9. Component: SQL Tool Block

The `SqlToolBlock` appears inside assistant message bubbles. It has three visual states.

### 9.1 State 1: Executing (tool_start received)

```
┌──────────────────────────────────────────────────────┐
│  🔧 SQL Tool                              ⟳ Running  │
│  ─────────────────────────────────────────────────── │
│  (preparing query...)                                 │
└──────────────────────────────────────────────────────┘
```

### 9.2 State 2: Query Visible (tool_query received)

```
┌──────────────────────────────────────────────────────┐
│  🔧 SQL Tool                              ⟳ Running  │
│  ─────────────────────────────────────────────────── │
│  SELECT net_income                                    │
│  FROM financial_data                                  │
│  WHERE company = 'Apple'                              │
│    AND year = 2023                                    │
└──────────────────────────────────────────────────────┘
```

- SQL is displayed in a monospace font
- Syntax highlighted (keywords, strings, table names)
- Collapsed if longer than 8 lines (with "Show full query" toggle)

### 9.3 State 3: Completed (tool_end received)

```
┌──────────────────────────────────────────────────────┐
│  🔧 SQL Tool                           ✅ 1 row       │
│  ─────────────────────────────────────────────────── │
│  SELECT net_income                                    │
│  FROM financial_data                                  │
│  WHERE company = 'Apple'                              │
│    AND year = 2023                                    │
└──────────────────────────────────────────────────────┘
```

- Green checkmark replaces spinner
- Row count badge displayed (e.g. "✅ 1 row", "✅ 4 rows", "⚠️ 0 rows")

### 9.4 State 4: Error (tool_error received)

```
┌──────────────────────────────────────────────────────┐
│  🔧 SQL Tool                              ❌ Failed   │
│  ─────────────────────────────────────────────────── │
│  Query validation failed.                             │
│  Only SELECT queries are permitted.                   │
└──────────────────────────────────────────────────────┘
```

---

## 10. Component: Chat Input

### 10.1 Idle State (Input enabled)

```
┌───────────────────────────────────────────────────────────────┐
│  Ask about company financials...                           [→] │
└───────────────────────────────────────────────────────────────┘
```

- `[→]` send button is disabled when textarea is empty
- Pressing `Enter` submits (Shift+Enter inserts newline)
- Textarea auto-expands up to 5 lines, then scrolls

### 10.2 Streaming State (Stop button visible)

```
┌───────────────────────────────────────────────────────────────┐
│  (input disabled during streaming)                        [■]  │
└───────────────────────────────────────────────────────────────┘
```

- Input is disabled while streaming
- `[■]` stop button replaces `[→]`
- Stop button triggers `POST /chat/stop`
- After stop, input is re-enabled

### 10.3 Usage Limit State

```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ Hourly limit reached. Resets in 42 minutes.                │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  (input disabled)                                         [→]  │
└────────────────────────────────────────────────────────────────┘
```

- Yellow/amber banner appears above input
- `resetIn` from the 429 response is used to show a countdown
- Input and send button remain disabled until the banner timer expires

---

## 11. Streaming States

### 11.1 Visual State Transitions

```
IDLE
  Input enabled, send button enabled
  ↓ (user submits)

SENDING
  Input disabled
  Stop button visible
  User message appears (optimistic)
  Assistant bubble appears as skeleton
  ↓ (tool_start event)

STREAMING_TOOL
  SqlToolBlock appears in assistant bubble (Running state)
  ↓ (tool_query event)

STREAMING_TOOL (query visible)
  SQL shown in SqlToolBlock
  ↓ (tool_end event)

STREAMING_ANSWER
  SqlToolBlock shows "Completed"
  Tokens appending to assistant bubble text
  Blinking cursor (▌) at end of text
  ↓ (done event)

DONE
  Cursor disappears
  Full message rendered (markdown, table, or chart)
  Input re-enabled
  Stop button hidden
```

### 11.2 Streaming Cursor Animation

During `STREAMING_ANSWER`, a blinking block cursor is appended to the end of the text buffer:

```
Apple's net income in 2023 was **$96.99 billion**▌
```

Implementation: the cursor `▌` character is appended to the display buffer and removed when the `done` event arrives.

### 11.3 Progressive Markdown Rendering

Markdown is rendered as tokens arrive. Because partial Markdown may be malformed mid-stream (e.g., an unclosed `**`), the renderer should:
1. Attempt to render the current buffer as Markdown
2. Fall back to plain text if the Markdown parser throws
3. Re-render each time new tokens arrive

---

## 12. Markdown Rendering

All assistant message text is passed through a Markdown renderer (`react-markdown` with `remark-gfm` for tables).

### 12.1 Supported Markdown Elements

| Element | Example Input | Rendered Output |
|---|---|---|
| Bold | `**$96.99 billion**` | **$96.99 billion** |
| Italic | `*slightly decreased*` | *slightly decreased* |
| Heading | `## Revenue Summary` | `<h2>Revenue Summary</h2>` |
| Bullet list | `- Apple\n- Google` | `<ul><li>` |
| Numbered list | `1. Apple\n2. Google` | `<ol><li>` |
| Inline code | `` `SELECT * FROM` `` | `<code>` |
| Code block | ` ```sql\nSELECT...``` ` | Syntax-highlighted block |
| Table (GFM) | `\| Col \| Col \|` | HTML table → see Section 13 |
| Blockquote | `> Note: data from 2022` | `<blockquote>` |

### 12.2 Security

- All Markdown is rendered through `react-markdown`, which **does not use `dangerouslySetInnerHTML`** with raw HTML
- HTML tags in AI responses are sanitised
- No `<script>` or event handler injection is possible

---

## 13. Table Rendering

When the AI response contains a Markdown table (GFM format), it is rendered as a styled HTML table component.

### 13.1 Example Input (from AI)

```markdown
| Company   | Year | Net Income      |
|-----------|------|-----------------|
| Apple     | 2023 | $96.99 billion  |
| Microsoft | 2023 | $72.36 billion  |
| Google    | 2023 | $73.80 billion  |
```

### 13.2 Rendered Output

```
┌───────────────┬──────┬─────────────────┐
│ Company       │ Year │ Net Income      │
├───────────────┼──────┼─────────────────┤
│ Apple         │ 2023 │ $96.99 billion  │
│ Microsoft     │ 2023 │ $72.36 billion  │
│ Google        │ 2023 │ $73.80 billion  │
└───────────────┴──────┴─────────────────┘
```

### 13.3 Table Component Behaviour

- Header row: bold, subtle background
- Row alternating: zebra striping (every other row has a tint)
- Numeric columns: right-aligned
- Horizontally scrollable if wider than the container
- No pagination in MVP (tables are bounded by the 100-row query cap)

---

## 14. Chart Rendering

When the AI response includes structured data appropriate for visualisation (e.g., year-over-year trends for a single company, or multi-company comparisons), it renders a chart.

> **Implementation note:** The AI must signal chart intent by including a specific JSON code block in its response. The frontend detects this block and renders the appropriate chart component.

### 14.1 Chart Signal Format

The AI is instructed via system prompt to include a special fenced code block when a chart is appropriate:

````
```chart
{
  "type": "bar",
  "title": "Apple Revenue 2022–2025",
  "xKey": "year",
  "yKey": "revenue",
  "yLabel": "Revenue (USD Billions)",
  "data": [
    { "year": "2022", "revenue": 394.33 },
    { "year": "2023", "revenue": 383.29 },
    { "year": "2024", "revenue": 391.04 },
    { "year": "2025", "revenue": 416.16 }
  ]
}
```
````

### 14.2 Chart Types

#### Bar Chart

Used for: comparisons across companies in a single year, or year-over-year for a single metric.

```
Revenue ($B)
  500 ┤
  400 ┤  ████████████████  ████████████  ███████
  300 ┤
  200 ┤
  100 ┤
    0 └──────────────────────────────────────────
         2022           2023           2024     2025
```

#### Line Chart

Used for: trends over time (multiple metrics or multiple companies).

```
Net Income ($B)
  120 ┤                                        ●
  100 ┤  ●                                    /
   80 ┤   \           ●                      /
   60 ┤    \         / \                    /
   40 ┤     \       /   \                  /
   20 ┤      ●─────●     ●────────────────●
    0 └──────────────────────────────────────────
        2022        2023        2024        2025
```

### 14.3 Chart Component Behaviour

- Rendered using **Recharts** (`BarChart`, `LineChart`)
- Responsive container: scales to the message bubble width
- Tooltip on hover: shows exact value
- Legend for multi-series charts
- Values formatted as `$X.XX billion` in tooltips
- Dark/light mode aware via Tailwind CSS variables

### 14.4 Fallback Behaviour

If the `chart` code block JSON is malformed, the raw code block is displayed as text rather than crashing the renderer.

---

## 15. Loading States

### 15.1 Conversation List Loading

While `GET /conversations` is in flight:

```
┌──────────────────────┐
│  ████████████████    │   ← Skeleton item
│  ████████            │
└──────────────────────┘
┌──────────────────────┐
│  ████████████████    │
│  ████████            │
└──────────────────────┘
```

Using shadcn/ui `Skeleton` component. 3 skeleton items shown.

### 15.2 Conversation Messages Loading

While `GET /conversations/:id` is in flight (e.g., user clicks a past conversation):

```
                 ╔═══════════════════╗
                 ║  ███████████      ║   ← User message skeleton
                 ╚═══════════════════╝

  ┌──────────────────────────────────────────┐
  │  ████████████████████████████████████    │   ← Assistant message skeleton
  │  ██████████████████████████              │
  │  ████████████████                        │
  └──────────────────────────────────────────┘
```

2–3 skeleton message pairs shown during load.

### 15.3 Button Loading States

- Login/Register buttons show a spinner icon when submitting
- Send button is disabled while request is in-flight
- Delete button shows a spinner during `DELETE /conversations/:id`

---

## 16. Empty States

### 16.1 No Conversations (New User)

Shown in the sidebar when `GET /conversations` returns an empty array:

```
│                      │
│   No conversations   │
│   yet.               │
│                      │
│   Start chatting     │
│   →                  │
│                      │
```

### 16.2 New Conversation (No Messages)

Shown in the main chat area when a new conversation has no messages:

```
              💬

    Ask a question about
    US company financial data

    Examples:
    "What was Apple's net income in 2023?"
    "Compare NVDA and MSFT revenue in 2024"
    "Top 5 companies by revenue in 2025"
    "Show Nvidia's revenue trend from 2022 to 2025"
```

### 16.3 No Data Found (S2 Scenario)

This is not a UI empty state — it is an AI response. When the SQL query returns 0 rows, the AI responds with a natural-language message:

> "Data for Apple in 2021 is not available in the database. This dataset covers fiscal years 2022–2025 for approximately 49 US public companies."

---

## 17. Error States

### 17.1 Authentication Error (Login / Register)

Inline form error beneath the field or form:

```
  Email
  ┌──────────────────────────────────┐
  │ wrong@email.com                  │
  └──────────────────────────────────┘
  ⚠ Invalid email or password
```

### 17.2 Usage Limit Error (S4 Scenario)

Banner above the chat input (yellow/amber):

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️  You have reached your hourly usage limit.               │
│      Your budget resets in 42 minutes.                       │
└──────────────────────────────────────────────────────────────┘
```

- Disappears automatically when the countdown reaches 0
- Input remains disabled until reset

### 17.3 AI Service Error (OpenAI Unavailable)

Error message rendered inside the assistant bubble:

```
  🤖
  ┌──────────────────────────────────────────────────────┐
  │  ❌ The AI service is temporarily unavailable.        │
  │     Please try again in a moment.                    │
  │                                                      │
  │  [Try Again]                                         │
  └──────────────────────────────────────────────────────┘
```

### 17.4 Network Error (Toast)

For unexpected network failures:

```
┌──────────────────────────────────────────────┐   ← Top-right toast
│  ❌ Connection error. Please check your      │
│     network and try again.            [✕]    │
└──────────────────────────────────────────────┘
```

- Auto-dismisses after 5 seconds
- Can be manually dismissed with `[✕]`

### 17.5 SQL Tool Error

Shown inside the `SqlToolBlock` (see [Section 9.4](#94-state-4-error-tool_error-received)).

---

## 18. Delete Conversation Flow

### 18.1 Trigger

User clicks the 🗑 (trash) icon on a conversation item in the sidebar.

### 18.2 Confirmation Dialog

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Delete Conversation                                 │
│  ─────────────────────────────────────────────────── │
│                                                      │
│  Are you sure you want to delete                     │
│  "Apple Financial Analysis"?                         │
│                                                      │
│  This action cannot be undone.                       │
│                                                      │
│      [Cancel]              [Delete]                  │
│                             (red, destructive)       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 18.3 Flow

```
User clicks 🗑 icon
  ↓
DeleteConfirmationDialog opens
  ├── User clicks Cancel → dialog closes, no action
  └── User clicks Delete
       ↓
       Delete button shows spinner
       DELETE /conversations/:id called
         ├── 204 Success:
         │     Conversation removed from sidebar list
         │     If deleted conversation was active:
         │       Navigate to /chat (empty state)
         │     Dialog closes
         └── Error:
               Toast: "Failed to delete conversation. Please try again."
               Dialog closes
```

---

## 19. Browser Refresh Behaviour (S5 Scenario)

### 19.1 On Refresh at `/chat/:conversationId`

```
1. App loads, AuthContext reads token from localStorage
2. Token valid → route renders
3. ChatPage reads :conversationId from URL params
4. useQuery(['conversation', id]) fires GET /conversations/:id
5. Loading skeleton shown during fetch
6. Messages load and render in correct order
7. Conversation highlighted in sidebar
```

### 19.2 On Refresh at `/chat` (root)

```
1. App loads, AuthContext reads token
2. ChatPage with no :conversationId
3. useQuery(['conversations']) fires GET /conversations
4. Most recent conversation loaded automatically
   OR empty state shown if no conversations exist
```

### 19.3 On Refresh at `/login` (if already authenticated)

```
AuthGuard detects valid token → redirect to /chat
```

---

## 20. Component Inventory

| Component | Location | Description |
|---|---|---|
| `LoginPage` | `features/auth/` | Login form with validation |
| `RegisterPage` | `features/auth/` | Registration form with validation |
| `AuthContext` | `features/auth/` | Global auth state (token, user) |
| `AuthGuard` | `features/auth/` | Route guard HOC |
| `AppLayout` | `app/` | Two-column layout (sidebar + chat area) |
| `ConversationSidebar` | `features/conversations/` | Left sidebar with conversation list |
| `ConversationItem` | `features/conversations/` | Single row in sidebar with hover delete |
| `DeleteConfirmationDialog` | `features/conversations/` | Modal with cancel/confirm |
| `ChatPage` | `features/chat/` | Main page: MessageList + ChatInput |
| `MessageList` | `features/chat/` | Scrollable list with auto-scroll |
| `MessageBubble` | `features/chat/` | User or assistant message container |
| `SqlToolBlock` | `features/chat/` | 4-state SQL execution visualiser |
| `MarkdownRenderer` | `features/chat/` | `react-markdown` wrapper with GFM |
| `DataTable` | `features/chat/` | Styled HTML table from Markdown GFM |
| `DataChart` | `features/chat/` | Recharts BarChart / LineChart renderer |
| `ChatInput` | `features/chat/` | Textarea + Send/Stop button |
| `StreamingIndicator` | `features/chat/` | Blinking cursor `▌` during streaming |
| `UsageLimitBanner` | `features/chat/` | Amber warning with countdown |
| `EmptyConversationState` | `features/chat/` | Placeholder with example questions |
| `MessageSkeleton` | `shared/components/` | Skeleton loader for messages |
| `ConversationSkeleton` | `shared/components/` | Skeleton loader for sidebar items |
| `ErrorToast` | `shared/components/` | Top-right dismissible toast |
| `Spinner` | `shared/components/` | Generic loading spinner |
