# Security ES|QL Generation Regression Suite (`security-esql-generation-regression`)

Playwright-based regression suite for the ES|QL generation feature in Elastic Security, built on `@kbn/evals` — the source of truth for eval framework primitives (fixtures, evaluators, dataset typing, reporting).

## Suite ID

**`security-esql-generation-regression`**

Registered in `.buildkite/pipelines/evals/evals.suites.json`.

Failures alert `#security-generative-ai-evals` (shared with the Security Automatic Migrations suite).

---

## What this suite evaluates

The core task is: **generate a correct ES|QL query from a natural-language question, via the same agent the production assistant uses**.

Each example drives one round-trip through `/api/agent_builder/converse` with `agent_id: 'elastic-ai-agent'` (Kibana's default agent), so the suite measures the full agent loop — `list_indices` / `get_index_mapping` / `generate_esql` / `execute_esql` — not a raw `inferenceClient.chatComplete` call. This is the supported successor to the LangSmith-era `DefaultAssistantGraph.invoke()` path and keeps the regression story anchored to the same production surface end users hit from the assistant UI.

Generated queries are scored by two tiers of evaluators — the first measures *quality*, the second measures *observability metrics* derived from OTel traces. The set is pinned in `evaluate_dataset.test.ts` so a silent drop or rename surfaces in CI.

### How ES|QL is extracted from the agent response

`extractEsqlFromConverseResponse` (`src/extract_esql.ts`) tries three strategies in order, first match wins:

1. **Structured tool result** — pulls `esql` from a `platform.core.generate_esql` tool-call step's `results[].data.esql`; falls back to `platform.core.execute_esql`'s `results[].data.query` if the agent chose to execute directly without surfacing the intermediate `generate_esql` call.
2. **Fenced markdown block** — extracts the first triple-backtick block from the final assistant message (handles cases where the agent answers in prose with the query embedded).
3. **`FROM` heuristic** — slices the final message from the first `FROM` keyword. Last resort; the `ES|QL Validity` evaluator scores the result so a bad slice cannot silently inflate the suite.

### Fixture indices

Spec `beforeAll` materialises **six index mappings** (`postgres-logs-*`, `packetbeat-*`, `nyc_taxis-*`, `metricbeat-*`, `employees-*`, `logs-*`) and **two sample documents** (`traces-apm-*`, `metrics-apm-*`). These are the indices the dataset's gold queries reference; without them the `ES|QL Execution Validity` and `ES|QL Result Equivalence` evaluators score 0 for every example (`verification_exception` — unknown column / unknown index). Ported from the LangSmith-era `PrepareIndicesForAssistantGraphEvaluations`, collapsed to a single environment+date pair (`production.evaluations.2025.01.01`) since the gold queries only reference bare wildcards. `afterAll` deletes everything by wildcard so cross-run drift is swept.

### Quality (LLM- and code-judged)

| Evaluator | Kind | Score | Source | Description |
|---|---|---|---|---|
| **ES\|QL Functional Equivalence** | `LLM` | 0 or 1 | `@kbn/evals` (`createEsqlEquivalenceEvaluator`) | Judges whether the generated query is *functionally equivalent* to the reference query — same results, not necessarily same syntax. |
| **ES\|QL Validity** | `CODE` | 0–1 | suite-local (`src/evaluators/esql_validity.ts`) | Parses each generated query via `@kbn/esql-language` `validateQuery`; score is the fraction of queries with no AST errors. No LLM call, no network. |
| **ES\|QL Execution Validity** | `CODE` | 0–1 | suite-local (`src/evaluators/esql_execution.ts`) | Runs each generated query against the live Elasticsearch cluster; three-tier composite of AST validity, execution success, and optional hit detection. |
| **ES\|QL Result Equivalence** | `CODE` | 0–1 | suite-local (`src/evaluators/esql_result_equivalence.ts`) | Executes both gold and candidate queries and computes Jaccard similarity over their normalised row sets. Score 1 = identical rows, 0 = no overlap. |

### Observability (trace-based, zero per-example LLM cost)

Each task captures the active span's `traceId` via `getCurrentTraceId()` and the framework's trace-based evaluators query the OTel traces captured by the EDOT collector. These set a baseline we can track over time without paying for additional LLM judging — drift in latency or token usage typically shows up here before quality regressions become visible.

| Evaluator | Kind | Score | Source | Description |
|---|---|---|---|---|
| **Tool calls** | `CODE` | count | `@kbn/evals` (`evaluators.traceBasedEvaluators.toolCalls`) | Number of `gen_ai.*` tool-call spans captured for this task's trace. |
| **Latency** | `CODE` | ms | `@kbn/evals` (`evaluators.traceBasedEvaluators.latency`) | End-to-end task latency, measured from the root span. |
| **Input tokens** | `CODE` | count | `@kbn/evals` (`evaluators.traceBasedEvaluators.inputTokens`) | Prompt tokens summed across LLM spans. |
| **Output tokens** | `CODE` | count | `@kbn/evals` (`evaluators.traceBasedEvaluators.outputTokens`) | Completion tokens summed across LLM spans. |
| **Cached tokens** | `CODE` | count | `@kbn/evals` (`evaluators.traceBasedEvaluators.cachedTokens`) | Cached-prompt tokens summed across LLM spans (when the provider reports them). |

---

## Dataset

The canonical regression dataset is `src/dataset.ts` — an inline `Array<Example<{ question }, { query }>>` of 31 examples typed against the `@kbn/evals` `Example<>` generic. Storing the dataset as TypeScript locks the `input`/`output` shape at compile time, makes dataset diffs human-readable in PRs, and avoids runtime JSON parsing.

### Shape

Each entry is an `Example`:

```typescript
interface Example<TInput, TOutput> {
  input: TInput;   // { question: string } — natural-language question
  output: TOutput; // { query: string }    — ground-truth ES|QL
}
```

### Adding or updating examples

Edit `src/dataset.ts` directly: append/replace entries in the array and update the count assertion in `src/dataset.test.ts`. There is no external dataset to sync from — this file IS the source of truth.

```bash
node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-security-esql-generation-regression/src/dataset.test.ts
```

---

## How to run locally

### 0) Bootstrap

```bash
nvm use
yarn kbn bootstrap
```

### 1) Set up local config (one-time)

```bash
node scripts/evals init config
```

This writes `config/evals.json` with the Elasticsearch URL, API key, and default connector.

### 2) Start the local eval stack

```bash
nvm use && node scripts/evals scout
```

### 3) Run the full suite

```bash
nvm use && EVALUATION_CONNECTOR_ID=<connector-id> \
  node scripts/evals run --suite security-esql-generation-regression
```

### 4) Smoke test (single example)

Set `ESQL_GENERATION_DATASET_LIMIT=1` and `ESQL_GENERATION_DATASET_OFFSET=<n>` to run exactly one example:

```bash
nvm use && EVALUATION_CONNECTOR_ID=<connector-id> \
  ESQL_GENERATION_DATASET_LIMIT=1 ESQL_GENERATION_DATASET_OFFSET=2 \
  node scripts/evals run --suite security-esql-generation-regression
```

---

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `EVALUATION_CONNECTOR_ID` | Connector ID for the task model (required) | — |
| `EVALUATIONS_ES_URL` | Elasticsearch URL for storing results | `http://elastic:changeme@localhost:9220` |
| `EVALUATIONS_ES_API_KEY` | API key for the results cluster | (none) |
| `EVALUATION_REPETITIONS` | Number of times to run each example | `1` |
| `ESQL_GENERATION_DATASET_LIMIT` | Max examples to load | (all 31) |
| `ESQL_GENERATION_DATASET_OFFSET` | Skip first N examples | `0` |

---

## Viewing results

Results are written to `.kibana-evaluations` in Elasticsearch. Use Kibana Dev Tools:

```
GET .kibana-evaluations/_search
{
  "query": { "term": { "run_id": "<run-id>" } },
  "sort": [{ "@timestamp": "desc" }],
  "size": 100
}
```

---

## Development

### Unit tests

```bash
node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-security-esql-generation-regression
```

### Type check

```bash
node scripts/type_check --project x-pack/solutions/security/packages/kbn-evals-suite-security-esql-generation-regression/tsconfig.json
```

### Lint

```bash
node scripts/eslint --fix x-pack/solutions/security/packages/kbn-evals-suite-security-esql-generation-regression
```
