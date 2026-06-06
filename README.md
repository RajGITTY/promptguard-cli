# PromptGuard CI

> **Unit tests for your LLM prompts.** Catch quality, cost, and latency regressions in CI — *before* they ship.

![status](https://img.shields.io/badge/status-early%20MVP-orange)
![license](https://img.shields.io/badge/license-MIT-green)
![node](https://img.shields.io/badge/node-%E2%89%A520-blue)

LLM features break silently. A one-line prompt edit quietly tanks answer quality for ten cases you weren't watching; a model bump doubles your token bill; nothing throws an error — you find out from production. **PromptGuard turns that into a red check on the pull request.**

It runs your prompt test-cases on every PR, grades them (including **LLM-as-judge**), compares against a baseline, and **fails the build** if quality drops, cost spikes, or latency blows its budget. It lives where a dev tool is stickiest: the **merge gate**.

<!-- TODO: replace this terminal block with an animated demo GIF — see docs/RECORD-DEMO.md -->

```text
$ promptguard run

PromptGuard CI  provider=anthropic model=claude-opus-4-8

support-bot
  FAIL  password-reset  q=0.74 $0.00131 980ms
        x llm-judge: judge 0.74 / min 0.80 — invents a reset link not in the docs
  PASS  refund-request  q=0.91 $0.00115 870ms

Summary
  quality 0.82   avg cost $0.00123   avg latency 925ms   1/2 failed
  vs baseline: quality -0.09  (baseline 0.91)

FAIL  gate failed
  - quality regressed 9.9% vs baseline (> 5%)
```

---

## Quickstart (60 seconds, no API key)

```bash
npm install
npm run demo
```

This runs the example suite with the built-in **mock** provider (no key, no network) and prints a pass/fail report. You should see `PASS  gate passed`.

Now make it fail like a real regression would — open [`evals/support-bot.yaml`](evals/support-bot.yaml) and change the first assertion's `value: settings` to `value: dashboard`, then re-run `npm run demo`. The gate fails and tells you exactly which assertion broke.

---

## How it works

1. You write a **prompt** and a few **cases** (input + what a good answer must do) in a YAML file.
2. On each run, PromptGuard sends every case through your model, then checks the output against assertions — including an **LLM-as-judge** score for quality.
3. It rolls everything into a quality/cost/latency summary, compares against a recorded **baseline**, and exits non-zero (failing CI) if any threshold or regression rule trips.

```yaml
# evals/support-bot.yaml
name: support-bot
prompt: |
  You are a helpful support agent for Acme SaaS. Answer concisely and never invent URLs.
  User question: {{input}}
cases:
  - name: password-reset
    input: How do I reset my password?
    assert:
      - type: contains
        value: settings
      - type: not-contains
        value: "http://"
      - type: max-words
        value: 100
      - type: llm-judge
        rubric: Does the answer explain resetting via account settings, without inventing links?
        threshold: 0.7
```

### Assertion types

| Type | Checks |
|---|---|
| `contains` / `not-contains` | substring present / absent (case-insensitive by default) |
| `regex` | output matches a pattern |
| `equals` | exact match |
| `max-words` | output length budget |
| `max-cost` | per-call USD budget (uses the pricing table) |
| `max-latency` | per-call latency budget (ms) |
| `llm-judge` | a grader model scores the answer 0–1 against your `rubric` |

### Gate thresholds

Set in `promptguard.yaml`:

```yaml
thresholds:
  minQualityScore: 0.8     # fail if average judge quality drops below this
  maxCostUsdPerCase: 0.05  # fail if a run gets too expensive per case
  maxAvgLatencyMs: 8000
  maxRegressionDropPct: 5  # fail if quality drops >5% vs the baseline
```

---

## Providers

PromptGuard is provider-agnostic. Set `provider` (and `judge.provider`) in `promptguard.yaml`:

| `provider` | Needs | Notes |
|---|---|---|
| `mock` | nothing | offline, deterministic — for demos/tests |
| `anthropic` | `ANTHROPIC_API_KEY` | native Claude |
| `openai` | `OPENAI_API_KEY` | native OpenAI |
| `gemini` | `GEMINI_API_KEY` | native Google Gemini |
| `custom` | a `custom:` block | **any OpenAI-compatible endpoint** |

### Bring your own model via `custom` (plug-and-play)

`custom` speaks the OpenAI `/chat/completions` format, so it works with OpenRouter, Groq, Together, Fireworks, DeepSeek, Ollama, vLLM/LM Studio, Azure, and more — no code:

```yaml
provider: custom
model: meta-llama/llama-3.3-70b-instruct
custom:
  baseUrl: https://openrouter.ai/api/v1
  apiKeyEnv: OPENROUTER_API_KEY   # omit for local/no-auth servers like Ollama
```

For a fully bespoke API, copy [`src/providers/custom.ts`](src/providers/custom.ts) — ~30 lines with two clearly-marked lines to map your request/response shape.

### Running

Set the provider (and judge) in `promptguard.yaml` and export the matching key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # or OPENAI_API_KEY=sk-...
npx tsx src/cli.ts run
```

Record a baseline once your numbers look good:

```bash
npx tsx src/cli.ts run --update-baseline
```

Future runs compare against it and flag regressions.

---

## In CI (GitHub Actions)

PromptGuard ships as an Action ([`action.yml`](action.yml)) and an example workflow ([`.github/workflows/promptguard.yml`](.github/workflows/promptguard.yml)) that runs on every PR and posts a sticky report comment:

```
### PromptGuard: failed
| metric | value | baseline | delta |
|---|---|---|---|
| quality | 0.74 | 0.91 | -0.17 |
| avg cost | $0.0121 | $0.0088 | +0.0033 |
...
Why it failed:
- quality regressed 18.7% vs baseline (> 5%)
```

Add `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` as repo secrets, drop in a `promptguard.yaml` + an `evals/` folder, and the gate runs itself.

---

## More examples

Beyond the support-bot demo, [`examples/`](examples/) has an **intent classifier** and a **RAG-faithfulness** check (the model must refuse when the answer isn't in the provided context). Run them with the mock provider — no key needed:

```bash
npx tsx src/cli.ts run --config examples/promptguard.yaml
```

---

## Status

This is an early **draft / MVP**. Working today: the eval CLI, all assertion types, the mock / Anthropic / OpenAI / Gemini / custom providers, LLM-as-judge, baseline regression gating, console + Markdown reports, and the example Action.

Roadmap: published npm package + GitHub Marketplace listing, hosted dashboards with run history across the team, trend charts, more providers, and richer judges.

**Feedback wanted.** If you ship an LLM feature and have ever been burned by a silent prompt or model regression, [open an issue](../../issues) — I want to hear how you'd want this to fit your workflow.

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues are listed there.

## License

MIT — see [LICENSE](LICENSE).
