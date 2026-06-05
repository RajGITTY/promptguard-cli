import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RunSummary, SuiteResult } from './types.js';

export interface Baseline {
  createdAt: string;
  summary: RunSummary;
  perCase: Record<string, { score: number; costUsd: number; latencyMs: number }>;
}

/** Roll all suites up into a single run-level summary. */
export function summarize(suites: SuiteResult[]): RunSummary {
  const cases = suites.flatMap((s) => s.cases);
  const n = cases.length || 1;
  const totalCost = cases.reduce((a, c) => a + c.costUsd, 0);
  const totalLatency = cases.reduce((a, c) => a + c.latencyMs, 0);
  const totalScore = cases.reduce((a, c) => a + c.score, 0);
  return {
    avgQuality: totalScore / n,
    totalCostUsd: totalCost,
    avgCostUsd: totalCost / n,
    avgLatencyMs: totalLatency / n,
    totalCases: cases.length,
    failedCases: cases.filter((c) => !c.pass).length,
  };
}

export function loadBaseline(path: string): Baseline | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Baseline;
  } catch {
    return null;
  }
}

export function writeBaseline(path: string, suites: SuiteResult[], createdAt: string): void {
  const perCase: Baseline['perCase'] = {};
  for (const s of suites) {
    for (const c of s.cases) {
      perCase[`${s.name}/${c.name}`] = { score: c.score, costUsd: c.costUsd, latencyMs: c.latencyMs };
    }
  }
  const baseline: Baseline = { createdAt, summary: summarize(suites), perCase };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(baseline, null, 2));
}
