# @kbn/evals-suite-security-solution

Evaluation test suites for the Security AI Assistant and Attack Discovery, built on top of [`@kbn/evals`](../../../../../platform/packages/shared/kbn-evals/README.md).

## Overview

This package contains evaluation tests for the Security AI Assistant, covering key features such as alerts, Attack Discovery, ES|QL, and knowledge base.
For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../../../../../platform/packages/shared/kbn-evals/README.md).

## Evaluation Approach

This package uses **LLM-as-a-judge** for evaluating Security AI Assistant responses. Each evaluation scenario defines a set of criteria that an LLM evaluator uses to judge the quality of responses.

### Criteria-Based Evaluation

Evaluation criteria are defined per scenario in the spec files (e.g., `evals/alerts/alerts.spec.ts`). The criteria are based on the evaluation prompts in `evaluators/`:

- **Alerts RAG** (`alerts_rag_regression.md`): Evaluates responses about security alerts for correctness, entity matching, and numerical accuracy
- **ES|QL Generation** (`esql_generation_regression.md`): Evaluates ES|QL query generation for syntax validity and explanation quality
- **Custom Knowledge** (`assistant_eval_custom_knowledge.md`): Evaluates responses using knowledge base content for similarity to expected answers
- **Attack Discovery** (`attack_discovery_eval.md`): Evaluates attack discovery insights for structure, entity identification, and actionability
- **Defend Insights** (`defend_insights_eval.md`): Evaluates defend insights for policy response failures, group matching, and remediation guidance

Example criteria definition:

```typescript
const ALERTS_RAG_CRITERIA = [
  'Is the submission non-empty and not null?',
  'Does the submission capture the essence of the reference?',
  'If the input asks about counts of alerts, do the numerical values in the submission equal the values provided in the reference?',
  'If the input asks about entities, such as host names or user names, do the entity values in submission equal at least 70% of the values provided in the reference?',
];
```

## Run Evaluations

### Start Scout server

```bash
node scripts/scout.js start-server --stateful
```

> The Scout server Kibana instance is accessible at <http://localhost:5620>. This may be useful if you want to query evaluation results for further analysis.

### Run evaluations

```bash
EVALUATION_CONNECTOR_ID=gemini-2-5-pro \
EVALUATION_CONNECTORS=gemini-2-5-pro \
  node scripts/playwright test \
  --config x-pack/solutions/security/packages/kbn-evals-suite-security-solution/playwright.config.ts
```

> **Note:** `EVALUATION_CONNECTORS` is recommended to exclude connectors you don't want to test (e.g., `elastic-llm` which requires a docker container). If not set, tests will run against all discovered connectors.

Optional:
- EVALUATION_REPETITIONS
- USE_QUALITATIVE_EVALUATORS
- SCENARIO_REPORTING


#### Configuration Options

**Environment Variables:**

- **`EVALUATION_CONNECTOR_ID`** (required): Connector ID for the LLM judge/evaluator. This LLM evaluates responses against the defined criteria.
- **`EVALUATION_CONNECTORS`** (optional): Comma-separated list of connector IDs to run tests against (e.g., `gemini-2-5-pro,sonnet-3-5`). If not set, tests run against all discovered connectors. Use this to exclude connectors you don't want to test (e.g., `elastic-llm` which requires a docker container).
- **`EVALUATION_REPETITIONS`**: Number of times to repeatedly evaluate each example (e.g., `3`)
- **`USE_QUALITATIVE_EVALUATORS`**: Enable additional evaluators for Correctness (Factuality, Relevance, Sequence Accuracy) and Groundedness (Hallucination) (defaults to `false`)
- **`SCENARIO_REPORTING`**: Enable scenario-grouped reporting that aggregates datasets by scenario prefix (defaults to `false`)
- **`SELECTED_EVALUATORS`**: Comma-separated list of evaluator names to run (e.g., `Criteria,Factuality`). If not set, all evaluators run.

**Playwright Options:**

- Add test file path to evaluate specific scenarios (e.g. run only alert scenarios by adding `evals/alerts/alerts.spec.ts`)
- Use `--project="my-connector"` to evaluate a specific model/connector

**Example with all options:**

```bash
# Running alerts scenarios with specific connectors
EVALUATION_REPETITIONS=3 \
USE_QUALITATIVE_EVALUATORS=true \
SCENARIO_REPORTING=true \
EVALUATION_CONNECTOR_ID=gemini-2-5-pro \
EVALUATION_CONNECTORS=gemini-2-5-pro,sonnet-3-5 \
  node scripts/playwright test \
  --config x-pack/solutions/security/packages/kbn-evals-suite-security-solution/playwright.config.ts \
  evals/alerts/alerts.spec.ts \
  --project="gemini-2-5-pro"
```

## Adding New Evaluation Scenarios

To add a new evaluation scenario:

1. **Create a dataset** in `datasets/` with examples containing `input` and `output` fields
2. **Define criteria** for LLM-as-a-judge evaluation in your spec file
3. **Create a spec file** in `evals/<scenario>/` that maps dataset examples to the criteria

Example spec file structure:

```typescript
import { evaluate } from '../../src/evaluate';
import { myDataset } from '../../datasets';

const MY_CRITERIA = [
  'Is the submission non-empty and not null?',
  'Does the response accurately address the question?',
  // Add domain-specific criteria here
];

evaluate.describe('My Scenario', { tag: '@svlSecurity' }, () => {
  evaluate('my evaluation', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: myDataset.name,
        description: myDataset.description,
        examples: myDataset.examples.map((example) => ({
          input: { question: example.input.question },
          output: {
            reference: example.output.reference,
            criteria: MY_CRITERIA,
          },
        })),
      },
    });
  });
});
```

### Evaluation Reporting

The evaluation framework supports two reporting modes:

- **Default (verbose)**: Shows detailed per-dataset statistics. Useful for comparing variations within scenarios (e.g., comparing "alerts: critical" vs "alerts: warning").
- **Scenario-grouped** (`SCENARIO_REPORTING=true`): Aggregates datasets into scenario-level statistics. Useful for high-level overview across different scenarios (e.g., alerts, esql, apm).

**Dataset Naming Convention**: For scenario-grouped reporting, datasets must be named `"scenario: dataset-name"` (e.g., "alerts: critical", "esql: simple queries"). Any dataset not matching this pattern will be categorized under "Other". Always use this format when adding new test cases.

#### Retrieving Evaluation Scores from Elasticsearch

Evaluation results are stored in the .kibana-evaluations data stream on the Elasticsearch cluster your Scout configuration points to (defaulting to http://localhost:9220). For on-demand analysis, you can query this data stream using the Kibana instance at http://localhost:5620.

##### Useful Queries

> You must replace the `${run_id}` parameter in these queries with an actual evaluation `run_id` to retrieve data.

**Get evaluator scores per dataset (replicating in-terminal evaluation results):**

```bash
POST /_query?format=txt
{
  "query": """
FROM .kibana-evaluations
| WHERE run_id == "${run_id}"
| EVAL mean_dataset_score = MV_AVG(evaluator.scores)
| STATS
    criteria_score = AVG(mean_dataset_score) WHERE evaluator.name == "Criteria",
    groundedness_score = AVG(mean_dataset_score) WHERE evaluator.name == "Groundedness",
    factuality_score = AVG(mean_dataset_score) WHERE evaluator.name == "Factuality",
    relevance_score = AVG(mean_dataset_score) WHERE evaluator.name == "Relevance",
    sequence_accuracy_score = AVG(mean_dataset_score) WHERE evaluator.name == "Sequence Accuracy"
    BY dataset.name
| SORT dataset.name
| LIMIT 100
    """
}
```

**Get evaluator scores per scenario (replicating in-terminal results when `SCENARIO_REPORTING=true`):**

```bash
POST /_query?format=txt
{
  "query": """
FROM .kibana-evaluations
| WHERE run_id == "${run_id}"
| DISSECT dataset.name "%{scenario}: %{rest}"
| EVAL mean_dataset_score = MV_AVG(evaluator.scores)
| STATS
    criteria_score = AVG(mean_dataset_score) WHERE evaluator.name == "Criteria",
    groundedness_score = AVG(mean_dataset_score) WHERE evaluator.name == "Groundedness",
    factuality_score = AVG(mean_dataset_score) WHERE evaluator.name == "Factuality",
    relevance_score = AVG(mean_dataset_score) WHERE evaluator.name == "Relevance",
    sequence_accuracy_score = AVG(mean_dataset_score) WHERE evaluator.name == "Sequence Accuracy"
    BY scenario
| SORT scenario
| LIMIT 100
    """
}
```

**View performance ratings for each scenario in the evaluation run based on performance matrix heuristics:**

```bash
POST /_query?format=txt
{
  "query": """
FROM .kibana-evaluations
| WHERE run_id == "${run_id}"
| DISSECT dataset.name "%{scenario}: %{rest}"
| EVAL mean_dataset_score = MV_AVG(evaluator.scores)
| STATS
    criteria_score = AVG(mean_dataset_score) WHERE evaluator.name == "Criteria"
    BY scenario
| EVAL rating = CASE(
    criteria_score >= 0 and criteria_score < 0.45, "Poor",
    criteria_score < 0.75, "Good",
    criteria_score < 0.84, "Great",
    criteria_score <= 1, "Excellent",
    "Invalid"
)
| SORT scenario
| LIMIT 100
    """
}
```