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
| **ES\|QL Functional Equivalence** | `LLM` | 0 / 0.5 / 1 | suite-local (`src/evaluators/esql_functional_equivalence.ts`) | Calibrated three-point judge — same evaluator name as the framework default, but the rubric (allow-list of common transformations, deny-list of substantive differences, conservative tie-breaker on `equivalent_with_caveats`) is suite-local. Stamps `metadata.judgeVersion=v2` so dashboards can partition out the framework's v1 history if needed. See [Calibrated FuncEq + bind-param substitution](#calibrated-funceq--bind-param-substitution) below. |
| **ES\|QL Validity** | `CODE` | 0–1 | suite-local (`src/evaluators/esql_validity.ts`) | Parses each generated query via `@kbn/esql-language` `validateQuery`; score is the fraction of queries with no AST errors. No LLM call, no network. |
| **ES\|QL Execution Validity** | `CODE` | 0–1 | suite-local (`src/evaluators/esql_execution.ts`) | Runs each generated query against the live Elasticsearch cluster; three-tier composite of AST validity, execution success, and optional hit detection. Substitutes `?_tstart` / `?_tend` at the ES boundary so the agent's bind-parameter form executes cleanly. |
| **ES\|QL Result Equivalence** | `CODE` | 0–1 | suite-local (`src/evaluators/esql_result_equivalence.ts`) | Executes both gold and candidate queries and computes Jaccard similarity over their normalised row sets. Score 1 = identical rows, 0 = no overlap. Same bind-parameter substitution as the execution evaluator. |

#### Calibrated FuncEq + bind-param substitution

Two suite-local divergences from the framework defaults, both motivated by failure cases observed against the EIS baseline:

- **`?_tstart` / `?_tend` substitution** (`src/evaluators/esql_bind_params.ts`) — the agent emits ES|QL with these placeholders for the user's time window; in production they're substituted at the `esClient.esql.query({ query, params })` boundary. Running the agent's output directly without substitution caused ~50% of otherwise-correct candidate queries to fail with `parsing_exception: Unknown query parameter [_tstart]`. The substitution happens only at the ES boundary; AST validation and `metadata.queries[].query` continue to see the agent's original emission so debuggers see exactly what the model produced.
- **Calibrated FuncEq rubric** (`src/evaluators/esql_functional_equivalence.ts`) — replaces the framework's vague binary "Yes / No" rubric with a three-point scale (`equivalent`, `equivalent_with_caveats`, `not_equivalent`) and explicit allow/deny lists drawn from real failure cases (column renames, equivalent date functions, `?_tstart`/`?_tend` ↔ literal time range, wrong aggregations, missing critical filters). When uncertain, the judge is instructed to return `equivalent_with_caveats` rather than `equivalent`, biasing the suite against false-positive equivalence claims that would mask regressions. Evaluator name stays `ES|QL Functional Equivalence` for golden-cluster history continuity.

### Observability (trace-based, zero per-example LLM cost)

Each task captures the active span's `traceId` via `getCurrentTraceId()` and the framework's trace-based evaluators query the OTel traces captured by the EDOT collector. These set a baseline we can track over time without paying for additional LLM judging — drift in latency or token usage typically shows up here before quality regressions become visible.

| Evaluator | Kind | Score | Source | Description |
|---|---|---|---|---|
| **Tool calls** | `CODE` | count | `@kbn/evals` (`evaluators.traceBasedEvaluators.toolCalls`) | Number of `gen_ai.*` tool-call spans captured for this task's trace. |
| **Latency** | `CODE` | ms | `@kbn/evals` (`evaluators.traceBasedEvaluators.latency`) | End-to-end task latency, measured from the root span. |
| **Input tokens** | `CODE` | count | `@kbn/evals` (`evaluators.traceBasedEvaluators.inputTokens`) | Prompt tokens summed across LLM spans. |
| **Output tokens** | `CODE` | count | `@kbn/evals` (`evaluators.traceBasedEvaluators.outputTokens`) | Completion tokens summed across LLM spans. |
| **Cached tokens** | `CODE` | count | `@kbn/evals` (`evaluators.traceBasedEvaluators.cachedTokens`) | Cached-prompt tokens summed across LLM spans (when the provider reports them). |

In CI the trace-based evaluators query the `tracingEs` cluster declared in `kbn-evals` config (the same cluster Kibana exports traces to via `tracingExporters`). Locally, by default Kibana exports traces through the EDOT collector to ES on `host.docker.internal:9200`, while Scout serves the suite on port `9220`; the trace-based evaluators query Scout's local cluster and find no traces. Override with `TRACING_ES_URL=http://elastic:changeme@localhost:9200` (or whichever port your EDOT collector targets) to point the trace client at the cluster that actually holds the spans. Without the override the trace columns render as `-` in the score table — the four ES|QL evaluators are unaffected.

---

## LangSmith parity

This suite replaces the legacy LangSmith-based `DefaultAssistantGraph` evaluation. The four ES|QL evaluators above are the parity baseline (LangSmith covered the same dimensions: query validity, execution success, result equivalence, functional equivalence). End-to-end verification with the live Agent Builder `converse` loop confirms the agent loop, ES|QL extractor, and fixture indices all pull their weight end-to-end. The five trace-based observability evaluators are additive — LangSmith did not expose those metrics as scored evaluators and they require no parity-equivalent in the prior suite.

### Verified runs

Two end-to-end EIS fanouts in Buildkite, same suite, same 31-example dataset, same `google-gemini-3.1-pro` judge, different commits:

- **v1 baseline** — [build #441763](https://buildkite.com/elastic/kibana-pull-request/builds/441763) on commit `35c64e3`. Six EIS models. 1,680 score documents and 138 K OTel spans landed in the golden cluster (`kibana-evaluations` data stream). Measured **before** the two suite-local quality fixes — framework's binary `Yes/No` FuncEq judge, no `?_tstart` / `?_tend` substitution, no SQL pre-check guard.
- **v2 baseline** — [build #442113](https://buildkite.com/elastic/kibana-pull-request/builds/442113) on commit `dcee5ce`. Twelve models in one fanout (six weekly EIS + six LiteLLM OSS — same set the `alerts-rag` suite uses). 3,348 score documents in the same data stream. Measured **after** the three suite-local fixes (calibrated 3-point FuncEq rubric + `?_tstart`/`?_tend` substitution + `extract_esql` SQL pre-check guard + FuncEq defensive guard for missing tool calls). Every score document is stamped with `evaluator.metadata.judgeVersion=v2` so trending dashboards can keep both eras side-by-side or filter to one.

#### v1 → v2 lift on the same six EIS models

| Task model (EIS) | Validity v1→v2 | ExecValidity v1→v2 | FuncEq v1→v2 | ResultEq v1→v2 |
|---|---|---|---|---|
| `openai-gpt-5.4`              | 0.97 → 0.97 (**+0.00**) | 0.69 → 0.97 (**+0.28**) | 0.10 → 0.19 (**+0.09**) | 0.29 → 0.61 (**+0.32**) |
| `anthropic-claude-4.6-opus`   | 0.97 → 1.00 (**+0.03**) | 0.66 → 0.95 (**+0.29**) | 0.03 → 0.15 (**+0.12**) | 0.26 → 0.58 (**+0.32**) |
| `anthropic-claude-4.6-sonnet` | 0.97 → 0.97 (**+0.00**) | 0.81 → 0.90 (**+0.09**) | 0.07 → 0.18 (**+0.11**) | 0.42 → 0.52 (**+0.10**) |
| `google-gemini-3.1-pro`       | 0.97 → 0.97 (**+0.00**) | 0.76 → 0.79 (**+0.03**) | 0.03 → 0.21 (**+0.18**) | 0.42 → 0.48 (**+0.06**) |
| `google-gemini-3.0-flash`     | 0.87 → 0.90 (**+0.03**) | 0.63 → 0.77 (**+0.14**) | 0.10 → 0.32 (**+0.22**) | 0.26 → 0.42 (**+0.16**) |
| `openai-gpt-oss-120b`         | 0.29 → 0.58 (**+0.29**) | 0.16 → 0.08 (**-0.08**) | 0.03 → 0.03 (**+0.00**) | 0.03 → 0.03 (**+0.00**) |
| **EIS-6 mean**                | 0.84 → 0.90 (**+0.06**) | 0.62 → 0.74 (**+0.12**) | 0.06 → 0.18 (**+0.12**) | 0.28 → 0.44 (**+0.16**) |

ExecValidity, FuncEq and ResultEq all moved in the expected direction at the mean (+12 / +12 / +16 percentage points). Per-model attribution:

- **`?_tstart` / `?_tend` substitution** carries most of the ExecValidity lift. `openai-gpt-5.4` (+0.28) and `anthropic-claude-4.6-opus` (+0.29) were the heaviest users of bind-parameter syntax in v1; now those queries actually execute against ES instead of failing on `parsing_exception: Unknown query parameter [_tstart]`.
- **Calibrated 3-point FuncEq rubric** carries the FuncEq lift. v1 emitted a binary `equivalent`/`not_equivalent`; v2 adds a `partial` band (score = 0.5) for queries that differ only in projection columns or row ordering. `google-gemini-3.0-flash` (+0.22) and `google-gemini-3.1-pro` (+0.18) benefit most — they tend to produce semantically right queries with cosmetic differences.
- **`extract_esql` SQL pre-check guard** is the `openai-gpt-oss-120b` story. v1 Validity was 0.29 because mangled SQL output was reaching the AST validator and getting partial credit for `FROM` heuristics. v2 returns an empty extraction for non-ES|QL output → Validity climbs to 0.58 on the queries the model does emit as ES|QL, and ExecValidity drops to 0.08 (those empty-extraction examples correctly fail Exec instead of falsely passing). Net effect: signal is now honest — `gpt-oss-120b` collapses on this task, and the suite reports that cleanly instead of inflating Validity with junk.
- **FuncEq defensive guard** (commit `dcee5ce`) doesn't move EIS-6 numbers materially because EIS models rarely emit the giant thinking traces that trip the judge; it lands as load-bearing for the OSS side, where Kimi-thinking variants previously crashed the judge mid-run and aborted entire connector evaluations.

#### v2 OSS-6 callout

The same v2 build extends to six LiteLLM OSS connectors (`models:weekly-eis-models` + six `models:llm-gateway/<id>` labels, the alerts-rag lineup minus the two upstream-broken Mistral entries):

| Task model (OSS) | Validity | ExecValidity | FuncEq | ResultEq |
|---|---|---|---|---|
| `DeepSeek-V4-Flash` | 0.87 | 0.81 | 0.11 | 0.45 |
| `Kimi-K2-Thinking`  | 0.90 | 0.69 | 0.15 | 0.29 |
| `Kimi-K2.5`         | 0.84 | 0.65 | 0.19 | 0.29 |
| `Kimi-K2.6`         | 0.94 | 0.48 | 0.06 | 0.29 |
| `Ministral-3B`      | 0.90 | 0.00 | 0.02 | 0.00 |
| `Codestral-2501`    | 0.71 | 0.02 | 0.03 | 0.00 |
| **OSS-6 mean**      | 0.86 | 0.44 | 0.09 | 0.22 |

`DeepSeek-V4-Flash` clears the EIS-6 ExecValidity mean (0.81 vs 0.74), confirming OSS connectors are evaluable end-to-end on this suite. `Ministral-3B` and `Codestral-2501` collapse on ExecValidity (~0%) — they hallucinate schema (`FROM logs.* ALL_USERS` etc.) and the queries don't execute against the fixture indices. Same root cause the SQL guard catches for `gpt-oss-120b`: too small / too specialized for ES|QL generation. The suite catches it; no eval-framework gap.

#### Dominant residual error

`Func Eq` is consistently lower than `Result Eq` across every model — many candidates execute and return the same rows as the gold query, but the LLM judge still marks them `not_equivalent` because of stylistic differences (column alias, projection order). This is the lift target for the next cycle (suite-local rubric refinement or a ResEq-backed FuncEq override); it's explicitly out of scope for this PR.

The dataset, the suite, and the trace pipeline are all instrumented now — every v2 score document has `evaluator.score`, `evaluator.label`, `evaluator.explanation`, and `evaluator.metadata.fallback` so dashboards can isolate this failure mode without re-running the suite.

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

### 2) Run the suite with EIS connectors (recommended — matches CI)

```bash
# Discover EIS chat-completion endpoints and emit the connectors payload
export KIBANA_EIS_CCM_API_KEY="$(vault read -field=key secret/kibana-issues/dev/inference/kibana-eis-ccm)"
node scripts/discover_eis_models.js
export KIBANA_TESTING_AI_CONNECTORS="$(node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_eis_connectors.js)"

# Start the full stack (EDOT + Scout + EIS CCM) and run the suite
EVALUATION_CONNECTOR_ID=eis-google-gemini-3-1-pro \
TRACING_ES_URL="http://elastic:changeme@localhost:9200" \
node scripts/evals start \
  --suite security-esql-generation-regression \
  --judge eis-google-gemini-3-1-pro \
  --model eis-anthropic-claude-4-5-sonnet
```

`evals start` detects the `eis-` prefix and enables EIS CCM on Scout automatically. If Scout is already running with a different `KIBANA_TESTING_AI_CONNECTORS` payload it is detected as stale and restarted with the new one.

### 3) Run with a non-EIS connector (LiteLLM / kibana.dev.yml entries)

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
