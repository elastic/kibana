# Security AI Rule Creation Evaluations

This package evaluates AI-generated ESQL detection rules against reference rules from the [elastic/detection-rules](https://github.com/elastic/detection-rules) repository.

## Overview

The evaluation suite tests the Security Solution's AI rule creation feature by:
1. Providing natural language prompts for rule creation
2. Comparing generated ESQL rules against expected rules
3. Scoring rule quality using CODE and LLM evaluators

## Prerequisites

### 1. Kibana Configuration

Add to your `kibana.dev.yml`:

```yaml
# Enable AI rule creation feature
xpack.securitySolution.aiRuleCreationEnabled: true

# Configure AI connectors
xpack.actions.preconfigured:
  gpt-4o:
    actionTypeId: .gen-ai
    name: OpenAI GPT-4o
    config:
      apiUrl: https://api.openai.com/v1/chat/completions
      defaultModel: gpt-4o
    secrets:
      apiKey: <your-openai-key>
```

### 2. Scout Server

Start a Scout server pointing to your Kibana instance:

```bash
# For local development
node scripts/scout.js start-server --arch stateful --domain classic
```

Or configure `.scout/servers/local.json` to point to your running Kibana.

### 3. Elasticsearch for Results

Set up an Elasticsearch instance to store evaluation results:

```bash
# Use local ES
EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200
```

### 4. Bootstrap the Package

```bash
yarn kbn bootstrap
```

## Running Evaluations

### Run via evals CLI (Recommended)

```bash
EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200 \
  EVALUATION_CONNECTOR_ID=gpt-4o \
  node scripts/evals run --suite security-ai-rules
```

### Run via Playwright directly

```bash
EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200 \
  EVALUATION_CONNECTOR_ID=gpt-4o \
  node scripts/playwright test \
  --config x-pack/solutions/security/packages/kbn-evals-suite-security-ai-rules/test/scout/ui/playwright.config.ts
```

### Run with specific connector

```bash
node scripts/evals run \
  --suite security-ai-rules \
  --evaluation-connector-id gpt-4o
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EVALUATIONS_ES_URL` | Elasticsearch URL for storing results | Required |
| `EVALUATION_CONNECTOR_ID` | AI connector ID for LLM evaluator | `gpt-4o` |
| `SELECTED_EVALUATORS` | Comma-separated list of evaluator names | All |
| `REPETITIONS` | Number of times to repeat each evaluation | 1 |

## Evaluators

The suite includes 3 evaluators:

### 1. RuleFieldMatch (CODE)
- Validates rule type and language (esql)
- Checks severity match
- Compares tags overlap using Jaccard similarity
- Scores: 0-1 (percentage of matched fields)

### 2. QuerySimilarity (CODE)
- Normalizes ESQL queries (removes comments, whitespace)
- Checks if expected query pattern is contained in generated query
- Scores: 0 (no match) or 1 (match)

### 3. LLMRuleQuality (LLM)
- Uses LLM-as-judge via `evaluators.criteria()` API
- Evaluates 5 criteria:
  - Rule has type=esql and language=esql
  - Query logically matches expected detection pattern
  - Name and description convey same detection intent
  - Severity and risk score are appropriate
  - MITRE ATT&CK mappings are correct
- Scores: 0-1 (returned as 0-100% in metadata)

## Dataset

The evaluation dataset includes 5 ESQL detection rules covering:
- Azure activity log anomalies
- Suspicious PowerShell execution
- Rare process relationships
- Scheduled task creation
- Office macro threats

Each example includes:
- `input.prompt`: Natural language description of the rule
- `output.expectedRule`: Reference ESQL rule from elastic/detection-rules
- `metadata`: Source information and rule ID

## Results

Results are stored in Elasticsearch and can be viewed via Phoenix UI or queried directly:

```bash
# View all runs
GET /evaluations/_search
{
  "query": {
    "term": { "suite": "security-ai-rules" }
  }
}
```

## Troubleshooting

### "Suite not found"
Ensure you've run `yarn kbn bootstrap` after creating the package.

### "No rule returned from API"
Check that:
- `aiRuleCreationEnabled: true` in kibana.dev.yml
- AI connector is properly configured
- Kibana is running and accessible

### LLM evaluator fails
Check that `EVALUATION_CONNECTOR_ID` points to a valid connector in your kibana.dev.yml.

## Development

### Adding New Examples

Edit `evals/esql_rules.spec.ts` and add new entries to the `esqlRulesDataset` array.

### Modifying Evaluators

Edit `src/evaluate_dataset.ts` to update evaluator logic or criteria.

## References

- [@kbn/evals documentation](../../../../../../x-pack/platform/packages/shared/kbn-evals/README.md)
- [elastic/detection-rules repo](https://github.com/elastic/detection-rules)
- [AI Rule Creation PR #247674](https://github.com/elastic/kibana/pull/247674)
