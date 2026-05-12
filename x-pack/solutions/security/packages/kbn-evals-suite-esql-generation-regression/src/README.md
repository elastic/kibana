# ES|QL Generation Regression Suite (`esql-generation-regression`)

Playwright-based regression suite for the ES|QL generation feature in Elastic Security, built on `@kbn/evals` — the source of truth for eval framework primitives (fixtures, evaluators, dataset typing, reporting).

## Suite ID

**`esql-generation-regression`**

Registered in `.buildkite/pipelines/evals/evals.suites.json`.

---

## What this suite evaluates

The core task is: **generate a correct ES|QL query from a natural-language question**.

A system prompt instructs the LLM to return only the raw ES|QL query text. The generated query is scored by four evaluators:

| Evaluator | Kind | Score | Source | Description |
|---|---|---|---|---|
| **ES\|QL Equivalence** | `LLM` | 0 or 1 | `@kbn/evals` (`createEsqlEquivalenceEvaluator`) | Judges whether the generated query is *functionally equivalent* to the reference query — same results, not necessarily same syntax. |
| **ES\|QL Validity** | `CODE` | 0–1 | suite-local (`src/evaluators/esql_validity.ts`) | Parses each generated query via `@kbn/esql-language` `validateQuery`; score is the fraction of queries with no AST errors. No LLM call, no network. |
| **ES\|QL Execution** | `CODE` | 0–1 | suite-local (`src/evaluators/esql_execution.ts`) | Runs each generated query against the live Elasticsearch cluster; three-tier composite of AST validity, execution success, and optional hit detection. |
| **ES\|QL Result Equivalence** | `CODE` | 0–1 | suite-local (`src/evaluators/esql_result_equivalence.ts`) | Executes both gold and candidate queries and computes Jaccard similarity over their normalised row sets. Score 1 = identical rows, 0 = no overlap. |

---

## Dataset

The canonical regression dataset is `src/dataset.ts` — an inline `Array<Example<{ question }, { query }, …>>` of 31 examples typed against the `@kbn/evals` `Example<>` generic. Storing the dataset as TypeScript locks the `input`/`output` shape at compile time, makes dataset diffs human-readable in PRs, and avoids runtime JSON parsing.

### Shape

Each entry is an `Example`:

```typescript
interface Example<TInput, TOutput, TMetadata> {
  input: TInput;       // { question: string } — natural-language question
  output: TOutput;     // { query: string }    — ground-truth ES|QL
  metadata?: TMetadata; // { query_intent?, criteria? } — optional per-example hints
}
```

### Adding or updating examples

Edit `src/dataset.ts` directly: append/replace entries in the array and update the count assertion in `src/dataset.test.ts`. There is no external dataset to sync from — this file IS the source of truth.

```bash
node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-esql-generation-regression/src/dataset.test.ts
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
  node scripts/evals run --suite esql-generation-regression
```

### 4) Smoke test (single example)

Set `ESQL_GENERATION_DATASET_LIMIT=1` and `ESQL_GENERATION_DATASET_OFFSET=<n>` to run exactly one example:

```bash
nvm use && EVALUATION_CONNECTOR_ID=<connector-id> \
  ESQL_GENERATION_DATASET_LIMIT=1 ESQL_GENERATION_DATASET_OFFSET=2 \
  node scripts/evals run --suite esql-generation-regression
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
node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-esql-generation-regression
```

### Type check

```bash
node scripts/type_check --project x-pack/solutions/security/packages/kbn-evals-suite-esql-generation-regression/tsconfig.json
```

### Lint

```bash
node scripts/eslint --fix x-pack/solutions/security/packages/kbn-evals-suite-esql-generation-regression
```
