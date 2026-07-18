import { ApiProperty } from '@nestjs/swagger';
import { AiStreamEvent, AiUsage } from '../ai/ai-provider.interface';

/** Result of aborting a stream, returned by `POST /chat/stop`. */
export class StopStreamResult {
  @ApiProperty({ format: 'uuid', description: 'The assistant message that was aborted.' })
  messageId!: string;

  @ApiProperty({ description: 'True if an in-flight stream was found and stopped.' })
  stopped!: boolean;

  @ApiProperty({ description: 'Partial answer content accumulated before stopping.' })
  content!: string;
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
