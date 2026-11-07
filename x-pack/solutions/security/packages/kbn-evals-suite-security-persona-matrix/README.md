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

Only the judge-facing copy is trimmed; all three judges (correctness, groundedness, Criteria) read the same capped copy. Tool ids, params, the final answer, errors and the trace id are untouched, and the stored transcript stays verbatim. Every trim is logged and recorded as `judgePayloadTrim` on the example output, so a trimmed score is distinguishable from an untrimmed one. Scores from runs with a cap set are not strictly comparable with uncapped runs.

## Seed profiles (`SEED_PROFILE`)

- **`minimal` (default)** - 3 sample alerts + 1 rule. Fast and cheap to seed; prompts match the published matrix runs, but the environment does NOT reproduce the published-benchmark dataset. Scores are not directly comparable.
- **`parity`** - 98-doc snapshot of the original `chrysalis-sim` benchmark dataset (5-stage APT chain: needle/noise alerts, endpoint telemetry, Rapid7 IOCs, on-call schedule) across 8 indices, from `fixtures/chrysalis_parity_docs.ts`. Timestamps are re-stamped relative to run time. Use for apples-to-apples comparison against the original benchmark. Scores under `parity` are NOT comparable with `minimal` runs - the environment differs by design. `parity` is the intended single dataset going forward: the default remains `minimal` only until the next full matrix re-run, at which point all models are re-measured under `parity` in one pass and the default flips.

### Prerequisites for `SEED_PROFILE=parity`

Entity-analytics examples call `security_search_entities` / `security.get_entity`, which are only available when the **Security entity store is installed**. The suite installs it automatically in `evaluate.beforeAll` (idempotent; skipped when already running), so no manual step is needed. The store auto-starts after install (`.entities.v2.latest.security_default`). Without it, those examples hard-fail on tool-availability checks.

The parity tools are backed by Elastic Workflows, so the **workflows plugin must be enabled** on the stack.

### What `parity` seeds

- **Data** - the 98 docs above, including a synthetic threat-intel record for the EICAR test hash. After seeding, a data gate checks that every seeded doc is searchable in its index and fails setup with per-index found/expected counts on any shortfall.
- **Workflows** - `vt-hash-lookup` (ES|QL lookup against the seeded threat-intel index; no external call, no API key), `create-case` (opens a case tagged `persona-matrix-parity`), and `create-channel` (records the request in the `persona-matrix-side-effects` index instead of calling Slack).
- **Tools** - `vt.hash.lookup`, `create.case`, `create.channel` (workflow tools wired to the workflows above), plus `get.time` and `check.on.call.schedule` (ES|QL tools; the on-call query keeps only fields present on the seeded schedule doc).

Cleanup removes only the tools, workflows and agent created by the run, plus, when the run created the `create-case` workflow, the cases tagged `persona-matrix-parity` opened since then.

## Agent profiles (`AGENT_PROFILE`)

- **`default`** - the built-in Elastic AI Agent, with skills routed naturally. Under `SEED_PROFILE=parity` the five parity tools are attached to it alongside the base tools.
- **`chrysalis-parity`** - creates the dedicated agent used by the external EIS model benchmark (same instructions, skills and five tools) and runs every prompt against it. The default agent is left untouched. Requires `SEED_PROFILE=parity`; setup fails otherwise. Skill ids missing from the install are dropped with a warning.

Use `chrysalis-parity` only to reproduce the external benchmark's environment. Scores under the two profiles are not comparable.
