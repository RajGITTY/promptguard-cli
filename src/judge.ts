import { createProvider } from './providers/index.js';
import type { Config } from './types.js';

export interface JudgeVerdict {
  score: number; // 0..1
  reasoning: string;
}

export type Judge = (rubric: string, input: string, output: string) => Promise<JudgeVerdict>;

function buildJudgePrompt(rubric: string, input: string, output: string): string {
  return [
    "You are a strict evaluator scoring an AI assistant's answer.",
    'Score from 0.0 (fails the rubric completely) to 1.0 (fully satisfies it).',
    'Respond with ONLY a JSON object: {"score": <number 0..1>, "reasoning": "<one short sentence>"}.',
    '',
    `RUBRIC: ${rubric}`,
    `USER INPUT: ${input}`,
    `ASSISTANT ANSWER: ${output}`,
  ].join('\n');
}

function parseVerdict(text: string): JudgeVerdict {
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const o = JSON.parse(m[0]) as { score?: unknown; reasoning?: unknown };
      const score = Math.max(0, Math.min(1, Number(o.score)));
      if (!Number.isNaN(score)) return { score, reasoning: String(o.reasoning ?? '') };
    } catch {
      /* fall through to the failure path below */
    }
  }
  return { score: 0, reasoning: `Could not parse judge output: ${text.slice(0, 120)}` };
}

/**
 * Builds the grader used by `llm-judge` assertions.
 * With the mock provider it returns a fixed high score so the demo runs offline.
 */
export function makeJudge(cfg: Config): Judge {
  if (cfg.judge.provider === 'mock') {
    return async () => ({ score: 0.9, reasoning: 'mock judge (no API key) — assumes a good answer' });
  }
  const provider = createProvider(cfg.judge.provider);
  return async (rubric, input, output) => {
    const r = await provider.generate({
      prompt: buildJudgePrompt(rubric, input, output),
      model: cfg.judge.model,
      maxTokens: 512,
    });
    return parseVerdict(r.text);
  };
}
