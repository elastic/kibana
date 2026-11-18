# @kbn/evals-suite-siem-readiness

End-to-end evaluation suite for the **SIEM Readiness** Agent Builder skill. Each
scenario sends a natural-language question to the default agent
(`/api/agent_builder/converse`) and asserts the agent calls the readiness tools
(`get_coverage`, `get_quality`, `get_continuity`, `get_retention`) and returns a
structured four-section report — Status / Summary / Findings / Suggested Actions
— with blast-radius sub-bullets per finding and **no fabricated findings** for
dimensions that have no issues.

## Prerequisites

- The suite runs through the `evals_tracing` Scout `serverConfigSet`
  (`src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_tracing`),
  which enables `xpack.evals` and full Kibana OTel tracing (sampled at 100%).
- Agent Builder experimental features are enabled per-run by the spec
  (`agentBuilder:experimentalFeatures`).
- An AI connector available (see `@kbn/evals` docs for standard connector setup).
  Override the agent with `AGENT_BUILDER_AGENT_ID`.

## Running

From the Kibana repo root:

```sh
# Start Kibana + ES test server with the tracing config set
node scripts/scout start-server \
  --arch stateful \
  --domain classic \
  --serverConfigSet evals_tracing

# In another terminal, run the suite
node scripts/evals run --suite siem-readiness
```

`node scripts/evals start --suite siem-readiness` manages the Scout server for you.

All evaluation specs live under
[`evals/siem_readiness`](./evals/siem_readiness).

## Scenarios

9 scenarios, one example each, defined inline in
[`evals/siem_readiness/siem_readiness.spec.ts`](./evals/siem_readiness/siem_readiness.spec.ts):

| Scenario | What it asserts |
| --- | --- |
| full report | All four tools called; overall status `actionsRequired` |
| coverage — missing Application/SaaS | Missing categories flagged; present categories not falsely flagged |
| quality — ECS incompatibility | Identity index's incompatible ECS fields surfaced; healthy index not flagged |
| continuity — critical pipeline failure | Failing ingest pipeline flagged critical; healthy pipeline not flagged |
| retention — FedRAMP non-compliance | Below-threshold data stream flagged; compliant stream not flagged |
| blast-radius accuracy | Affected rules and MITRE tactics rendered as labeled sub-bullets |
| dimension-scoped continuity | Only `get_continuity` called; other dimensions omitted |
| `noData` for non-existent index | No fabricated findings; status `noData` |
| four-section format | Sections appear in order Status → Summary → Findings → Suggested Actions |

## Data

No golden cluster and no pre-loaded snapshot: all fixture data is seeded fresh
per run by [`src/data_generators/siem_readiness_data.ts`](./src/data_generators/siem_readiness_data.ts)
across the four readiness dimensions (coverage indices, data-quality results,
ingest-pipeline continuity, and DSL retention). Every index, pipeline, and
data-stream name gets a random per-run prefix so the agent cannot rely on
predictable names, and all artifacts are cleaned up in `afterAll`.

## Evaluators

The registered quality judge is `SIEM Readiness Criteria` (LLM,
[`createSiemReadinessCriteriaEvaluator`](./src/evaluate_dataset.ts)). It layers
each example's `output.criteria` on top of a shared `BASELINE_SIEM_READINESS_CRITERIA`
set (six criteria covering the section contract, blast-radius sub-bullets, and
the no-fabrication rule) so the contract does not drift across specs.

Because the suite runs under `evals_tracing`, the framework's trace-based metrics
(tool calls, latency, input/output/cached tokens) are also captured from each
run's OTel trace and recorded alongside the quality score.
