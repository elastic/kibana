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

The matrix splits Overall into a **contract** sub-score (evaluators that declare
`kind: 'CODE'`: SkillInvoked, Trajectory, ExpectedToolCalled, FinalAnswerPresent,
MinExpectedSteps) and a **judged** sub-score (`kind: 'LLM'`: the correctness and
groundedness analyses, Criteria). The split is read from `evaluator.kind` on each
score document, so a new evaluator is classified by what it declares rather than by
a name list.

## Repetition tiers

A single LLM-graded run is not a measurement. On identical reruns (same model, judge,
prompt and commit) 56.9% of judge-graded cells flip, against 14.7% of contract cells.
Repetitions are therefore budgeted by what the run is for:

| Tier | Repetitions | Use |
|---|---|---|
| `smoke` | 1 | Weekly sweep over the whole field. Catches breakage; does not order models. |
| `confirm` | 3 | Re-run the contenders whose relative order is in question. |
| `publish` | 5 | Required before an ordering between two models is reported. |

Select a tier with `EVAL_REPETITION_TIER`. It is forwarded to every fanout step, and it
fails the run if it contradicts an explicit `EVAL_REPETITIONS`. The weekly pipeline
declares `smoke`. Run `confirm`/`publish` on demand for the contending models only:

```text
EVAL_SUITE_ID=security-persona-matrix
EVAL_MODEL_GROUPS=eis/anthropic-claude-4.5-opus,eis/anthropic-claude-4.8-opus
EVAL_INCLUDE_EIS_MODELS=1
EVAL_SERVER_CONFIG_SET=evals_security_persona_matrix
EVAL_REPETITION_TIER=publish
EVAL_STEP_TIMEOUT_IN_MINUTES=180
```

The Playwright timeout scales with the tier (30 minutes per repetition) unless
`PERSONA_MATRIX_TIMEOUT_MINUTES` overrides it. Raise the Buildkite step timeout
(`EVAL_STEP_TIMEOUT_IN_MINUTES`) to match for `publish` runs.

Even at `publish`, the matrix renders adjacent models as tied when their Overall gap is
inside the configured `overall.noiseFloor` or a seeded paired bootstrap over their shared
prompts cannot separate them.

## Fixtures

- **Chrysalis alerts** — seeds 3 sample alerts before evaluation, cleaned up after

## Seed profiles (`SEED_PROFILE`)

- **`minimal` (default)** - 3 sample alerts + 1 rule. Fast and cheap to seed; prompts match the published matrix runs, but the environment does NOT reproduce the published-benchmark dataset. Scores are not directly comparable.
- **`parity`** - 97-doc snapshot of the original `chrysalis-sim` benchmark dataset (5-stage APT chain: needle/noise alerts, endpoint telemetry, Rapid7 IOCs, on-call schedule) across 8 indices, from `fixtures/chrysalis_parity_docs.ts`. Timestamps are re-stamped relative to run time. Use for apples-to-apples comparison against the original benchmark. Scores under `parity` are NOT comparable with `minimal` runs - the environment differs by design. `parity` is the intended single dataset going forward: the default remains `minimal` only until the next full matrix re-run, at which point all models are re-measured under `parity` in one pass and the default flips.

### Prerequisites for `SEED_PROFILE=parity`

Entity-analytics examples call `security_search_entities` / `security.get_entity`, which are only available when the **Security entity store is installed**. On a fresh stack, run once before the suite:

```bash
curl -u <creds> -X POST "<kibana>/api/security/entity_store/install" -H "kbn-xsrf: x" -H "Content-Type: application/json" -d "{}"
```

The store auto-starts after install (`.entities.v2.latest.security_default`). Without it, those examples hard-fail on tool-availability checks.
