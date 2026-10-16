# @kbn/evals-suite-security-persona-matrix

Breadth-first security LLM performance suite: 21 prompts across 7 skill categories,
designed for multi-model comparison and persona-driven reporting.

## Categories

| Category | Prompts | Primary skills tested |
|---|---|---|
| Alert Analysis | 3 | alert-analysis |
| Detection Rule Edit | 3 | detection-rule-edit |
| Entity Analytics | 3 | entity-analytics |
| Threat Hunting | 3 | threat-hunting |
| Workflow Authoring | 3 | workflow-authoring |
| Workflow Execution | 3 | workflow-authoring, cases-management |
| Multi-Step | 3 | alert-analysis (+ allowSkills) |

## Evaluators

- **Skill Invocation** — verifies the correct skill was activated via trace inspection
- **ExpectedToolCalled** — checks the primary expected tool was invoked (from `expectedTools` metadata)
- **Trajectory** — tool-call sequence similarity vs golden path
- **correctnessAnalysis** — structured LLM judge (Factuality, Relevance, Completeness)
- **groundednessAnalysis** — structured LLM judge for response groundedness
- **Criteria** — generic rubric (Relevance, Clarity, Accuracy, Completeness)
- **Trace-based** — input tokens, output tokens, cached tokens, tool calls, latency

## Fixtures

- **Chrysalis alerts** — seeds 3 sample alerts before evaluation, cleaned up after

## Judge payload cap (opt-in)

With reasoning models, a single tool result can embed megabytes (for example a search over the conversation store), which pushes the LLM judges' request past the judge model's input limit and aborts the run before scoring. Two env variables cap what the **judges** read; both are off by default so default runs score exactly what the agent produced.

| Variable | Effect |
| --- | --- |
| `PERSONA_MATRIX_JUDGE_RESULT_CAP` | Max chars kept per tool result. Larger results are replaced by a stub that states the original size, followed by the first N chars. |
| `PERSONA_MATRIX_JUDGE_PAYLOAD_BUDGET` | Max chars for the whole judge payload. After the per-result cap, the largest remaining results are trimmed first, each keeping the longest prefix that lets the whole payload fit. If the untouched fields (answer, errors, params) alone exceed the budget, the payload is still over it; that is logged and recorded as `overBudget` in the trim report. |

Only the judge-facing copy is trimmed. Tool ids, params, the final answer, errors and the trace id are untouched, and the stored transcript stays verbatim. Every trim is logged and recorded as `judgePayloadTrim` on the example output (and on the criteria evaluator's metadata), so a trimmed score is distinguishable from an untrimmed one. Scores from runs with a cap set are not strictly comparable with uncapped runs.

## Seed profiles (`SEED_PROFILE`)

- **`minimal` (default)** - 3 sample alerts + 1 rule. Fast and cheap to seed; prompts match the published matrix runs, but the environment does NOT reproduce the published-benchmark dataset. Scores are not directly comparable.
- **`parity`** - 97-doc snapshot of the original `chrysalis-sim` benchmark dataset (5-stage APT chain: needle/noise alerts, endpoint telemetry, Rapid7 IOCs, on-call schedule) across 8 indices, from `fixtures/chrysalis_parity_docs.ts`. Timestamps are re-stamped relative to run time. Use for apples-to-apples comparison against the original benchmark. Scores under `parity` are NOT comparable with `minimal` runs - the environment differs by design. `parity` is the intended single dataset going forward: the default remains `minimal` only until the next full matrix re-run, at which point all models are re-measured under `parity` in one pass and the default flips.

### Prerequisites for `SEED_PROFILE=parity`

Entity-analytics examples call `security_search_entities` / `security.get_entity`, which are only available when the **Security entity store is installed**. On a fresh stack, run once before the suite:

```bash
curl -u <creds> -X POST "<kibana>/api/security/entity_store/install" -H "kbn-xsrf: x" -H "Content-Type: application/json" -d "{}"
```

The store auto-starts after install (`.entities.v2.latest.security_default`). Without it, those examples hard-fail on tool-availability checks.
