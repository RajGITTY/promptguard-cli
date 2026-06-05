import OpenAI from 'openai';
import type { Provider, GenerateRequest, GenerateResult } from '../types.js';

// Real OpenAI provider. Reads OPENAI_API_KEY from the environment.
export function openaiProvider(): Provider {
  const client = new OpenAI();
  return {
    name: 'openai',
    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const start = Date.now();
      const resp = await client.chat.completions.create({
        model: req.model,
        max_tokens: req.maxTokens ?? 1024,
        messages: [{ role: 'user', content: req.prompt }],
      });
      const text = resp.choices[0]?.message?.content ?? '';
      return {
        text,
        inputTokens: resp.usage?.prompt_tokens ?? 0,
        outputTokens: resp.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - start,
      };
    },
  };
}
