/**
 * Provider-agnostic contract for the AI layer.
 *
 * Both OpenAI and Anthropic are implemented behind this single interface so the
 * rest of the app (ChatService) never depends on a specific vendor SDK. Each
 * provider owns its own agentic tool loop and reports progress through the
 * normalized `AiStreamEvent` callback.
 */

/** Injection token for the currently-selected provider implementation. */
export const AI_PROVIDER = 'AI_PROVIDER';

/** A single turn of conversation history sent to the model. */
export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Vendor-neutral description of a callable tool. */
export interface AiToolDefinition {
  name: string;
  description: string;
  /** JSON Schema describing the tool's input object. */
  inputSchema: Record<string, unknown>;
}

/** Result of running a validated SQL query. */
export interface SqlExecutionResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

/**
 * Executes a SQL query (after validation). Throws on invalid or failed SQL —
 * the provider catches that and surfaces it as a `tool_error` event.
 */
export type SqlExecutor = (query: string) => Promise<SqlExecutionResult>;

/** Token accounting for a single completed (or partial) response. */
export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

/** Normalized streaming events emitted during a chat turn. */
export type AiStreamEvent =
  | { type: 'tool_start' }
  | { type: 'tool_query'; query: string }
  | { type: 'tool_end'; rowCount: number }
  | { type: 'tool_error'; message: string }
  | { type: 'token'; content: string };

export interface AiStreamParams {
  /** System prompt (grounding rules). Passed out-of-band, never as a message. */
  system: string;
  /** Conversation history; the final entry is the user's new question. */
  messages: AiChatMessage[];
  /** The single tool the model may call. */
  tool: AiToolDefinition;
  /** Runs a tool-requested SQL query. */
  executeSql: SqlExecutor;
  /** Called for every normalized streaming event. */
  onEvent: (event: AiStreamEvent) => void;
  /** Aborts the upstream request when the user stops generation. */
  signal: AbortSignal;
}

export interface AiStreamResult {
  /** Final assistant text (partial if the stream was aborted). */
  content: string;
  usage: AiUsage;
}

export interface AiProvider {
  readonly name: 'openai' | 'anthropic';
  /**
   * Runs a full chat turn: streams tokens, calls the tool when the model asks,
   * and resolves with the final text + usage. Must resolve (not reject) when
   * `signal` aborts, returning whatever was generated so far.
   */
  streamChat(params: AiStreamParams): Promise<AiStreamResult>;
}
