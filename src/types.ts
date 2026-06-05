// Core type definitions shared across PromptGuard CI.

export type ProviderName = 'mock' | 'anthropic' | 'openai';

/** A single generation request sent to a provider (the "model under test"). */
export interface GenerateRequest {
  prompt: string;
  model: string;
  maxTokens?: number;
}

/** What a provider returns for one generation. */
export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

/** A pluggable LLM backend. `mock` needs no API key. */
export interface Provider {
  readonly name: ProviderName;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}

export type AssertionType =
  | 'contains'
  | 'not-contains'
  | 'regex'
  | 'equals'
  | 'max-words'
  | 'max-cost'
  | 'max-latency'
  | 'llm-judge';

/** One check applied to a model's output for a given case. */
export interface Assertion {
  type: AssertionType;
  value?: string | number;
  rubric?: string; // llm-judge: what a good answer must do
  threshold?: number; // llm-judge: minimum passing score (0..1)
  caseInsensitive?: boolean; // contains / not-contains (default true)
}

export interface EvalCase {
  name: string;
  input: string;
  vars?: Record<string, string>;
  assert: Assertion[];
}

/** A prompt plus the cases that exercise it. One YAML file = one suite. */
export interface EvalSuite {
  name: string;
  prompt: string; // may contain {{input}} and {{var}} placeholders
  cases: EvalCase[];
  file?: string;
}

export interface Thresholds {
  minQualityScore?: number;
  maxCostUsdPerCase?: number;
  maxAvgLatencyMs?: number;
  maxRegressionDropPct?: number; // fail if quality drops this much vs baseline
}

export interface JudgeConfig {
  provider: ProviderName;
  model: string;
}

export interface Config {
  provider: ProviderName;
  model: string;
  maxTokens?: number;
  judge: JudgeConfig;
  evals: string[]; // file paths or simple globs like evals/*.yaml
  thresholds: Thresholds;
}

export interface AssertionResult {
  type: AssertionType;
  pass: boolean;
  detail: string;
  score?: number; // llm-judge only
}

export interface CaseResult {
  name: string;
  pass: boolean;
  score: number; // 0..1 quality for this case
  costUsd: number;
  latencyMs: number;
  output: string;
  assertions: AssertionResult[];
}

export interface SuiteResult {
  name: string;
  cases: CaseResult[];
  file?: string;
}

export interface RunSummary {
  avgQuality: number;
  totalCostUsd: number;
  avgCostUsd: number;
  avgLatencyMs: number;
  totalCases: number;
  failedCases: number;
}
