# Security AI Rule Generation Evaluation Suite

Playwright-based evaluation suite for testing the AI rule creation feature in Elastic Security Solution using `@kbn/evals`.

## Overview

This package evaluates the quality of AI-generated detection rules against known examples from the [elastic/detection-rules](https://github.com/elastic/detection-rules) repository. It measures:

- ES|QL query syntax validity
- Required field coverage
- MITRE ATT&CK mapping accuracy (F1 score)
- ES|QL functional equivalence (LLM-as-judge)
- Rule type and language correctness

## API Flow

The eval suite calls the sync Agent Builder API (`POST /api/agent_builder/converse`) and extracts tool results from the `security.create_detection_rule` tool call steps, matching the pattern used by the agent-builder eval suite.

## Package Structure

```
kbn-evals-suite-security-ai-rules/
├── playwright.config.ts          # Playwright evals configuration
├── evals/
│   └── rule_generation.spec.ts   # Evaluation scenarios (baseline + edge cases)
├── datasets/
│   └── sample_rules.ts           # Canonical reference detection rules
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

## Running Evaluations

### Method 1: Run suite and print comparison table (Recommended)

The `summary` command runs the suite and prints a colour-coded model comparison table at the end. It also persists all scores to Elasticsearch so the same run can be re-summarized later.

```bash
node scripts/evals summary --suite security-ai-rules \
  --evaluation-connector-id gpt-4o
```

#### Optional flags

| Flag | Description | Default |
|------|-------------|---------|
| `--evaluation-connector-id` | Connector used as the LLM judge | required |
| `--repetitions <n>` | Number of times to repeat each example | `1` |
| `--executor <kibana\|phoenix>` | Executor backend | `kibana` |
| `--evaluations-es-url <url>` | Elasticsearch URL for storing results | `http://elastic:changeme@localhost:9220` |
| `--project <name>` | Playwright project to run | (all projects) |
| `--dry-run` | Print the command that would run without executing it | `false` |

### Method 2: summarize a previous run (no re-run)

If you already have a run ID from a previous execution, pass it as a positional argument to skip re-running and just print the table:

```bash
node scripts/evals summary <run-id>
```

### Method 3: Run suite without summary table

```bash
EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200 \
EVALUATION_CONNECTOR_ID=gpt-4o \
node scripts/evals run --suite security-ai-rules
```

### Example: Multi-model comparison

By default, the suite runs against all connectors configured in `kibana.dev.yml`. Simply configure the models you want to compare and run a single command:

```bash
EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200 \
EVALUATION_CONNECTOR_ID=gpt-4o \
node scripts/evals summary --suite security-ai-rules \
  --evaluation-connector-id gpt-4o
```

### Example: Single repetition for fast testing

```bash
node scripts/evals summary --suite security-ai-rules \
  --evaluation-connector-id gpt-4o \
  --repetitions 1
```

## Evaluation Metrics

### 1. Query Syntax Validity (CODE — binary: 0 or 1)

Validates that the generated ES|QL query is structurally sound using the official `@kbn/esql-language` parser. Also checks that the `FROM` clause is not a bare wildcard (`FROM *`).

**Interpretation**:
- `1.0` = Valid ES|QL syntax
- `0.0` = Invalid syntax (see `metadata.error` for details)

### 2. Field Coverage (CODE — 0–1 scale)

Measures the percentage of required rule fields that are present in the generated rule. Required fields: `name`, `description`, `query`, `severity`, `tags`, `riskScore`.

**Interpretation**:
- `1.0` = All required fields present
- `0.6` = 60% of required fields present
- `0.0` = No required fields present

### 3. Rule Type & Language (CODE — binary: 0 or 1)

Checks that the generated rule declares `type: "esql"` and `language: "esql"`. The AI rule creation agent is expected to always produce ES|QL rules.

**Interpretation**:
- `1.0` = Both `type` and `language` are `"esql"`
- `0.0` = Either field is missing or has a different value

### 4. MITRE Accuracy (CODE — F1 score: 0–1)

Compares MITRE ATT&CK technique IDs between the generated rule and the reference rule using precision, recall, and F1 score.

**Interpretation**:
- `1.0` = Perfect technique match
- `0.67` = Two of three techniques match
- `0.0` = No technique overlap

Metadata includes `precision`, `recall`, `f1`, `generated` (array), and `expected` (array).

### 5. ESQL Functional Equivalence (LLM-as-judge — binary: 0 or 1)

Uses the built-in `createEsqlEquivalenceEvaluator` from `@kbn/evals` to assess whether the generated ES|QL query would produce the same detection results as the reference query, regardless of query language (reference rules may be in EQL while generated rules are always ES|QL), syntax differences, or field ordering.

**Interpretation**:
- `1.0` = Functionally equivalent — same threat patterns detected
- `0.0` = Different detection logic

### 6. Rule Name / Rule Description (LLM-as-judge — disabled by default)

These two evaluators use `criteria` to check semantic equivalence for the rule name and description fields. They are intentionally disabled in the default evaluator list because they add significant latency per example. Re-enable them in `src/evaluate_dataset.ts` when running thorough multi-model comparisons:

```typescript
// In createEvaluateDataset, uncomment:
createRuleNameEvaluator(evaluators),
createRuleDescriptionEvaluator(evaluators),
```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EVALUATIONS_ES_URL` | Elasticsearch URL for storing results | `http://elastic:changeme@localhost:9220` |
| `EVALUATION_CONNECTOR_ID` | Connector ID for the task model | required |
| `EVALUATION_REPETITIONS` | Number of times to run each example | `1` |
| `SELECTED_EVALUATORS` | Comma-separated evaluator names to run | (all) |

### Example: Run specific evaluators only

```bash
SELECTED_EVALUATORS="Query Syntax Validity,Field Coverage,MITRE Accuracy" \
  node scripts/evals summary --suite security-ai-rules --evaluation-connector-id gpt-4o
```

## Viewing Results

Results are automatically exported to Elasticsearch in the `.kibana-evaluations` datastream.

### Query Results in Kibana

Navigate to **Kibana > Dev Tools** and paste the queries below. Replace `<run-id>` with the run ID printed by the `summary` command (e.g. `a3f2c1b0d4e56789`).

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

The evaluation dataset includes 31 examples (8 sample rules + 18 standard pairs + 5 complex pairs) covering:

1. **Collection**: File encryption with WinRAR/7z
2. **Credential Access**: LSASS access, Mimikatz usage
3. **Defense Evasion**: Windows Defender tampering, event log clearing
4. **Command & Control**: Remote file copy, network connections

### Adding More Rules

To expand the dataset, add entries to `datasets/sample_rules.ts`:

```typescript
export const sampleRules: ReferenceRule[] = [
  // ... existing rules
  {
    name: 'Your New Rule',
    description: 'Detects XYZ behavior',
    query: 'process where ...',  // reference query (EQL or ES|QL)
    threat: [{ technique: 'T1234', tactic: 'TA0001' }],
    severity: 'high',
    tags: ['Domain: Endpoint', 'OS: Windows'],
    riskScore: 73,
    from: 'now-9m',
    category: 'execution',
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
2. Add unit tests for any new helper functions in `src/helpers.test.ts`
3. Test with multiple connectors (GPT-4o, Claude, Gemini)
4. Update this README with new metrics and interpretations
5. Consider statistical significance (run with `--repetitions 3` or more)

## References

- [Elastic Detection Rules Repository](https://github.com/elastic/detection-rules)
- [@kbn/evals Documentation](../../../../../platform/packages/shared/kbn-evals/README.md)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [ES|QL Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html)
