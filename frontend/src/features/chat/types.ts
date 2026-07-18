/** Streaming lifecycle for a single chat turn. */
export type StreamState =
  | 'IDLE'
  | 'SENDING'
  | 'STREAMING_TOOL'
  | 'STREAMING_ANSWER'
  | 'ERROR';

/** Visual state of the SQL tool block while (and after) it runs. */
export interface ToolBlockState {
  status: 'loading' | 'query' | 'complete' | 'error';
  query?: string;
  rowCount?: number;
  error?: string;
}

export interface StreamUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

/** SSE events emitted by `POST /chat` (mirrors the backend contract). */
export type ChatStreamEvent =
  | { type: 'started'; messageId: string }
  | { type: 'tool_start' }
  | { type: 'tool_query'; query: string }
  | { type: 'tool_end'; rowCount: number }
  | { type: 'token'; content: string }
  | { type: 'done'; usage: StreamUsage; isPartial: boolean }
  | { type: 'tool_error'; message: string }
  | { type: 'error'; message: string };

/** Parsed `\`\`\`chart` block config embedded in an AI answer. */
export interface ChartConfig {
  type: 'bar' | 'line';
  title?: string;
  xKey: string;
  yKey: string | string[];
  data: Record<string, unknown>[];
}
