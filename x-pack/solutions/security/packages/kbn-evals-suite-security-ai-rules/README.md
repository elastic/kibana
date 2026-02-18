# Security AI Rule Generation Evaluation Suite

Playwright-based evaluation suite for testing the AI rule creation feature in Elastic Security Solution using `@kbn/evals`.

## Overview

This package evaluates the quality of AI-generated detection rules against known examples from the [elastic/detection-rules](https://github.com/elastic/detection-rules) repository. It measures:

- Query syntax validity
- Field coverage (required fields present)
- MITRE ATT&CK mapping accuracy
- Query semantic similarity (LLM-as-judge)
- Semantic correctness of threat detection (LLM-as-judge)

## API Flow Parity

The eval suite intentionally follows the same rule-generation API flow as the Security Solution UI:

- Prompt submission uses `POST /api/agent_builder/converse/async`
- Rule extraction reads `tool_result` events for `security.create_detection_rule`
- If async parsing fails, the suite falls back to `POST /api/agent_builder/converse` for resilience

## Package Structure

```
kbn-evals-suite-security-ai-rules/
├── playwright.config.ts          # Playwright evals configuration
├── evals/
│   └── rule_generation.spec.ts   # Evaluation tests
├── datasets/
│   └── sample_rules.ts           # Reference detection rules
└── src/
    ├── evaluators.ts             # Custom evaluators
    ├── helpers.ts                # Utility functions
    └── helpers.test.ts           # Unit tests
```

## Prerequisites

1. **Elasticsearch running locally**:
   ```bash
   # Start Elasticsearch
   yarn es snapshot
   ```

2. **Kibana with AI rule creation enabled**:
   - Ensure `kibana.dev.yml` has AI connectors configured
   - Feature flag `aiRuleCreationEnabled: true` is set

3. **AI Connectors** (configured in `config/kibana.dev.yml`):
   - `gpt-4o` - Azure OpenAI GPT-4o
   - `sonnet-3_7` - AWS Bedrock Claude Sonnet 3.7
   - `gemini-2_5-pro` - Google Gemini 2.5 Pro

## Running Evaluations

### Method 1: Via Evals CLI (Recommended)

```bash
# Set environment variables
export EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200
export EVALUATION_CONNECTOR_ID=gpt-4o

# Run the evaluation suite
node scripts/evals run --suite security-ai-rules --evaluation-connector-id gpt-4o
```

### Method 2: Direct Playwright

```bash
# Set environment variables
export EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200
export EVALUATION_CONNECTOR_ID=gpt-4o

# Run with Playwright
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-security-ai-rules/playwright.config.ts
```

### Method 3: Test Specific Connector

```bash
# Test with Claude Sonnet
node scripts/evals run --suite security-ai-rules --evaluation-connector-id sonnet-3_7

# Test with Gemini
node scripts/evals run --suite security-ai-rules --evaluation-connector-id gemini-2_5-pro
```

## Evaluation Metrics

### 1. Query Syntax Validity (Binary: 0 or 1)
- Validates generated ESQL/EQL query syntax
- Checks for balanced parentheses and quotes
- Ensures query starts with valid type (process, network, file, etc.)
- Verifies presence of WHERE clause

**Interpretation**:
- `1.0` = Valid syntax
- `0.0` = Invalid syntax (see metadata for error details)

### 2. Field Coverage (0-1 scale)
- Measures percentage of required fields present
- Required fields: name, description, query, severity, tags

**Interpretation**:
- `1.0` = All required fields present
- `0.6` = 60% of required fields present
- `0.0` = No required fields present

### 3. MITRE Accuracy (F1 Score: 0-1)
- Compares MITRE ATT&CK techniques between generated and reference rules
- Calculates precision, recall, and F1 score

**Interpretation**:
- `1.0` = Perfect match of MITRE techniques
- `0.67` = 2/3 of techniques match (reasonable coverage)
- `0.0` = No technique overlap

### 4. Query Similarity (LLM-as-judge: 0-100%)
- Uses LLM to compare generated ESQL query with expected dataset query
- Assesses semantic equivalence between queries
- Returns score as percentage (0-100%)
- Considers functional equivalence even with different syntax

**Interpretation**:
- `100%` = Functionally equivalent
- `70-90%` = Very similar, minor differences
- `40-60%` = Partially similar
- `0%` = Completely different

**Output**: Percentage score is logged in Playwright logs and stored in metadata as `percentageScore`

### 5. Semantic Correctness (LLM-as-judge: 0-100%)
- Evaluates if rule logic aligns with threat description
- Checks if rule would detect the described threat
- Returns score as percentage (0-100%)

**Interpretation**:
- `100%` = Perfect alignment with threat description
- `70-90%` = Good match, minor gaps
- `40-60%` = Partial match
- `0%` = Does not detect the described threat

**Output**: Percentage score is logged in Playwright logs and stored in metadata as `percentageScore`

## Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EVALUATIONS_ES_URL` | Elasticsearch URL for storing results | (uses test cluster) | No |
| `EVALUATION_CONNECTOR_ID` | Connector ID for LLM-as-judge | - | Yes |
| `EVALUATION_REPETITIONS` | Number of times to run each example | `3` | No |
| `SELECTED_EVALUATORS` | Comma-separated list of evaluators to run | (all) | No |

### Example: Run Specific Evaluators

```bash
SELECTED_EVALUATORS="Query Syntax Validity,Field Coverage,MITRE Accuracy" \
  node scripts/evals run --suite security-ai-rules --evaluation-connector-id gpt-4o
```

### Example: Single Repetition for Fast Testing

```bash
EVALUATION_REPETITIONS=1 \
  node scripts/evals run --suite security-ai-rules --evaluation-connector-id gpt-4o
```

## Viewing Results

Results are automatically exported to Elasticsearch in the `.kibana-evaluations` datastream.

### Query Results in Kibana

1. Navigate to Kibana Dev Tools
2. Use the query filter from the logs:

```
GET .kibana-evaluations/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "model.id": "gpt-4o" } },
        { "match": { "dataset.name": "security-ai-rules" } }
      ]
    }
  },
  "sort": [{ "@timestamp": "desc" }]
}
```

### Example Output

```json
{
  "@timestamp": "2026-02-12T20:30:00.000Z",
  "run_id": "abc123def456",
  "model": {
    "id": "gpt-4o",
    "family": "openai",
    "provider": "azure"
  },
  "dataset": {
    "name": "security-ai-rules: rule-generation-basic",
    "examples_count": 8
  },
  "evaluator": {
    "name": "Query Syntax Validity",
    "stats": {
      "mean": 0.875,
      "percentage": 87.5,
      "count": 8
    }
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
3. Confirm Agent Builder routes are reachable (`/api/agent_builder/converse/async` and `/api/agent_builder/converse`)

### Low Scores on All Evaluators

**Problem**: All evaluations scoring near 0.

**Possible causes**:
1. **API returning errors**: Check Kibana logs for errors
2. **Wrong connector**: LLM model may not support the task well
3. **Prompt issues**: Check evaluator prompts in `src/evaluators.ts`

**Solution**:
1. Check Kibana server logs for errors
2. Try a different connector (e.g., Claude Sonnet)
3. Review evaluator implementation and adjust prompts

### Results Not Appearing in Elasticsearch

**Problem**: No results in `.kibana-evaluations` datastream.

**Solution**:
1. Verify `EVALUATIONS_ES_URL` is set correctly
2. Check Elasticsearch is running and accessible
3. Review eval logs for export errors
4. Ensure Elasticsearch cluster has sufficient permissions

## Dataset

The evaluation dataset includes 8 Windows detection rules covering:

1. **Collection**: File encryption with WinRAR/7z
2. **Credential Access**: LSASS access, Mimikatz usage
3. **Defense Evasion**: Windows Defender tampering, event log clearing
4. **Command & Control**: Remote file copy, network connections

### Adding More Rules

To expand the dataset, edit `datasets/sample_rules.ts`:

```typescript
export const sampleRules: ReferenceRule[] = [
  // ... existing rules
  {
    name: 'Your New Rule',
    description: 'Detects XYZ behavior',
    query: 'process where ...',
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

1. Follow the pattern in `src/evaluators.ts`
2. Add unit tests for helper functions
3. Test with multiple connectors (GPT-4o, Claude, Gemini)
4. Update this README with new metrics and interpretations
5. Consider statistical significance (run with repetitions=3+)

## References

- [Elastic Detection Rules Repository](https://github.com/elastic/detection-rules)
- [@kbn/evals Documentation](../../../../../platform/packages/shared/kbn-evals/README.md)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [ES|QL Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html)
