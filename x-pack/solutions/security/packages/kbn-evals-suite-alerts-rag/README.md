# @kbn/evals-suite-alerts-rag

End-to-end evaluation suite for the Agent Builder **`alert-analysis`** skill,
which answers natural-language questions about open Security alerts by querying
Elasticsearch through the `security.alerts` ES|QL tool. The suite drives the
default agent via `/api/agent_builder/converse` and verifies it activates the
correct skill (rather than freelancing with raw alternatives) and grounds its
answer in the actual alert data.

## Prerequisites

- No dedicated `serverConfigSet` — the suite runs against the default evals
  server configuration.
- An AI connector available (see `@kbn/evals` docs for standard connector setup).
- Realistic alert data. In CI the suite restores the shared Security alerts GCS
  snapshot (`ALERTS_RAG_ALERTS_SNAPSHOT_*` env vars) in `beforeAll`; if GCS
  credentials are absent it evaluates against whatever alerts already exist in
  the cluster. After restore, `verifyAlertsRagSnapshot` asserts the dataset
  invariants (≥5 open alerts, ≥1 critical/high, ≥2 distinct hosts, etc.) and
  fails fast if they are not met.

## Running

From the Kibana repo root:

```sh
# Start the evals server
node scripts/scout start-server --arch stateful --domain classic

# In another terminal, run the suite
node scripts/evals run --suite security-alerts-rag-regression
```

`node scripts/evals start --suite security-alerts-rag-regression` manages the
Scout server for you.

All evaluation specs live under [`evals`](./evals).

## Dataset

8 examples defined locally in
[`src/datasets/alerts_rag_dataset.ts`](./src/datasets/alerts_rag_dataset.ts)
(not JSONL, not fetched live). Each example is annotated with an expected
`tool_sequence` (`['security.alerts']`). The spec groups examples by category and
runs one `evaluate()` test per category:

| Category | Example questions |
| --- | --- |
| `multi_alert_correlation` | "Which alerts should I look at first?"; "Are any open alerts targeting the same host or user?" |
| `field_specific_lookup` | "What hosts are affected?"; "Which `user.name` is mentioned the most?" |
| `temporal_query` | "What is the most recent alert?"; "Any new alerts in the last hour?" |
| `single_alert_query` | "Tell me about the most severe open alert."; "What's the lowest-severity open alert?" |

## Evaluators

Built in `buildAlertsRagEvaluators`
([`src/evaluate_dataset.ts`](./src/evaluate_dataset.ts)):

| Evaluator | Kind | Measures |
| --- | --- | --- |
| `Factuality`, `Relevance`, `Sequence Accuracy` | LLM (quantitative) | Answer correctness vs. the alert data |
| `Groundedness` | LLM (quantitative) | Whether claims are grounded in retrieved context |
| `Tool Calls`, `Latency`, `Input Tokens`, `Output Tokens`, `Cached Tokens` | CODE (trace-based) | Non-functional metrics from the OTel trace (no extra LLM cost) |
| `Skill Invoked (alert-analysis)` | CODE (trace-based) | That the `alert-analysis` skill file was actually read |
| `Trajectory` | CODE | Tool-call order vs. the per-example `tool_sequence` |

The registered evaluator set is pinned by
[`src/evaluate_dataset.test.ts`](./src/evaluate_dataset.test.ts): it asserts the
exact ordered list of evaluator names so a silent rename or drop fails in Jest
before reaching CI, and explicitly guards against re-introducing the retired
`Faithfulness` / `AnswerCorrectness` evaluators.
