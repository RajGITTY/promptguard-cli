// USD per 1,000,000 tokens as [input, output].
// These are starting points — edit to match your own contracts/pricing.
const PRICES: Record<string, [number, number]> = {
  'claude-opus-4-8': [5, 25],
  'claude-opus-4-7': [5, 25],
  'claude-opus-4-6': [5, 25],
  'claude-sonnet-4-6': [3, 15],
  'claude-haiku-4-5': [1, 5],
  // OpenAI examples — verify against current pricing before relying on them.
  'gpt-4o': [2.5, 10],
  'gpt-4o-mini': [0.15, 0.6],
};

/** Compute spend for one generation. `known=false` means we have no price for that model. */
export function costUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { usd: number; known: boolean } {
  const p = PRICES[model];
  if (!p) return { usd: 0, known: false };
  return { usd: (inputTokens * p[0] + outputTokens * p[1]) / 1_000_000, known: true };
}
