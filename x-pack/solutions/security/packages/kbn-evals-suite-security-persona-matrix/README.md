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

## Rubric judges (opt-in)

Set `PERSONA_MATRIX_RUBRIC_JUDGE=1` to add two 1–10 LLM judges that use the published benchmark's rubric:

- **PersonaRubric** — grades each persona example against its category's expected tools and red flags plus the shared scenario ground truth. An answer with no tool call is capped at the rubric's no-tool-call ceiling. The judge also sees the workflow YAML read back from the conversation, and when the trace is too large it keeps every call's tool id, keeps params whole while they fit, and shortens tool results evenly first.
- **AdAxesRubric** — grades Attack Discovery output on coverage, accuracy, correlation and actionability, with an overall score. The judge sees only the discoveries and the 8-intrusion answer key, not the alerts, so accuracy is graded against the key; indicators the key does not cover count as unverifiable, not fabricated.

Each one adds a judge call per example, so both are off by default. A malformed verdict gets one retry, so an example costs at most 2 judge calls. A failed or malformed verdict scores `unavailable` and never drops the example. Every result that reached the judge records `judge_calls` in its metadata, so a retried verdict can be told apart; an example skipped before any call (nothing to grade, or over the size cap) has none. Both judges are listed in `excludeEvaluators` in the matrix configs: their scores are stored per example but are not part of the cell means.

## Fixtures

- **Chrysalis alerts** — seeds 3 sample alerts before evaluation, cleaned up after

## Judge payload cap (opt-in)

With reasoning models, a single tool result can embed megabytes (for example a search over the conversation store), which pushes the LLM judges' request past the judge model's input limit and aborts the run before scoring. Two env variables cap what the **judges** read; both are off by default so default runs score exactly what the agent produced.

| Variable | Effect |
| --- | --- |
| `PERSONA_MATRIX_JUDGE_RESULT_CAP` | Max chars kept per tool result. Larger results are replaced by a stub that states the original size, followed by the first N chars. |
| `PERSONA_MATRIX_JUDGE_PAYLOAD_BUDGET` | Max chars for the whole judge payload. After the per-result cap, the largest remaining results are trimmed first, each keeping the longest prefix that lets the whole payload fit. If the untouched fields (answer, errors, params) alone exceed the budget, the payload is still over it; that is logged and recorded as `overBudget` in the trim report. |

Only the judge-facing copy is trimmed; every persona judge (correctness, groundedness, Criteria and, when enabled, PersonaRubric) reads the same capped copy. Tool ids, params, the final answer, errors and the trace id are untouched, and the stored transcript stays verbatim. Every trim is logged and recorded as `judgePayloadTrim` on the example output, so a trimmed score is distinguishable from an untrimmed one. Scores from runs with a cap set are not strictly comparable with uncapped runs.

## Seed profiles (`SEED_PROFILE`)

- **`minimal` (default)** - 3 sample alerts + 1 rule. Fast and cheap to seed; prompts match the published matrix runs, but the environment does NOT reproduce the published-benchmark dataset. Scores are not directly comparable.
- **`parity`** - 98-doc snapshot of the original `chrysalis-sim` benchmark dataset (5-stage APT chain: needle/noise alerts, endpoint telemetry, Rapid7 IOCs, on-call schedule) across 8 indices, from `fixtures/chrysalis_parity_docs.ts`. Timestamps are re-stamped relative to run time. Use for apples-to-apples comparison against the original benchmark. Scores under `parity` are NOT comparable with `minimal` runs - the environment differs by design. `parity` is the intended single dataset going forward: the default remains `minimal` only until the next full matrix re-run, at which point all models are re-measured under `parity` in one pass and the default flips.

### Entity store (all profiles)

Entity-analytics examples call `security.search_entities` / `security.get_entity`, which are only available when the **Security entity store is installed**. The suite installs it automatically in `evaluate.beforeAll`, then calls the start endpoint so engines a previous run left stopped come back up, and waits until every engine reports `started` (idempotent on a running store), so no manual step is needed (`.entities.v2.latest.security_default`). If the store cannot be installed or started, setup fails the run when an example selected to run (after `EVAL_EXAMPLES` and the shard) expects a `security.get_entity*` or `security.search_entities` tool; otherwise it logs a warning and continues. The tool gate only checks that the store's index exists, so the tool pre-flight alone would not catch a store that installed but did not start.

### Prerequisites for `SEED_PROFILE=parity`

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
