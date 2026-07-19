import { registerAs } from '@nestjs/config';

/** Which upstream LLM vendor the AI layer talks to. */
export type AiProvider = 'openai' | 'anthropic';

/**
 * AI provider configuration.
 *
 * The project supports both OpenAI and Anthropic behind a single provider
 * interface. `AI_PROVIDER` selects which one is active at runtime; the other
 * one's keys can be left unset. Defaults to `openai` because the take-home
 * ships an OpenAI key.
 */
export default registerAs('ai', () => ({
  provider: (process.env.AI_PROVIDER ?? 'openai') as AiProvider,
  maxHistoryMessages: parseInt(
    process.env.AI_MAX_HISTORY_MESSAGES ??
      process.env.ANTHROPIC_MAX_HISTORY_MESSAGES ??
      '20',
    10,
  ),
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',
  },
}));
