# @kbn/evals-suite-siem-entity-analytics

Evaluation test suites for the SIEM Entity Analytics agent, built on top of [`@kbn/evals`](../../../../platform/packages/shared/kbn-evals/README.md).

## Overview

This package contains evaluation tests specifically for the SIEM Entity Analytics agent (`siem-entity-analytics`), which provides security analysis capabilities through the Agent Builder API.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../../../../platform/packages/shared/kbn-evals/README.md).

## Prerequisites

### Configure Phoenix Exporter

Configure Phoenix exporter in `kibana.dev.yml`:

```yaml
telemetry.tracing.exporters:
  phoenix:
    base_url: 'https://<my-phoenix-host>'
    public_url: 'https://<my-phoenix-host>'
    project_name: '<my-name>'
    api_key: '<my-api-key>'
```

### Configure AI Connectors

Configure your AI connectors in `kibana.dev.yml` or via the `KIBANA_TESTING_AI_CONNECTORS` environment variable:

```yaml
# In kibana.dev.yml
xpack.actions.preconfigured:
  my-connector:
    name: My Test Connector
    actionTypeId: .inference
    config:
      provider: openai
      taskType: completion
    secrets:
      apiKey: <your-api-key>
```

Or via environment variable:

```bash
export KIBANA_TESTING_AI_CONNECTORS='{"my-connector":{"name":"My Test Connector","actionTypeId":".inference","config":{"provider":"openai","taskType":"completion"},"secrets":{"apiKey":"your-api-key"}}}'
```

### Enable Agent Builder

The evaluation suite will automatically enable the Agent Builder feature if it's not already enabled. No manual configuration is needed.

## Running Evaluations

### Start Scout Server

Start Scout server:

```bash
node scripts/scout.js start-server --stateful
```

### Run Evaluations

Run the evaluations:

```bash
# Run all SIEM Entity Analytics evaluations
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-siem-entity-analytics/playwright.config.ts

# Run specific test file
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-siem-entity-analytics/playwright.config.ts evals/basic/basic.spec.ts

# Run with specific connector
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-siem-entity-analytics/playwright.config.ts --project="my-connector"

# Run with LLM-as-a-judge for consistent evaluation results
EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-siem-entity-analytics/playwright.config.ts
```

## Adding New Tests

To add new evaluation tests:

1. Create a new spec file in the appropriate `evals/` subdirectory
2. Use the `evaluate` fixture from `src/evaluate.ts`
3. Define your dataset with `examples` containing `input` and `output` fields
4. Use `criteria` in the output for criteria-based evaluation

Example:

```typescript
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('My Test Suite', { tag: '@svlSecurity' }, () => {
  evaluate('my test', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'my-dataset',
        description: 'Description of my test',
        examples: [
          {
            input: {
              question: 'My question?',
            },
            output: {
              criteria: [
                'Criteria 1',
                'Criteria 2',
              ],
            },
            metadata: { query_intent: 'Factual' },
          },
        ],
      },
    });
  });
});
```
