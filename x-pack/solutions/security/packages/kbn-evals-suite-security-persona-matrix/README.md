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

| Variable | Effect |
| --- | --- |
| `PERSONA_MATRIX_JUDGE_RESULT_CAP` | Max chars kept per tool result. Larger results are replaced by a stub that states the original size, followed by the first N chars. |
| `PERSONA_MATRIX_JUDGE_PAYLOAD_BUDGET` | Max chars for the whole judge payload. After the per-result cap, the largest remaining results are trimmed first, each keeping the longest prefix that lets the whole payload fit. If the untouched fields (answer, errors, params) alone exceed the budget, the payload is still over it; that is logged and recorded as `overBudget` in the trim report. |

Only the judge-facing copy is trimmed; all three judges (correctness, groundedness, Criteria) read the same capped copy. Tool ids, params, the final answer, errors and the trace id are untouched, and the stored transcript stays verbatim. Every trim is logged and recorded as `judgePayloadTrim` on the example output, so a trimmed score is distinguishable from an untrimmed one. Scores from runs with a cap set are not strictly comparable with uncapped runs.

## Seed and agent profiles

The suite id picks the profiles, so nothing beyond `EVAL_SUITE_ID` (or `--suite`) has to be set locally or reach the on-demand and fanout steps:

| Suite id                         | Seed profile | Agent profile      |
| -------------------------------- | ------------ | ------------------ |
| `security-persona-matrix`        | `minimal`    | `default`          |
| `security-persona-matrix-parity` | `parity`     | `chrysalis-parity` |

`SEED_PROFILE` and `AGENT_PROFILE` only take effect when `EVAL_SUITE_ID` is unset (a raw `node scripts/playwright test` run). When it is set, a `SEED_PROFILE` or `AGENT_PROFILE` that disagrees with the suite id fails the run at startup. No CI step sets either variable.

### Seed profiles (`SEED_PROFILE`)

- **`minimal` (default for `security-persona-matrix`)** - 3 sample alerts + 1 rule. Fast and cheap to seed; prompts match the published matrix runs, but the environment does NOT reproduce the published-benchmark dataset. Scores are not directly comparable.
- **`parity`** - 98-doc snapshot of the original `chrysalis-sim` benchmark dataset (5-stage APT chain: needle/noise alerts, endpoint telemetry, Rapid7 IOCs, on-call schedule) across 8 indices, from `fixtures/chrysalis_parity_docs.ts`. Timestamps are re-stamped relative to run time. Use for apples-to-apples comparison against the original benchmark; it is what `security-persona-matrix-parity` runs. Scores under `parity` are NOT comparable with `minimal` runs - the environment differs by design. The default suite keeps the `minimal` seed; the `parity` seed runs only under `security-persona-matrix-parity`.

#### Entity store (all profiles)

Entity-analytics examples call `security_search_entities` / `security.get_entity`, which are only available when the **Security entity store is installed**. The suite installs it automatically in `evaluate.beforeAll`, then calls the start endpoint so engines a previous run left stopped come back up, and waits until every engine reports `started` (idempotent on a running store), so no manual step is needed (`.entities.v2.latest.security_default`). If the store cannot be installed or started, setup fails the run when an example selected to run (after `EVAL_EXAMPLES` and the shard) expects a `security.get_entity*` or `security.search_entities` tool; otherwise it logs a warning and continues. The tool gate only checks that the store's index exists, so the tool pre-flight alone would not catch a store that installed but did not start.

#### Prerequisites for the `parity` seed

The parity tools are backed by Elastic Workflows, so the **workflows plugin must be enabled** on the stack.

#### What `parity` seeds

- **Data** - the 98 docs above, including a synthetic threat-intel record for the EICAR test hash. After seeding, a data gate checks that every seeded doc is searchable in its index and fails setup with per-index found/expected counts on any shortfall.
- **Workflows** - `vt-hash-lookup` (ES|QL lookup against the seeded threat-intel index; no external call, no API key), `create-case` (opens a case tagged `persona-matrix-parity`), and `create-channel` (records the request in the `persona-matrix-side-effects` index instead of calling Slack).
- **Tools** - `vt.hash.lookup`, `create.case`, `create.channel` (workflow tools wired to the workflows above), plus `get.time` and `check.on.call.schedule` (ES|QL tools; the on-call query keeps only fields present on the seeded schedule doc).

Cleanup removes only the tools, workflows and agent created by the run, plus, when the run created the `create-case` workflow, the cases tagged `persona-matrix-parity` opened since then.

### Agent profiles (`AGENT_PROFILE`)

- **`default`** - the built-in Elastic AI Agent, with skills routed naturally. Used by `security-persona-matrix`.
- **`chrysalis-parity`** - creates the dedicated agent used by the external EIS model benchmark (same instructions, skills and five tools) and runs every prompt against it. The default agent is left untouched. Requires the `parity` seed, which the parity suite id selects; setup fails otherwise. Skill ids missing from the install are dropped with a warning.

Use `chrysalis-parity` only to reproduce the external benchmark's environment. Scores under the two profiles are not comparable.

### Running the parity calibration set

Run the five calibration models first, to check the parity environment end to end before spending on the full set:

| Model id                    | Connector group (`EVAL_MODEL_GROUPS`) | Connector id (`--project`)      |
| --------------------------- | ------------------------------------- | ------------------------------- |
| `google-gemini-3.1-pro`     | `eis/google-gemini-3.1-pro`           | `eis-google-gemini-3-1-pro`     |
| `anthropic-claude-5-sonnet` | `eis/anthropic-claude-5-sonnet`       | `eis-anthropic-claude-5-sonnet` |
| `anthropic-claude-4.6-opus` | `eis/anthropic-claude-4.6-opus`       | `eis-anthropic-claude-4-6-opus` |
| `openai-gpt-oss-120b`       | `eis/openai-gpt-oss-120b`             | `eis-openai-gpt-oss-120b`       |
| `openai-gpt-5.4-mini`       | `eis/openai-gpt-5.4-mini`             | `eis-openai-gpt-5-4-mini`       |

There is no named model-set mechanism: the models under test come from the connector selection, so the set is passed as env on the run. Connector ids are `eis-` plus the model id with dots turned into dashes; `jq -r '.connectors | keys[]' ~/.elastic/eis-connectors-cache.json` lists the ones available locally.

The suite id is what the harness records as `suite_id` on every score, which is what the matrix report filters on, so parity scores never mix with default-agent or minimal-seed runs.

- **Local:** `node scripts/evals run --suite security-persona-matrix-parity --project <connector id>`, once per model connector.
- **CI (on-demand eval build):** `EVAL_SUITE_ID=security-persona-matrix-parity`, `EVAL_MODEL_GROUPS=eis/google-gemini-3.1-pro,eis/anthropic-claude-5-sonnet,eis/anthropic-claude-4.6-opus,eis/openai-gpt-oss-120b,eis/openai-gpt-5.4-mini`, `EVAL_INCLUDE_EIS_MODELS=1`, `FTR_EIS_CCM=1`. For the full set, build `EVAL_MODEL_GROUPS` from the config:

  ```
  jq -r '[.models[].id | "eis/" + .] | join(",")' x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/persona_matrix.parity.config.json
  ```

  The suite is also selectable on a PR with the `evals:security-persona-matrix-parity` label. `evals:all` does not include it (`excludeFromEvalsAll` in `evals.suites.json`), so only its own label or an on-demand build runs it.

### Model set

`persona_matrix.parity.config.json` lists 43 models: the benchmark's model list intersected with the models reachable through EIS, so each one can be run from the connector selection above. Models the benchmark lists that are not reachable through EIS (`anthropic-claude-4.5-sonnet`, `google-gemini-2.5-pro`, `google-gemini-2.5-flash`, `google-gemini-2.5-flash-lite`) are left out on purpose. The legacy `gp-llm-v2` and `rainbow-sprinkles` endpoints are left out: Kibana hides them from its UIs as backwards-compatibility endpoints and nothing in the catalog says whether they support tool calling, which every persona prompt requires.

### Rendering the report

`persona_matrix.parity.config.json` is the report config for the parity suite id: it keeps the 21 persona-prompt columns (attack discovery and migrations have no parity profile) and lists the parity model set. `minCoverage` is 21 of 21, so a model gets an `Overall` score only when all 21 columns have scores; a partial run shows `insufficient-coverage` instead. Render it with:

```
node x-pack/solutions/security/packages/kbn-security-evals-matrix/scripts/run_cli.cjs matrix \
  --config x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/persona_matrix.parity.config.json \
  --profile <profile> --out target/llm_matrix
```

`--profile` names the golden-cluster config profile that supplies the Kibana URL and API key for the cluster holding the scores (or pass `--kbn-url` and `--kbn-api-key`). The config reads the latest run per model from `branch: "main"` within `lookbackDays: 45`; for runs built from a feature branch, add `--branch <branch>`, and use `--lookback-days <n>` for older runs.

To report only the calibration set, repeat `--model <id>` for each id in the table (this replaces the config's model set; labels fall back to the id unless you add `--model <id>:<label>`). If no experiment matches the configured suite, branch and models, the command fails with "No experiments matched the configured filters" instead of writing an empty matrix.
