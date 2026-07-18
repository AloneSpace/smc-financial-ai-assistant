import { AiStreamEvent, AiUsage } from '../ai/ai-provider.interface';

/** Result of aborting a stream, returned by `POST /chat/stop`. */
export interface StopStreamResult {
  messageId: string;
  stopped: boolean;
  content: string;
}

/**
 * The full set of SSE events written to the `POST /chat` stream. This is the
 * provider-level {@link AiStreamEvent} set plus the transport-level lifecycle
 * events (`started`, `done`, `error`) owned by ChatService.
 */
export type ChatStreamEvent =
  | { type: 'started'; messageId: string }
  | AiStreamEvent
  | { type: 'done'; usage: AiUsage; isPartial: boolean }
  | { type: 'error'; message: string };
