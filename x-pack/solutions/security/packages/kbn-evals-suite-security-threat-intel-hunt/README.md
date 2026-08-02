# @kbn/evals-suite-security-threat-intel-hunt

Live-LLM scorecard for the Threat Intelligence hunt's **Tier-2 behavioral
extraction** (`hunt_behavior`). It runs the real route against a configured
GenAI connector and scores how well each model extracts MITRE ATT&CK
techniques and proposes ES|QL detection rules from a labeled threat-report
corpus.

## Why this is a separate axis from the gate/conformance tests

The Jest eval-conformance and E2E suites in the plugin's `threat_intelligence/eval/`
folder prove the **gates** are correct — dedup, persistence, deterministic IDs,
one-Investigation-per-run — with the LLM mocked. Those are model-independent
safety checks: they must pass identically for every model, so a live LLM adds
noise, not signal.

This suite proves the **opposite half**: how well the *real* LLM actually
performs the extraction. Gate correctness tells you the pipeline is safe;
this scorecard tells you whether a given model is good enough to ship behind
it. You need both, and they run on different substrates on purpose.

## Evaluators (all deterministic CODE — no judge LLM)

Every evaluator scores the *live* model's output against ground truth or the
platform's own catalog validation. None of them calls a second LLM to judge,
so the scores are reproducible and cheap.

| Evaluator | Measures | Source of truth |
| --- | --- | --- |
| `Technique Accuracy (MITRE-aware)` | Technique-extraction accuracy with parent ↔ child sub-technique matching | Labeled `output.techniques` in the golden dataset + `parent_technique_id` from the service |
| `Precision@K` / `Recall@K` / `F1@K` | Technique-extraction accuracy (exact ID matching — suppressed by sub-technique mismatch) | Labeled `output.techniques` in the golden dataset (reuses `@kbn/evals` RAG evaluators) |
| `ES\|QL Rule Validity` | Fraction of proposed detection rules that parse | `@kbn/esql-language` `validateQuery` (AST/syntax only, no live ES) |
| `Technique Hallucination Rate` | Fraction of proposed techniques that are NOT real ATT&CK IDs | Service's own `dropped_unknown_ids` (validated against `@kbn/securitysolution-mitre-catalog`) |
| `Expected Calibration Error` | Whether the model's `llm_confidence` tracks actual correctness, binned by confidence level | Per-technique confidence vs. ground-truth correctness; raw pairs stashed in `metadata` for offline aggregate ECE (gate: ECE ≤ 0.10, high-conf bin ≥0.80 correct) |
| `Confidence Calibration (Brier)` | Mean squared error between confidence and correctness (supporting view to ECE) | Per-technique confidence vs. ground-truth correctness |
| `latency` / `inputTokens` / `outputTokens` | Cost/speed regression signals | OTel trace (zero extra LLM cost) |

## How the per-model scorecard works

`hunt_behavior` resolves its LLM from the `genAi:defaultAIConnector` UI setting
(it does not accept a per-request connector override). The `@kbn/evals` base
fixture creates/selects one connector per Playwright project (one per model),
and the suite's `beforeAll` points `genAi:defaultAIConnector` at that
connector. So to score N models, configure N projects in the run: each project
gets its own connector, the same golden corpus, and produces its own row.

## Run

```bash
# From the Kibana root, against a running Scout stack with EIS connectors.
# Eval suites use createPlaywrightEvalsConfig, so they run via scripts/evals
# (scripts/scout run-tests rejects them):
node scripts/evals run --suite security-threat-intel-hunt \
  --model eis-anthropic-claude-4-6-sonnet --judge eis-anthropic-claude-4-6-sonnet
```

Set `TRACING_ES_URL` to the golden trace ES so per-example traces and
per-model score docs land where the reporter reads them. The terminal prints a
per-model scorecard table at the end of the run; the raw per-model score docs
in trace ES are the attachable proof of how each model performed.
