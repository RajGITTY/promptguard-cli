import Anthropic from '@anthropic-ai/sdk';
import type { Provider, GenerateRequest, GenerateResult } from '../types.js';

// Real Anthropic provider. Reads ANTHROPIC_API_KEY from the environment.
// Note: Opus 4.8 / 4.7 reject temperature/top_p/top_k, so we deliberately
// don't set sampling parameters here.
export function anthropicProvider(): Provider {
  const client = new Anthropic();
  return {
    name: 'anthropic',
    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const start = Date.now();
      const resp = await client.messages.create({
        model: req.model,
        max_tokens: req.maxTokens ?? 1024,
        messages: [{ role: 'user', content: req.prompt }],
      });
      const text = resp.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('');
      return {
        text,
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
        latencyMs: Date.now() - start,
      };
    },
  };
}
