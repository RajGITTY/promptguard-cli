# PromptGuard CI

**Unit tests for your LLM prompts.** A drop-in CLI + GitHub Action that runs eval/regression tests on every pull request, so teams shipping LLM features catch **quality, cost, and latency regressions before they merge** — not from angry users or a 10× token bill.

> Change a prompt or bump a model → PromptGuard re-runs your test cases, grades them, compares against a baseline, and **fails the PR** if quality drops, cost spikes, or latency blows past your budget.

---

## Why

LLM features break silently. A small prompt edit quietly tanks answer quality for ten cases you weren't looking at; a model version bump doubles your token spend; nothing throws an error. You find out from production. PromptGuard makes that failure mode a red check on the PR instead.

It sits in the place a dev tool is stickiest: the **merge gate**.

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

## Running against a real model

Set the provider (and judge) to `anthropic` or `openai` in `promptguard.yaml` and export the matching key:

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

## Status

This is an early **draft / MVP**. Working today: the eval CLI, all assertion types, the mock/Anthropic/OpenAI providers, LLM-as-judge, baseline regression gating, console + Markdown reports, and the example Action.

Roadmap: published npm package + GitHub Marketplace listing, hosted dashboards with run history across the team, trend charts, more providers, and richer judges.

## License

MIT — see [LICENSE](LICENSE).
