import type { Config, EvalSuite, CaseResult, SuiteResult, AssertionResult } from './types.js';
import { createProvider } from './providers/index.js';
import { makeJudge } from './judge.js';
import { evaluateAssertion } from './assertions.js';
import { costUsd } from './pricing.js';

/** Substitute {{input}} and {{var}} placeholders into a prompt template. */
function renderPrompt(template: string, input: string, vars: Record<string, string> = {}): string {
  let out = template.replace(/\{\{\s*input\s*\}\}/g, input);
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), v);
  }
  return out;
}

/** Run every case in a suite: generate, score assertions, tally cost/latency/quality. */
export async function runSuite(suite: EvalSuite, cfg: Config): Promise<SuiteResult> {
  const provider = createProvider(cfg.provider);
  const judge = makeJudge(cfg);
  const cases: CaseResult[] = [];

  for (const c of suite.cases) {
    const prompt = renderPrompt(suite.prompt, c.input, c.vars);
    const result = await provider.generate({ prompt, model: cfg.model, maxTokens: cfg.maxTokens });

    const assertions: AssertionResult[] = [];
    for (const a of c.assert ?? []) {
      assertions.push(
        await evaluateAssertion(a, { input: c.input, output: result.text, result, model: cfg.model, judge }),
      );
    }

    const pass = assertions.every((r) => r.pass);
    const judged = assertions.find((r) => r.type === 'llm-judge' && r.score !== undefined);
    const score = judged?.score ?? (pass ? 1 : 0);
    const { usd } = costUsd(cfg.model, result.inputTokens, result.outputTokens);

    cases.push({
      name: c.name,
      pass,
      score,
      costUsd: usd,
      latencyMs: result.latencyMs,
      output: result.text,
      assertions,
    });
  }

  return { name: suite.name, cases, file: suite.file };
}
