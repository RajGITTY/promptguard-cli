# Contributing to PromptGuard CI

Thanks for taking a look! This is an early MVP and contributions — bug reports,
ideas, and PRs — are very welcome.

## Local setup

```bash
npm install
npm run demo     # runs the example suite via the mock provider (no API key)
npm run build    # type-check + compile to dist/
```

## Project layout

| Path | What it is |
|---|---|
| `src/cli.ts` | Command-line entry point |
| `src/runner.ts` | Runs each case: generate → assert → score |
| `src/assertions.ts` | The assertion types |
| `src/judge.ts` | LLM-as-judge grader |
| `src/providers/` | Pluggable model backends (mock / anthropic / openai) |
| `src/report.ts` | Gate logic + console & Markdown output |
| `evals/`, `examples/` | Example eval suites |

## Adding a provider

Implement the `Provider` interface (`src/types.ts`) — one `generate()` method that
returns `{ text, inputTokens, outputTokens, latencyMs }` — and register it in
`src/providers/index.ts`. See `src/providers/openai.ts` for a ~20-line example.

## Adding an assertion type

Add a `case` to the `switch` in `src/assertions.ts` and extend the `AssertionType`
union in `src/types.ts`. Keep it deterministic where possible.

## Good first issues

- A new provider adapter (Azure OpenAI, Gemini, Ollama, OpenRouter).
- New assertion types: `json-schema`, `min-words`, `latency-p95`.
- Multi-sample LLM-judge (run the judge N times, take the median) for stability.
- A `--json` output mode for programmatic consumption.
- Docs + examples for per-case `vars` templating.

Open an issue before a large change so we can align on the approach. Thanks!
