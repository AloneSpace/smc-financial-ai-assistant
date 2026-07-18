import { estimateCostUsd } from './pricing.util';

describe('estimateCostUsd', () => {
  it('prices a known OpenAI model from its per-million rates', () => {
    // gpt-4o: $2.50/1M input + $10/1M output.
    expect(estimateCostUsd('openai', 'gpt-4o', 1_000_000, 0)).toBeCloseTo(
      2.5,
      6,
    );
    expect(estimateCostUsd('openai', 'gpt-4o', 0, 1_000_000)).toBeCloseTo(
      10,
      6,
    );
  });

  it('prices a known Anthropic model', () => {
    // claude-opus-4-8: $15/1M input + $75/1M output.
    expect(
      estimateCostUsd('anthropic', 'claude-opus-4-8', 1_000_000, 1_000_000),
    ).toBeCloseTo(90, 6);
  });

  it('falls back to a conservative rate for unknown models', () => {
    const cost = estimateCostUsd('openai', 'some-future-model', 1_000_000, 0);
    expect(cost).toBeGreaterThan(0);
  });

  it('returns 0 for a zero-token completion', () => {
    expect(estimateCostUsd('openai', 'gpt-4o', 0, 0)).toBe(0);
  });
});
