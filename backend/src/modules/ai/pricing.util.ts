import { AiProvider } from './ai-provider.interface';

/** USD price per 1M tokens, by provider + model. Used for budget tracking. */
interface ModelRate {
  inputPerMillion: number;
  outputPerMillion: number;
}

const RATES: Record<AiProvider['name'], Record<string, ModelRate>> = {
  openai: {
    'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10 },
    'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  },
  anthropic: {
    'claude-opus-4-8': { inputPerMillion: 15, outputPerMillion: 75 },
    'claude-sonnet-5': { inputPerMillion: 3, outputPerMillion: 15 },
  },
};

/** Conservative fallback so unknown models still deduct something sane. */
const FALLBACK: ModelRate = { inputPerMillion: 5, outputPerMillion: 15 };

/**
 * Estimate the USD cost of a completion from its token counts. Prices are
 * approximate public list prices; exact billing is not the goal — budget
 * enforcement (Phase 6) only needs a stable, monotonic estimate.
 */
export function estimateCostUsd(
  provider: AiProvider['name'],
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rate = RATES[provider]?.[model] ?? FALLBACK;
  const cost =
    (promptTokens / 1_000_000) * rate.inputPerMillion +
    (completionTokens / 1_000_000) * rate.outputPerMillion;
  // Round to 6 dp to avoid floating-point noise in Redis / responses.
  return Math.round(cost * 1_000_000) / 1_000_000;
}
