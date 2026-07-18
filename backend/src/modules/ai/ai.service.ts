import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider as AiProviderName } from '../../config/ai.config';
import {
  AI_PROVIDER,
  AiProvider,
  AiStreamParams,
  AiStreamResult,
} from './ai-provider.interface';

/**
 * Thin facade over the configured {@link AiProvider}. Keeps ChatService free of
 * any vendor-specific detail and centralises the "is the key configured?" check.
 */
@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly config: ConfigService,
  ) {}

  /** How many prior conversation turns to send to the model. */
  get maxHistoryMessages(): number {
    return this.config.get<number>('ai.maxHistoryMessages') ?? 20;
  }

  /**
   * Guards against running with a missing/placeholder API key. Called before
   * the SSE stream opens so a misconfiguration surfaces as a clean 503 JSON
   * error rather than a mid-stream failure.
   */
  assertReady(): void {
    const provider =
      this.config.get<AiProviderName>('ai.provider') ?? 'openai';
    const key = this.config.get<string>(`ai.${provider}.apiKey`);
    if (!key || key.includes('placeholder')) {
      throw new ServiceUnavailableException(
        'AI service temporarily unavailable. Please try again.',
      );
    }
  }

  streamChat(params: AiStreamParams): Promise<AiStreamResult> {
    return this.provider.streamChat(params);
  }
}
