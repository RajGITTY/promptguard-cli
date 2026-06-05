import type { Assertion, AssertionResult, GenerateResult } from './types.js';
import type { Judge } from './judge.js';
import { costUsd } from './pricing.js';

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export interface AssertionContext {
  input: string;
  output: string;
  result: GenerateResult;
  model: string;
  judge: Judge;
}

/** Run one assertion against a model's output and return pass/fail + detail. */
export async function evaluateAssertion(a: Assertion, ctx: AssertionContext): Promise<AssertionResult> {
  const out = ctx.output;
  switch (a.type) {
    case 'contains': {
      const needle = String(a.value ?? '');
      const ci = a.caseInsensitive !== false;
      const pass = ci ? out.toLowerCase().includes(needle.toLowerCase()) : out.includes(needle);
      return { type: a.type, pass, detail: `expected to contain "${needle}"` };
    }
    case 'not-contains': {
      const needle = String(a.value ?? '');
      const ci = a.caseInsensitive !== false;
      const found = ci ? out.toLowerCase().includes(needle.toLowerCase()) : out.includes(needle);
      return { type: a.type, pass: !found, detail: `expected NOT to contain "${needle}"` };
    }
    case 'regex': {
      const re = new RegExp(String(a.value ?? ''));
      return { type: a.type, pass: re.test(out), detail: `expected to match /${a.value}/` };
    }
    case 'equals': {
      const pass = out.trim() === String(a.value ?? '').trim();
      return { type: a.type, pass, detail: 'expected exact match' };
    }
    case 'max-words': {
      const n = wordCount(out);
      const max = Number(a.value);
      return { type: a.type, pass: n <= max, detail: `words ${n} / max ${max}` };
    }
    case 'max-cost': {
      const { usd } = costUsd(ctx.model, ctx.result.inputTokens, ctx.result.outputTokens);
      const max = Number(a.value);
      return { type: a.type, pass: usd <= max, detail: `cost $${usd.toFixed(5)} / max $${max}` };
    }
    case 'max-latency': {
      const max = Number(a.value);
      return {
        type: a.type,
        pass: ctx.result.latencyMs <= max,
        detail: `latency ${ctx.result.latencyMs}ms / max ${max}ms`,
      };
    }
    case 'llm-judge': {
      const v = await ctx.judge(a.rubric ?? '', ctx.input, out);
      const threshold = a.threshold ?? 0.7;
      return {
        type: a.type,
        pass: v.score >= threshold,
        detail: `judge ${v.score.toFixed(2)} / min ${threshold} — ${v.reasoning}`,
        score: v.score,
      };
    }
    default:
      return { type: a.type, pass: false, detail: `unknown assertion: ${a.type}` };
  }
}
