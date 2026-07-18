# CLAUDE.md — Backend (NestJS)

> Scoped rules for the `backend/` directory.
> The root `CLAUDE.md` also applies — read it first.

---

## What This Is

NestJS 10 + TypeScript 5 (strict) REST API + SSE streaming server.

---

## Commands

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Production build
npm run build && npm run start:prod

# Unit tests
npm test

# Unit tests (watch)
npm run test:watch

# Test coverage
npm run test:cov

# Integration tests
npm run test:integration

# Run TypeScript compiler check (no emit)
npx tsc --noEmit

# Run a specific migration
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

---

## Module Structure

```
src/
├── main.ts                    # Bootstrap only — no logic
├── app.module.ts              # Root module — imports feature modules
├── config/
│   ├── database.config.ts     # TypeORM config from env
│   ├── redis.config.ts        # Redis config from env
│   └── anthropic.config.ts    # Anthropic Claude config from env
└── modules/
    ├── auth/                  # Register, login, JWT
    ├── chat/                  # AI orchestration, SSE streaming
    ├── conversations/         # Conversation CRUD
    ├── usage/                 # Spend tracking, UsageGuard
    └── database/              # Entities + migrations
```

---

## Key Patterns

### Controller (always thin)

```typescript
@Post()
@UseGuards(JwtAuthGuard)
async sendMessage(@Request() req, @Body() dto: SendMessageDto, @Res() res: Response) {
  return this.chatService.orchestrateStream(req.user.id, dto, res);
}
```

No `if`, no DB calls, no business logic in controllers.

### Service (owns all logic)

```typescript
async findOne(userId: string, id: string): Promise<ConversationWithMessagesDto> {
  const conv = await this.repo.findOne({ where: { id } });
  if (!conv) throw new NotFoundException('Conversation not found');
  if (conv.userId !== userId) throw new ForbiddenException();
  return toConversationDto(conv);
}
```

### Guard (cross-cutting)

```typescript
// Applied via decorator — never check manually in service
@UseGuards(JwtAuthGuard, UsageGuard)
@Post('/chat')
```

### SSE Streaming

```typescript
res.setHeader("Content-Type", "text/event-stream")
res.setHeader("Cache-Control", "no-cache")
res.setHeader("X-Accel-Buffering", "no")
res.flushHeaders()
res.write(`data: ${JSON.stringify(event)}\n\n`)
```

### Password Hashing

```typescript
import * as argon2 from "@node-rs/argon2"

const hash = await argon2.hash(password) // register
const valid = await argon2.verify(hash, password) // login
```

**Node.js v26 does NOT have native Argon2.** Always use `@node-rs/argon2`.

### SQL Tool Execution

```typescript
// ALWAYS validate first — no exceptions
this.sqlToolService.validateSql(query) // throws on invalid
const { rows, rowCount } = await this.sqlToolService.execute(query)
```

---

## Entity Relationships

```
users (1) ──────< (many) conversations
conversations (1) ──────< (many) messages
financial_data (standalone, read-only by AI)
```

All `conversations` and `messages` queries **must** include `WHERE user_id = :userId`.

---

## Error Handling

| Situation                      | Exception to throw                               |
| ------------------------------ | ------------------------------------------------ |
| Resource not found             | `NotFoundException`                              |
| Resource exists but wrong user | `ForbiddenException` (NOT NotFoundException)     |
| Duplicate (e.g. email)         | `ConflictException`                              |
| Bad input beyond DTO           | `BadRequestException`                            |
| Unauthenticated                | `UnauthorizedException`                          |
| Anthropic API unavailable      | `ServiceUnavailableException`                    |
| Over usage limit               | `HttpException(429)` with `{ message, resetIn }` |

Never throw raw `Error`. Never let exceptions bubble with stack traces to the client.

---

## Logging

```typescript
private readonly logger = new Logger(ChatService.name);

this.logger.log('Stream started');          // INFO
this.logger.debug(`Executing SQL: ${q}`);  // DEBUG (dev only)
this.logger.warn('Unexpected empty result');
this.logger.error(`Anthropic error: ${e.message}`);
```

**Never** use `console.log`. **Never** log passwords, tokens, or API keys.

---

## SQL Validation Rules

`SqlToolService.validateSql()` must reject:

- Any query not starting with `SELECT`
- Queries containing `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`, `TRUNCATE`
- Queries containing `;` (multi-statement)
- Queries referencing `users`, `conversations`, or `messages` tables

---

## Redis Usage Key Pattern

```
Key:   usage:{userId}
Value: float string (e.g. "0.00482")
TTL:   USAGE_RESET_INTERVAL_SECONDS (default 3600)
```

- First write: `SETEX` (sets value + TTL atomically)
- Subsequent writes: `INCRBYFLOAT` (does NOT reset TTL)

---

## Anthropic Conversation History

Pass `SYSTEM_PROMPT` via the Messages API top-level `system` parameter (not as a message).
Cap history at `ANTHROPIC_MAX_HISTORY_MESSAGES` (default 20) messages before sending to Claude.
Tool results are sent as `user` messages containing `tool_result` content blocks (Anthropic format).

---

## Testing

- Test files co-located: `auth.service.spec.ts` next to `auth.service.ts`
- Mock all external deps in unit tests (Anthropic SDK, Redis, TypeORM repos)
- Use `@nestjs/testing` `TestingModule` for integration tests
- Never make real Anthropic API calls in tests

---

## What NOT to Do

- No logic in `main.ts` beyond bootstrap
- No business logic in controllers
- No direct `dataSource.query()` calls outside `SqlToolService`
- No raw TypeORM entities returned from controllers
- No `any` in TypeScript
- No features outside `docs/01_REQUIREMENT.md`
