#!/usr/bin/env node
import { resolve, dirname } from 'node:path';
import { writeFileSync } from 'node:fs';
import { loadConfig, loadSuites } from './config.js';
import { runSuite } from './runner.js';
import { loadBaseline, writeBaseline } from './baseline.js';
import { evaluateGate, printConsole, toMarkdown } from './report.js';
import type { SuiteResult } from './types.js';

interface ParsedArgs {
  cmd: string;
  args: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const cmd = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'run';
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return { cmd, args };
}

const USAGE = `PromptGuard CI — unit tests for your LLM prompts.

Usage:
  promptguard run [options]

Options:
  --config <path>      Path to config (default: promptguard.yaml)
  --update-baseline    Record the current run as the new baseline
  --output <path>      Write a Markdown report (for PR comments)
  --help               Show this help
`;

async function main(): Promise<void> {
  const { cmd, args } = parseArgs(process.argv.slice(2));

  if (args.help || cmd === 'help') {
    console.log(USAGE);
    process.exit(0);
  }
  if (cmd !== 'run') {
    console.error(`Unknown command: ${cmd}\n`);
    console.log(USAGE);
    process.exit(1);
  }

  const configPath = resolve(String(args.config ?? 'promptguard.yaml'));
  const baseDir = dirname(configPath);
  const cfg = loadConfig(configPath);
  const suites = loadSuites(cfg, baseDir);

  if (suites.length === 0) {
    console.error('No eval suites found. Check the `evals:` paths in your config.');
    process.exit(1);
  }

  const baselinePath = resolve(baseDir, '.promptguard', 'baseline.json');
  const baseline = loadBaseline(baselinePath);

  const results: SuiteResult[] = [];
  for (const s of suites) results.push(await runSuite(s, cfg));

  const gate = evaluateGate(results, cfg, baseline);
  printConsole(results, cfg, baseline, gate);

  if (args.output) {
    writeFileSync(resolve(String(args.output)), toMarkdown(results, cfg, baseline, gate));
  }
  if (args['update-baseline']) {
    writeBaseline(baselinePath, results, new Date().toISOString());
    console.log('Baseline updated: ' + baselinePath + '\n');
  }

  process.exit(gate.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
