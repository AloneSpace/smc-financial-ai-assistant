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

## Folder Structure

Layout follows `boiler-plate.md`: shared UI in `components/`, route pages in
`pages/`, the API layer in `services/`, global client state in `store/`
(Zustand), and helpers in `utils/`. `features/` holds only feature-specific
components, hooks, and types.

```
src/
├── assets/                  # Images, fonts, static assets
├── components/
│   ├── ui/                  # shadcn/ui primitives: button, input, label, alert, dialog
│   ├── common/              # Composed reusable components: ErrorToast
│   └── layout/              # Layout shells: AppLayout, AuthCard
├── features/
│   ├── auth/                # AuthGuard.tsx, types.ts
│   ├── chat/                # Streaming UI + useChat
│   │   ├── components/      # ChatInput, MessageList, MessageBubble, SqlToolBlock,
│   │   │                    #   StreamingIndicator, MarkdownRenderer, DataTable,
│   │   │                    #   DataChart, EmptyConversationState, UsageLimitBanner,
│   │   │                    #   MessageSkeleton
│   │   ├── hooks/useChat.ts
│   │   └── types.ts
│   └── conversations/       # Sidebar, list, delete dialog
│       ├── components/      # ConversationSidebar, ConversationItem,
│       │                    #   ConversationSkeleton, DeleteConfirmationDialog
│       ├── hooks/           # useConversations.ts, useConversation.ts
│       └── types.ts
├── pages/                   # Route-level pages: LoginPage, RegisterPage, ChatPage
├── services/                # API layer
│   ├── api.ts               # Axios instance with JWT interceptor (+ API_ORIGIN)
│   ├── queryClient.ts       # TanStack QueryClient
│   ├── authService.ts       # /auth endpoints
│   ├── conversationsService.ts
│   └── chatService.ts       # SSE stream + /chat/stop
├── store/
│   └── authStore.ts         # Zustand auth store (useAuthStore)
├── utils/
│   ├── cn.ts                # Tailwind class merge
│   ├── token.ts             # JWT get/set/clear (memory + localStorage)
│   └── theme.ts             # System colour-scheme sync
├── App.tsx                  # Root component: providers + router
└── main.tsx                 # Entry point (applies theme, kicks off auth initialize)
```

---

## Key Patterns

### Global State — Zustand (NOT Context/Redux)

```typescript
// store/authStore.ts — global client state lives in a Zustand store
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    const { accessToken, user } = await authService.login(credentials)
    setToken(accessToken)
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    clearToken()
    set({ user: null, isAuthenticated: false })
  },
}))

// Consume via selectors — never destructure the whole store
const login = useAuthStore((s) => s.login)
const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
```

`initialize()` (persisted-token check) runs once from `main.tsx`, not a provider.

### Auth — JWT Interceptor

```typescript
// services/api.ts
api.interceptors.request.use((config) => {
  const token = getToken() // from utils/token (memory + localStorage)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
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
  queryFn: () => conversationsService.get(id),
});

// Always handle loading + error
if (isLoading) return <MessageSkeleton />;
if (isError) return <ErrorState />;
```

### Streaming — ReadableStream (NOT EventSource)

```typescript
// services/chatService.ts (driven by features/chat/hooks/useChat.ts)
// Must use fetch(), not EventSource — EventSource cannot send Authorization header
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
- **No prop drilling beyond 2 levels** — use the Zustand store or query hooks
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
- No React Context or Redux for global state — use a Zustand store in `store/`
- No `useState` to cache server data — use TanStack Query
- No `useState` for streaming token accumulation — use `useRef`
- No array index as list `key`
- No raw server error messages shown to users
- No hardcoded API base URLs — use `import.meta.env.VITE_API_URL`
- No features outside `docs/01_REQUIREMENT.md`
- No `any` in TypeScript
- No `dangerouslySetInnerHTML` — use `react-markdown`
