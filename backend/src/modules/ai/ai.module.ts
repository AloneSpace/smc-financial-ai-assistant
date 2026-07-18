import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AiProvider as AiProviderName } from '../../config/ai.config';
import { AI_PROVIDER, AiProvider } from './ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { AiService } from './ai.service';

/**
 * Wires up the active AI provider from configuration. Both vendors are
 * constructed lazily-tolerant: a missing key does not crash boot (AiService
 * enforces key presence per-request via {@link AiService.assertReady}).
 */
@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AiProvider => {
        const provider =
          config.get<AiProviderName>('ai.provider') ?? 'openai';
        if (provider === 'anthropic') {
          const client = new Anthropic({
            apiKey:
              config.get<string>('ai.anthropic.apiKey') ?? 'not-configured',
          });
          const model =
            config.get<string>('ai.anthropic.model') ?? 'claude-opus-4-8';
          return new AnthropicProvider(client, model);
        }
        const client = new OpenAI({
          apiKey: config.get<string>('ai.openai.apiKey') ?? 'not-configured',
        });
        const model = config.get<string>('ai.openai.model') ?? 'gpt-4o';
        return new OpenAiProvider(client, model);
      },
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
