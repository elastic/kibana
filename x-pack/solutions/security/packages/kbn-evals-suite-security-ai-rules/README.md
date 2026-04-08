# Security AI Rule Generation Evaluation Suite

Playwright-based evaluation suite for testing the AI rule creation feature in Elastic Security Solution using `@kbn/evals`.

## Overview

This package evaluates the quality of AI-generated detection rules against known examples from the [elastic/detection-rules](https://github.com/elastic/detection-rules) repository. It measures:

- ES|QL query syntax validity and structural correctness
- Required field coverage (name, description, query, severity, tags, riskScore)
- MITRE ATT&CK mapping accuracy (precision, recall, F1)
- ES|QL functional equivalence (LLM-as-judge)
- Rule type and language correctness
- Severity and risk score accuracy
- Schedule validity (interval format, lookback gap)
- Rejection of impossible detection requests (negative cases)

## API Flow

The eval suite calls the sync Agent Builder API (`POST /api/agent_builder/converse`) and extracts tool results from the `security.create_detection_rule` tool call steps, matching the pattern used by the agent-builder eval suite.

## Package Structure

```
kbn-evals-suite-security-ai-rules/
├── playwright.config.ts          # Playwright evals configuration
├── evals/
│   └── rule_generation.spec.ts   # Evaluation scenarios (baseline + edge + negative cases)
├── datasets/
│   ├── sample_rules.ts           # 8 canonical reference detection rules with ES|QL translations
│   ├── standard_pairs.ts         # 18 standard prompt/rule pairs (Windows, Linux, Cloud, etc.)
│   ├── complex_pairs.ts          # 5 complex multi-domain pairs (containers, supply-chain)
│   ├── hard_cases.ts             # Edge-case prompts for robustness testing
│   └── negative_pairs.ts         # 5 prompts that should NOT produce a valid rule
└── src/
    ├── chat_client.ts            # Agent Builder API client (sync converse)
    ├── evaluate.ts               # Suite-specific eval fixture extensions
    ├── evaluate_dataset.ts       # Experiment runner + all evaluator definitions
    ├── helpers.ts                # Utility functions (MITRE extraction, syntax check, etc.)
    └── helpers.test.ts           # Unit tests for helpers
```

## Prerequisites

1. **Elasticsearch running locally**:
   ```bash
   yarn es snapshot
   ```

2. **Kibana with AI rule creation enabled**:
   - Ensure `kibana.dev.yml` has AI connectors configured
   - Feature flag `aiRuleCreationEnabled: true` is set

3. **AI Connectors**: Configure one or more AI connectors in `config/kibana.dev.yml` or via the Kibana UI. The suite runs against all connectors discovered at runtime (including EIS models when available).

4. **GenAI Settings**: Navigate to **Stack Management > AI > GenAI Settings** (`app/management/ai/genAiSettings`) and select **AI agent (Beta)** in Chat Experience. This enables the Agent Builder API that the eval suite calls.

5. **Index patterns**: The dataset prompts reference specific index patterns (e.g., `logs-endpoint.events.*`, `logs-aws.cloudtrail*`). If these indices do not exist in your Elasticsearch instance, the affected examples will be skipped (all evaluators return N/A). Check the task logs for "Could not discover a suitable index" warnings.

## Running Evaluations

Run the suite with `node scripts/evals run`. Results are persisted to an Elasticsearch cluster and a summary table is printed at the end.

```bash
EVALUATIONS_ES_URL=<ES_URL> \
EVALUATIONS_ES_API_KEY=<API_KEY> \
EVALUATION_CONNECTOR_ID=gpt-4o \
  node scripts/evals run --suite security-ai-rules
```

Replace `<ES_URL>` and `<API_KEY>` with the Elasticsearch endpoint and API key for the cluster where evaluation scores should be stored (this can be a remote/cloud cluster, not necessarily the local one Kibana is connected to).

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EVALUATIONS_ES_URL` | Elasticsearch URL for storing results | `http://elastic:changeme@localhost:9220` |
| `EVALUATIONS_ES_API_KEY` | API key for the results Elasticsearch cluster (used instead of basic auth) | (none) |
| `EVALUATION_CONNECTOR_ID` | Connector ID for the task model | required |
| `EVALUATION_REPETITIONS` | Number of times to run each example | `1` |
| `SELECTED_EVALUATORS` | Comma-separated evaluator names to run | (all) |

### Example: Local Elasticsearch (no API key)

When storing results in a local dev cluster with basic auth, set the URL with embedded credentials:

```bash
EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200 \
EVALUATION_CONNECTOR_ID=gpt-4o \
  node scripts/evals run --suite security-ai-rules
```

### Example: Run specific evaluators only

```bash
EVALUATIONS_ES_URL=<ES_URL> \
EVALUATIONS_ES_API_KEY=<API_KEY> \
EVALUATION_CONNECTOR_ID=gpt-4o \
SELECTED_EVALUATORS="Query Syntax Validity,Field Coverage,MITRE Accuracy" \
  node scripts/evals run --suite security-ai-rules
```

## Evaluation Metrics

The suite runs 12 evaluators (10 deterministic CODE evaluators, 1 LLM-as-judge evaluator, and 1 rejection evaluator). In the summary table, these are grouped into columns for readability.

### Structural Validity (CODE — grouped column)

Six binary evaluators that check whether the generated rule is well-formed:

- **Query Syntax Validity**: Validates ES|QL syntax using the `@elastic/esql` parser. Also rejects bare `FROM *` queries, which are disallowed in alerting rules. Score: 1 (valid) or 0 (invalid).
- **Rule Type & Language**: Checks `type === 'esql'` and `language === 'esql'`. Score: 1 (correct) or 0 (wrong).
- **Severity Validity**: Severity must be one of `low`, `medium`, `high`, `critical`. Score: 1 or 0.
- **Risk Score Validity**: Risk score must be a number in the 0–100 range. Score: 1 or 0.
- **Interval Format**: Schedule interval must be a valid duration string (e.g., `5m`, `30s`, `1h`). Score: 1 or 0.
- **Lookback Gap**: The `from` field must be >= the `interval` to avoid lookback gaps. Score: 1 (no gap) or 0 (gap present).

### Field Coverage (CODE — 0–1 scale)

Measures the fraction of required rule fields present: `name`, `description`, `query`, `severity`, `tags`, `riskScore`. A score of 0.83 means 5 of 6 fields are present.

### Reference Match (CODE — grouped column)

Three evaluators that compare the generated rule against the expected reference:

- **MITRE Accuracy** (F1 score, 0–1): Compares MITRE ATT&CK technique IDs (including subtechnique IDs) between the generated and reference rules using precision, recall, and F1. Metadata includes per-technique breakdown.
- **Severity Match** (binary): 1 if the generated severity exactly matches the reference, 0 otherwise.
- **Risk Score Match** (0, 0.5, or 1): Exact match = 1.0, within 10 points = 0.5, else 0.

### ES|QL Functional Equivalence (LLM-as-judge — binary: 0 or 1)

Uses the built-in `createEsqlEquivalenceEvaluator` from `@kbn/evals` to assess whether the generated ES|QL query would produce the same detection results as the reference query, regardless of syntax differences. For non-ES|QL reference rules that have an `esqlQuery` translation, the evaluator compares against the translation. Returns N/A when no ES|QL ground truth is available.

### Rejection (CODE — binary: 0 or 1)

Scores whether the model correctly refused to generate a rule for a negative case (a prompt where the available data source cannot support the requested detection). Returns N/A for positive cases. Score: 1 (correctly refused) or 0 (incorrectly generated a rule).

### Rule Name / Rule Description (LLM-as-judge — disabled by default)

These two evaluators use `criteria` to check semantic equivalence for the rule name and description fields. They are intentionally disabled in the default evaluator list because they add significant latency per example. Re-enable them in `src/evaluate_dataset.ts` when running thorough multi-model comparisons:

```typescript
// In createEvaluateDataset, uncomment:
createRuleNameEvaluator(evaluators),
createRuleDescriptionEvaluator(evaluators),
```

### Skip Wrappers

All evaluators except Rejection are wrapped with `skipNegativeCases` (returns N/A for negative test examples). All evaluators are wrapped with `skipMissingIndexFailures` (returns N/A when the rule creation tool failed due to missing index patterns). The ES|QL equivalence evaluator additionally uses `skipNonEsqlReferences` to avoid meaningless comparisons when no ES|QL ground truth exists.

## Viewing Results

Results are automatically exported to Elasticsearch in the `.kibana-evaluations` datastream.

### Query Results in Kibana

Navigate to **Kibana > Dev Tools** and paste the queries below. Replace `<run-id>` with the run ID printed in the eval logs (e.g. `a3f2c1b0d4e56789`).

#### All scores for a specific run

```
GET .kibana-evaluations/_search
{
  "query": {
    "term": { "run_id": "<run-id>" }
  },
  "sort": [{ "evaluator.name": "asc" }],
  "size": 200
}
```

#### Per-evaluator mean scores for a run (aggregation)

```
GET .kibana-evaluations/_search
{
  "size": 0,
  "query": {
    "term": { "run_id": "<run-id>" }
  },
  "aggs": {
    "by_evaluator": {
      "terms": { "field": "evaluator.name" },
      "aggs": {
        "mean_score": { "avg": { "field": "evaluator.score" } }
      }
    }
  }
}
```

#### Compare two runs side-by-side

```
GET .kibana-evaluations/_search
{
  "size": 0,
  "query": {
    "terms": { "run_id": ["<run-id-1>", "<run-id-2>"] }
  },
  "aggs": {
    "by_run": {
      "terms": { "field": "run_id" },
      "aggs": {
        "by_evaluator": {
          "terms": { "field": "evaluator.name" },
          "aggs": {
            "mean_score": { "avg": { "field": "evaluator.score" } }
          }
        }
      }
    }
  }
}
```

#### Filter by model and suite (without a run ID)

```
GET .kibana-evaluations/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "task.model.id": "gpt-4o" } },
        { "match": { "example.dataset.name": "security-ai-rules" } }
      ]
    }
  },
  "sort": [{ "@timestamp": "desc" }],
  "size": 100
}
```

### Example Document

```json
{
  "@timestamp": "2026-02-12T20:30:00.000Z",
  "run_id": "abc123def456",
  "task": {
    "model": {
      "id": "gpt-4o",
      "family": "openai",
      "provider": "azure"
    }
  },
  "example": {
    "dataset": {
      "name": "security-ai-rules: rule-generation-basic"
    }
  },
  "evaluator": {
    "name": "Query Syntax Validity",
    "score": 1,
    "label": null,
    "explanation": null
  }
}
```

## Troubleshooting

### Error: "No connector found"

**Problem**: The specified connector ID is not configured.

**Solution**:
1. Check available connectors in `config/kibana.dev.yml`
2. Verify the connector ID matches exactly (case-sensitive)
3. Ensure Kibana has loaded the connector configuration

### Error: "API endpoint not found"

**Problem**: The AI rule creation APIs are not available.

**Solution**:
1. Verify feature flag is enabled in `kibana.dev.yml`:
   ```yaml
   xpack.securitySolution.enableExperimental:
     - aiRuleCreationEnabled
   ```
2. Restart Kibana after configuration changes
3. Confirm Agent Builder route is reachable (`/api/agent_builder/converse`)

### "Could not discover a suitable index"

**Problem**: The rule creation tool cannot find matching data for the index pattern in the prompt.

This means the required index (e.g., `logs-azure.auditlogs*`) does not exist in the Elasticsearch instance. All evaluators for the affected example will return N/A.

**Solution**:
1. Check the task logs for a summary line: `[Summary] ... X/Y examples scored (Z skipped due to missing indices)`
2. Ingest sample data for the missing index patterns, or use a cluster that has the required data
3. If many examples are skipped, the reported metrics may not be representative

### Low Scores on All Evaluators

**Problem**: All evaluations scoring near 0.

**Possible causes**:
1. **API returning errors**: Check Kibana logs for errors
2. **Wrong connector**: LLM model may not support the task well
3. **No rule returned**: The agent may not have invoked `security.create_detection_rule`

**Solution**:
1. Check Kibana server logs for errors
2. Try a different connector (e.g., Claude Sonnet)
3. Review the `chat_client.ts` diagnostics logged at `warning` level

### Results Not Appearing in Elasticsearch

**Problem**: No results in `.kibana-evaluations` datastream.

**Solution**:
1. Verify `EVALUATIONS_ES_URL` is set correctly
2. Check Elasticsearch is running and accessible
3. Review eval logs for export errors
4. Ensure the Elasticsearch cluster has sufficient permissions

## Dataset

The evaluation suite runs three datasets:

1. **rule-generation-basic** (31 examples): 8 sample rules + 18 standard pairs + 5 complex pairs from [elastic/detection-rules](https://github.com/elastic/detection-rules). Covers Windows, Linux, macOS, AWS, Azure, GCP, O365, Okta, Google Workspace, containers, and supply-chain scenarios. Note: 1 complex pair (`suspicious-genai-descendant-activity`) has incomplete ground truth (empty query, no esqlQuery) pending publication in the detection-rules repo; the ES|QL Functional Equivalence evaluator returns N/A for that entry.
2. **edge-cases** (variable): Hard/edge-case prompts for robustness testing. Skipped when no usable cases exist.
3. **negative-cases** (5 examples): Prompts that should NOT produce a valid rule given the stated available data. Tests the model's ability to refuse impossible detection requests.

Domains covered include:
- **Collection**: File encryption with WinRAR/7z
- **Credential Access**: LSASS access, Mimikatz usage
- **Defense Evasion**: Windows Defender tampering, event log clearing, UAC bypass
- **Command & Control**: Remote file copy, network connections
- **Privilege Escalation**: UAC bypass, IAM role grants
- **Cloud Security**: AWS S3 policy changes, Azure AD, GCP IAM, O365 audit
- **Execution**: Container creation, npm scripts, GitHub Actions runner tampering

### Adding More Rules

To expand the dataset, add entries to the appropriate file in `datasets/`:

```typescript
export const sampleRules: ReferenceRule[] = [
  // ... existing rules
  {
    id: 'your-rule-id',
    name: 'Your New Rule',
    prompt: 'Describe the detection...\n\nAvailable data: logs-endpoint.events.*',
    description: 'Detects XYZ behavior',
    query: 'process where ...',  // reference query (EQL or ES|QL)
    threat: [{ technique: 'T1234', tactic: 'TA0001' }],
    severity: 'high',
    tags: ['Domain: Endpoint', 'OS: Windows'],
    riskScore: 73,
    from: 'now-9m',
    category: 'execution',
    esqlQuery: 'FROM logs-endpoint.events.* ...',  // optional: ES|QL translation for non-ES|QL rules
  },
];
```

## Development

### Running Unit Tests

```bash
yarn test:jest x-pack/solutions/security/packages/kbn-evals-suite-security-ai-rules/src/helpers.test.ts
```

### Type Checking

```bash
node scripts/type_check --project x-pack/solutions/security/packages/kbn-evals-suite-security-ai-rules/tsconfig.json
```

### Linting

```bash
node scripts/eslint x-pack/solutions/security/packages/kbn-evals-suite-security-ai-rules
```

## Contributing

When adding new evaluators or modifying existing ones:

1. Add evaluator factory functions in `src/evaluate_dataset.ts` following the existing `createQuerySyntaxValidityEvaluator` pattern
2. Wrap with `skipNegativeCases` and `skipMissingIndexFailures` as appropriate
3. Add unit tests for any new helper functions in `src/helpers.test.ts`
4. Test with multiple connectors (GPT-4o, Claude, Gemini)
5. Update this README with new metrics and interpretations
6. Consider statistical significance (run with `EVALUATION_REPETITIONS=3` or more)

## References

- [Elastic Detection Rules Repository](https://github.com/elastic/detection-rules)
- [@kbn/evals Documentation](../../../../../platform/packages/shared/kbn-evals/README.md)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [ES|QL Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html)
