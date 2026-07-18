# CLAUDE.md — Frontend (React)

> Scoped rules for the `frontend/` directory.
> The root `CLAUDE.md` also applies — read it first.

---

## What This Is

React 18 + TypeScript 5 (strict) SPA built with Vite. Communicates with the NestJS backend via REST and SSE streaming.

---

## Commands

```bash
# Install dependencies
npm install

# Development server (HMR)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Unit tests (Vitest)
npm test

# Unit tests (watch)
npm run test:watch

# TypeScript check (no emit)
npx tsc --noEmit

# Lint
npm run lint
```

---

## Feature Folder Structure

```
src/
├── app/
│   ├── App.tsx             # Router outlet only
│   ├── router.tsx          # Route definitions + AuthGuard wiring
│   └── providers.tsx       # QueryClientProvider, AuthContext, Toaster
├── features/
│   ├── auth/               # Login, Register, AuthContext, AuthGuard
│   │   ├── api/auth.api.ts
│   │   ├── components/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── AuthContext.tsx
│   │   ├── AuthGuard.tsx
│   │   └── types.ts
│   ├── chat/               # Chat page, streaming, SQL block, charts
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
│   └── conversations/      # Sidebar, list, delete dialog
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
    ├── components/          # AppLayout, ErrorToast, skeletons, Spinner
    ├── hooks/               # useLocalStorage, etc.
    ├── lib/
    │   ├── axios.ts         # Axios instance with JWT interceptor
    │   └── queryClient.ts   # TanStack QueryClient
    └── types/index.ts       # Global shared types
```

---

## Key Patterns

### Auth — JWT Interceptor

```typescript
// shared/lib/axios.ts
axiosInstance.interceptors.request.use((config) => {
  const token = getToken() // from AuthContext / localStorage
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) redirectToLogin()
    return Promise.reject(err)
  },
)
```

### Server State — TanStack Query

```typescript
// Always useQuery for server data — never useState
const { data, isLoading, isError } = useQuery({
  queryKey: ['conversation', id],
  queryFn: () => conversationsApi.getConversation(id),
});

// Always handle loading + error
if (isLoading) return <MessageSkeleton />;
if (isError) return <ErrorState />;
```

### Streaming — ReadableStream (NOT EventSource)

```typescript
// useStream.ts — must use fetch(), not EventSource
// EventSource cannot send Authorization header
const res = await fetch("/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(dto),
})
const reader = res.body!.getReader()
```

### Streaming — Token Buffer

```typescript
// CORRECT: accumulate tokens in useRef, flush via requestAnimationFrame
const bufferRef = useRef("")
// On token event:
bufferRef.current += event.content
// Flush ~60fps:
requestAnimationFrame(() => setDisplayContent(bufferRef.current))

// WRONG: setState on every token causes per-token re-renders
// setContent(prev => prev + token); ← DO NOT DO THIS
```

### Forms — React Hook Form + Zod

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: zodResolver(schema),
})
```

### Component Props — Always Named Interface

```typescript
// CORRECT
interface MessageBubbleProps {
  message: MessageDto;
  isStreaming?: boolean;
}
export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) { ... }

// WRONG — inline prop types
export function MessageBubble({ message }: { message: MessageDto }) { ... }
```

---

## SSE Stream State Machine

States: `IDLE → SENDING → STREAMING_TOOL → STREAMING_ANSWER → DONE`

Side exits: `ERROR`, `STOPPED`, `LIMIT_REACHED`

| Event received | State transition                                              |
| -------------- | ------------------------------------------------------------- |
| `started`      | `SENDING` — store `messageId` for stop calls                  |
| `tool_start`   | `STREAMING_TOOL` — show SqlToolBlock (loading)                |
| `tool_query`   | `STREAMING_TOOL` — populate SQL in SqlToolBlock               |
| `tool_end`     | `STREAMING_ANSWER` — mark SqlToolBlock complete + row count   |
| `token`        | `STREAMING_ANSWER` — append to `bufferRef`                    |
| `done`         | `DONE` → `IDLE` — flush buffer, save message, re-enable input |
| `tool_error`   | `ERROR` — show error in SqlToolBlock                          |
| `error`        | `ERROR` — show error toast, re-enable input                   |
| HTTP 429       | `LIMIT_REACHED` — show UsageLimitBanner                       |

---

## Query Keys Convention

```typescript
;["conversations"][("conversation", conversationId)]["user"] // list // single with messages // current user profile
```

Invalidate `['conversations']` after: create, delete, first message sent.

---

## Routes

```typescript
/login            → LoginPage       (no auth required)
/register         → RegisterPage    (no auth required)
/chat             → ChatPage        (AuthGuard required)
/chat/:id         → ChatPage        (AuthGuard required, loads conversation)
```

After first message in a new chat, update URL with `history.replaceState` (no navigation).

---

## Component Rules

- **One component per file** — no two exports from the same file
- **No prop drilling beyond 2 levels** — use Context or query hooks
- **Stable list keys** — always use `item.id`, never array index
- **Loading + error always handled** in every `useQuery` render
- **Auto-scroll** to bottom in MessageList; suspend when user scrolls up
- **ChatInput disabled** while `streamState !== IDLE`
- **Stop button `[■]`** visible only during `STREAMING_TOOL` or `STREAMING_ANSWER`

---

## Chart Signal (from AI response)

The AI includes a fenced code block to signal chart rendering:

````
```chart
{
  "type": "bar",
  "title": "Apple Revenue 2022–2025",
  "xKey": "year",
  "yKey": "revenue",
  "data": [...]
}
```
````

`MarkdownRenderer` intercepts this block and renders `DataChart`. If JSON is malformed, fall back to plain code block — never crash.

---

## Accessibility & UX

- Focus `ChatInput` on page load and on conversation switch
- `Enter` submits, `Shift+Enter` inserts newline
- Send button disabled when textarea is empty
- Delete confirmation dialog: `Cancel` is default focus (not the destructive button)
- Error toast: auto-dismiss after 5s, manual dismiss available

---

## What NOT to Do

- No `EventSource` for the `/chat` stream (cannot send `Authorization` header)
- No `useState` to cache server data — use TanStack Query
- No `useState` for streaming token accumulation — use `useRef`
- No array index as list `key`
- No raw server error messages shown to users
- No hardcoded API base URLs — use `import.meta.env.VITE_API_URL`
- No features outside `docs/01_REQUIREMENT.md`
- No `any` in TypeScript
- No `dangerouslySetInnerHTML` — use `react-markdown`
