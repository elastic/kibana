# @kbn/evals-suite-lead-generation

End-to-end evaluation suite for the Security Entity Analytics **Lead Generation**
pipeline — an async background task that queries the live Entity Store and
produces prioritized investigation leads (title, byline, description, entities,
priority 1–10, observations). The suite measures both the structural correctness
of the pipeline output (a CODE evaluator) and the holistic quality/specificity of
the generated leads (an LLM rubric judge).

> **On-demand only.** This suite is **not** part of the weekly eval pipeline; it
> runs only when the `evals:lead-generation` PR label is applied.

## Prerequisites

- The suite runs through the `evals_lead_generation` Scout `serverConfigSet`
  (`src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_lead_generation`),
  which extends the Entity Store V2 tracing config and enables the
  `entityAnalyticsEntityStoreV2` and `leadGenerationEnabled` experimental
  features.
- An AI connector available (see `@kbn/evals` docs for standard connector setup).
- For meaningful rubric scores, the Entity Store must be seeded with entities;
  the smoke tests still pass against an empty store.

## Running

From the Kibana repo root:

```sh
# Start Kibana + ES test server with the lead-generation config set
node scripts/scout start-server \
  --arch stateful \
  --domain classic \
  --serverConfigSet evals_lead_generation

# In another terminal, run the suite (bundled 8-example dataset, no env vars needed)
node scripts/evals run --suite lead-generation
```

`node scripts/evals start --suite lead-generation` manages the Scout server for you.

All evaluation specs live under [`evals/lead_generation`](./evals/lead_generation).

> **Concurrency is forced to 1** by default: the async pipeline overwrites its
> last-execution UUID on each `generate` call, so parallel runs race. Override
> with `LEAD_GENERATION_EVAL_CONCURRENCY` only against a server that supports
> per-execution status.

## Dataset

8 examples in the checked-in
[`data/eval_dataset_lead_generation_all_scenarios.jsonl`](./data) (works out of
the box). The `input` is minimal because the pipeline queries the live Entity
Store; `output.leads` is a structural reference — quality is judged holistically
by the rubric, not by exact field comparison. Three dataset modes are supported
(see [`data/README.md`](./data/README.md)):

1. `LEAD_GENERATION_DATASET_JSONL_PATH` → a local JSONL file
2. `LEAD_GENERATION_DATASET_NAME` + `EVALUATIONS_KBN_URL` → an upstream golden cluster
3. bundled default (no env vars required)

## Evaluators

| Evaluator | Kind | Measures |
| --- | --- | --- |
| `LeadGenerationBasic` | CODE | No pipeline errors; `leads` is an array; every lead is structurally valid (non-empty id/title/byline/description, entities array, priority 1–10, observations, executionUuid) |
| `LeadGenerationRubric` | LLM | Holistic quality/specificity of the leads; short-circuits to 0 on errors or null leads (no LLM call) |

The spec also includes inline smoke evaluators (`Ran`, `StatusMatchesExecution`)
and **calibration** runs that feed deliberately bad outputs (empty title,
out-of-range priority, vague leads) through the evaluators and record the results
to experiment history, so a human can confirm the evaluators correctly score
them at/near 0.
