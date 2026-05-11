# ES|QL Generation Regression Suite (`esql-generation-regression`)

Playwright-based regression suite for the ES|QL generation feature in Elastic Security, built on `@kbn/evals`.

## Suite ID

**`esql-generation-regression`**

Registered in `.buildkite/pipelines/evals/evals.suites.json`.

---

## What this suite evaluates

The core task is: **generate a correct ES|QL query from a natural-language question**.

A system prompt instructs the LLM to return only the raw ES|QL query text. The generated query is compared against a ground-truth reference query using:

| Evaluator | Kind | Score | Description |
|---|---|---|---|
| **ES\|QL Equivalence** | `LLM` | 0 or 1 | Judges whether the generated query is *functionally equivalent* to the reference query — same results, not necessarily same syntax. Uses `createEsqlEquivalenceEvaluator` from `@kbn/evals`. |

---

## Dataset

### Provenance

The 31 examples are exported from the LangSmith dataset:

- **Dataset name**: `ES|QL Generation Regression Suite`
- **Dataset ID**: `261dcc59-fbe7-4397-a662-ff94042f666c`
- **Export date / cutoff**: 2026-05-07

The dataset is stored as an inline TypeScript array in `src/dataset.ts`. This choice locks the `input`/`expected` shape at compile time, makes dataset diffs human-readable, and avoids runtime JSON parsing.

### Shape

Each entry is an `EsqlGenerationExample`:

```typescript
interface EsqlGenerationExample {
  input: string;           // natural-language question
  expected: { query: string }; // ground-truth ES|QL
  criteria?: string[];     // optional per-example judge hints (reserved)
}
```

### Refreshing the dataset from LangSmith

To update `src/dataset.ts` with a new LangSmith export:

1. **Export from LangSmith**

   In the LangSmith UI, open the dataset `ES|QL Generation Regression Suite`
   (id: `261dcc59-fbe7-4397-a662-ff94042f666c`), filter by date range if needed
   (e.g. exclude examples added after the cutoff), remove duplicates
   (deduplicate on `inputs.question` — keep the entry with the latest
   `modified_at`), then export as JSON.

2. **Field mapping**

   | LangSmith JSON field | `dataset.ts` field |
   |---|---|
   | `inputs.question` or `inputs.input` | `input` |
   | `outputs.query` or `outputs.expected_query` | `expected.query` |
   | `metadata.criteria` (optional array) | `criteria` |

3. **Convert to TypeScript**

   Replace the array body in `src/dataset.ts`, update the comment at the top
   with the new count and export date, and update the `description` string in
   `evals/esql-generation-regression.spec.ts`.

4. **Validate**

   ```bash
   node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-esql-generation-regression/src/dataset.ts
   node scripts/type_check --project x-pack/solutions/security/packages/kbn-evals-suite-esql-generation-regression/tsconfig.json
   ```

---

## Parity matrix: LangSmith vs `@kbn/evals` (Phase 1 / Phase 2)

| LangSmith evaluator | Phase 1 equivalent | Phase 2 (planned) |
|---|---|---|
| ES\|QL Equivalence (LLM-as-judge) | ✅ `ES\|QL Equivalence` via `createEsqlEquivalenceEvaluator` | — |
| ES\|QL Syntax Validity (deterministic) | ❌ not yet | TODO: `createEsqlSyntaxValidityEvaluator` |
| ES\|QL Execution (live cluster) | ❌ not yet | TODO: `createEsqlExecutionEvaluator` |
| Result-row equivalence | ❌ not yet | TODO: new primitive in `@kbn/evals` |

Phase 2 will upstream the deterministic validity + execution evaluators and add a result-row equivalence primitive. No framework changes are required for Phase 1.

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
