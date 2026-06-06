import type { Provider, GenerateRequest, GenerateResult, CustomConfig } from '../types.js';

// "Bring your own model" provider.
//
// Out of the box this speaks the OpenAI /chat/completions format, so it works
// with ANY OpenAI-compatible endpoint via config alone — OpenRouter, Groq,
// Together, Fireworks, DeepSeek, Ollama, vLLM/LM Studio, Azure, etc. No code:
//
//   provider: custom
//   model: meta-llama/llama-3.3-70b-instruct
//   custom:
//     baseUrl: https://openrouter.ai/api/v1
//     apiKeyEnv: OPENROUTER_API_KEY   # omit for local/no-auth servers
//
// For a NON-OpenAI-shaped API, copy this file and edit the two marked lines
// (the request body and the response parsing) to match your API.
export function customProvider(cfg?: CustomConfig): Provider {
  if (!cfg?.baseUrl) {
    throw new Error('provider "custom" requires a `custom.baseUrl` in your config.');
  }
  const apiKey = cfg.apiKeyEnv ? process.env[cfg.apiKeyEnv] : undefined;
  const endpoint = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`;

  return {
    name: 'custom',
    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const start = Date.now();

      // ── EDIT #1: the request body (shape this for a non-OpenAI API) ──
      const body = {
        model: req.model,
        max_tokens: req.maxTokens ?? 1024,
        messages: [{ role: 'user', content: req.prompt }],
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          ...(cfg.headers ?? {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`custom provider HTTP ${res.status}: ${await res.text()}`);
      }

      // ── EDIT #2: how to read text + token usage out of the response ──
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content ?? '';
      const usage = data.usage ?? {};

      return {
        text,
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
        latencyMs: Date.now() - start,
      };
    },
  };
}
