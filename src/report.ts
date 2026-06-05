import type { Config, SuiteResult, RunSummary } from './types.js';
import type { Baseline } from './baseline.js';
import { summarize } from './baseline.js';

// Tiny ANSI helpers — no dependency.
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

export interface Gate {
  pass: boolean;
  reasons: string[];
  summary: RunSummary;
}

/** Decide whether the run passes: every case green AND every threshold met. */
export function evaluateGate(suites: SuiteResult[], cfg: Config, baseline: Baseline | null): Gate {
  const summary = summarize(suites);
  const reasons: string[] = [];
  const t = cfg.thresholds;

  if (summary.failedCases > 0) reasons.push(`${summary.failedCases} case(s) failed assertions`);
  if (t.minQualityScore != null && summary.avgQuality < t.minQualityScore)
    reasons.push(`avg quality ${summary.avgQuality.toFixed(2)} < min ${t.minQualityScore}`);
  if (t.maxCostUsdPerCase != null && summary.avgCostUsd > t.maxCostUsdPerCase)
    reasons.push(`avg cost $${summary.avgCostUsd.toFixed(5)} > max $${t.maxCostUsdPerCase}`);
  if (t.maxAvgLatencyMs != null && summary.avgLatencyMs > t.maxAvgLatencyMs)
    reasons.push(`avg latency ${summary.avgLatencyMs.toFixed(0)}ms > max ${t.maxAvgLatencyMs}ms`);
  if (baseline && t.maxRegressionDropPct != null && baseline.summary.avgQuality > 0) {
    const dropPct =
      ((baseline.summary.avgQuality - summary.avgQuality) / baseline.summary.avgQuality) * 100;
    if (dropPct > t.maxRegressionDropPct)
      reasons.push(`quality regressed ${dropPct.toFixed(1)}% vs baseline (> ${t.maxRegressionDropPct}%)`);
  }

  return { pass: reasons.length === 0, reasons, summary };
}

export function printConsole(
  suites: SuiteResult[],
  cfg: Config,
  baseline: Baseline | null,
  gate: Gate,
): void {
  console.log('');
  console.log(
    c.bold('PromptGuard CI') +
      c.dim(`  provider=${cfg.provider} model=${cfg.model} judge=${cfg.judge.provider}:${cfg.judge.model}`),
  );

  for (const s of suites) {
    console.log('\n' + c.bold(s.name) + (s.file ? c.dim(`  (${s.file})`) : ''));
    for (const cs of s.cases) {
      const badge = cs.pass ? c.green('PASS') : c.red('FAIL');
      console.log(
        `  ${badge}  ${cs.name}  ${c.dim(`q=${cs.score.toFixed(2)} $${cs.costUsd.toFixed(5)} ${cs.latencyMs}ms`)}`,
      );
      for (const a of cs.assertions) {
        if (!a.pass) console.log('        ' + c.red('x ') + c.dim(`${a.type}: ${a.detail}`));
      }
    }
  }

  const s = gate.summary;
  console.log('\n' + c.bold('Summary'));
  console.log(
    `  quality ${s.avgQuality.toFixed(2)}   avg cost $${s.avgCostUsd.toFixed(5)}   avg latency ${s.avgLatencyMs.toFixed(0)}ms   ${s.failedCases}/${s.totalCases} failed`,
  );
  if (baseline) {
    const dq = s.avgQuality - baseline.summary.avgQuality;
    const col = dq < 0 ? c.red : c.green;
    console.log(
      `  vs baseline: quality ${col((dq >= 0 ? '+' : '') + dq.toFixed(2))}  ${c.dim(`(baseline ${baseline.summary.avgQuality.toFixed(2)} from ${baseline.createdAt})`)}`,
    );
  } else {
    console.log(c.dim('  no baseline yet — run with --update-baseline to record one'));
  }

  console.log('');
  if (gate.pass) {
    console.log(c.green(c.bold('PASS  gate passed')));
  } else {
    console.log(c.red(c.bold('FAIL  gate failed')));
    for (const r of gate.reasons) console.log(c.red('  - ' + r));
  }
  console.log('');
}

/** Render a PR-comment-friendly Markdown report. */
export function toMarkdown(
  suites: SuiteResult[],
  cfg: Config,
  baseline: Baseline | null,
  gate: Gate,
): string {
  const s = gate.summary;
  const b = baseline?.summary;
  const delta = (cur: number, base?: number, unit = '') =>
    base == null ? '—' : `${cur - base >= 0 ? '+' : ''}${(cur - base).toFixed(unit === 'ms' ? 0 : 2)}${unit}`;

  const lines: string[] = [];
  lines.push(`### ${gate.pass ? 'PromptGuard: passed' : 'PromptGuard: failed'}`);
  lines.push('');
  lines.push(`**provider** \`${cfg.provider}\` · **model** \`${cfg.model}\``);
  lines.push('');
  lines.push('| metric | value | baseline | delta |');
  lines.push('|---|---|---|---|');
  lines.push(
    `| quality | ${s.avgQuality.toFixed(2)} | ${b ? b.avgQuality.toFixed(2) : '—'} | ${delta(s.avgQuality, b?.avgQuality)} |`,
  );
  lines.push(
    `| avg cost | $${s.avgCostUsd.toFixed(5)} | ${b ? '$' + b.avgCostUsd.toFixed(5) : '—'} | ${b ? delta(s.avgCostUsd, b.avgCostUsd) : '—'} |`,
  );
  lines.push(
    `| avg latency | ${s.avgLatencyMs.toFixed(0)}ms | ${b ? b.avgLatencyMs.toFixed(0) + 'ms' : '—'} | ${b ? delta(s.avgLatencyMs, b.avgLatencyMs, 'ms') : '—'} |`,
  );
  lines.push(`| failed cases | ${s.failedCases}/${s.totalCases} | | |`);
  lines.push('');

  if (!gate.pass) {
    lines.push('**Why it failed:**');
    for (const r of gate.reasons) lines.push(`- ${r}`);
    lines.push('');
    lines.push('<details><summary>Failing assertions</summary>');
    lines.push('');
    for (const su of suites) {
      for (const cs of su.cases) {
        if (cs.pass) continue;
        lines.push(`- \`${su.name}/${cs.name}\``);
        for (const a of cs.assertions) if (!a.pass) lines.push(`  - x ${a.type}: ${a.detail}`);
      }
    }
    lines.push('');
    lines.push('</details>');
  }

  lines.push('');
  lines.push('<sub>Generated by PromptGuard CI</sub>');
  return lines.join('\n');
}
