import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { parse } from 'yaml';
import type { Config, EvalSuite } from './types.js';

const DEFAULTS = {
  provider: 'mock' as const,
  model: 'claude-opus-4-8',
  judge: { provider: 'mock' as const, model: 'claude-opus-4-8' },
  evals: ['evals/*.yaml'],
  thresholds: {},
};

interface RawConfig {
  provider?: Config['provider'];
  model?: string;
  maxTokens?: number;
  judge?: Partial<Config['judge']>;
  custom?: Config['custom'];
  evals?: string[];
  thresholds?: Config['thresholds'];
}

export function loadConfig(path: string): Config {
  const raw: RawConfig = existsSync(path) ? (parse(readFileSync(path, 'utf8')) ?? {}) : {};
  return {
    provider: raw.provider ?? DEFAULTS.provider,
    model: raw.model ?? DEFAULTS.model,
    maxTokens: raw.maxTokens,
    judge: {
      provider: raw.judge?.provider ?? raw.provider ?? DEFAULTS.judge.provider,
      model: raw.judge?.model ?? raw.model ?? DEFAULTS.judge.model,
    },
    custom: raw.custom,
    evals: raw.evals ?? DEFAULTS.evals,
    thresholds: raw.thresholds ?? DEFAULTS.thresholds,
  };
}

/** Minimal glob: supports a single `*` in the filename, e.g. evals/*.yaml. */
function expandGlob(pattern: string, baseDir: string): string[] {
  const abs = resolve(baseDir, pattern);
  if (!pattern.includes('*')) return existsSync(abs) ? [abs] : [];
  const dir = dirname(abs);
  if (!existsSync(dir)) return [];
  const re = new RegExp(
    '^' + basename(abs).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
  );
  return readdirSync(dir)
    .filter((f) => re.test(f))
    .map((f) => join(dir, f))
    .sort();
}

interface RawSuite {
  name?: string;
  prompt?: string;
  cases?: EvalSuite['cases'];
}

export function loadSuites(cfg: Config, baseDir: string): EvalSuite[] {
  const files = cfg.evals.flatMap((p) => expandGlob(p, baseDir));
  return files.map((file) => {
    const raw: RawSuite = parse(readFileSync(file, 'utf8')) ?? {};
    return {
      name: raw.name ?? basename(file),
      prompt: raw.prompt ?? '',
      cases: raw.cases ?? [],
      file,
    };
  });
}
