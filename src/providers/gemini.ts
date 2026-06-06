import { GoogleGenAI } from '@google/genai';
import type { Provider, GenerateRequest, GenerateResult } from '../types.js';

// Native Google Gemini provider. Reads GEMINI_API_KEY (or GOOGLE_API_KEY) from env.
export function geminiProvider(): Provider {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  return {
    name: 'gemini',
    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const start = Date.now();
      const resp = await ai.models.generateContent({
        model: req.model,
        contents: req.prompt,
        config: { maxOutputTokens: req.maxTokens ?? 1024 },
      });
      const usage = resp.usageMetadata;
      return {
        text: resp.text ?? '',
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        latencyMs: Date.now() - start,
      };
    },
  };
}
