# Security Solution Evals

Evaluation test suite for the SIEM Entity Analytics **skills-based** agent, built on top of [`@kbn/evals`](../../../../platform/packages/shared/kbn-evals/README.md).

## Overview

This test suite contains evaluation tests specifically for the SIEM Entity Analytics skills-based agent, which provides security analysis capabilities through the Agent Builder API using OneChat skills (`invoke_skill`).

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
node scripts/scout.js start-server --stateful --config-dir security_entity_analytics
```

The `security_entity_analytics` configuration extends the default `--stateful` config and enables the `securitySolution.naturalLanguageThreatHunting.enabled` feature flag at the server level, which is useful for running evaluation tests that require this feature to be enabled.

### Run Evaluations

Run the evaluations:

```bash
# Run skills-based SIEM Entity Analytics evaluations (OneAgent skills via invoke_skill)
node scripts/playwright test --config x-pack/solutions/security/test/security_solution_evals/playwright.skills.config.ts
```

### Runtime/parallelism knobs

- `SECURITY_SOLUTION_EVALS_WORKERS`: number of Playwright workers (default: 1)
- `SECURITY_SOLUTION_EVALS_PHOENIX_CONCURRENCY`: Phoenix experiment concurrency (default: 4)
- `EVALUATION_CONNECTOR_ID`: defaults to `pmeClaudeV45SonnetUsEast1` in `playwright.skills.config.ts` if unset
- `HEADED`: set to `true` or `1` to run browsers in headed mode (if browser tests are added)

### Interactive/Debugging Mode

For interactive debugging, use Playwright's UI mode:

```bash
# Run in UI mode for interactive debugging
node scripts/playwright test --ui --config x-pack/solutions/security/test/security_solution_evals/playwright.skills.config.ts --project="pmeClaudeV45SonnetUsEast1"
```

This opens Playwright's interactive UI where you can:
- Watch tests run in real-time
- Debug individual test failures
- Re-run specific tests
- View test traces and logs
## Adding New Tests

To add new evaluation tests:

1. Create a new spec file in the `evals_skills/` subdirectory
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

### Skills-based suite

Skills-based evals live under `evals_skills/` and should be executed with:

```bash
node scripts/playwright test --config x-pack/solutions/security/test/security_solution_evals/playwright.skills.config.ts
```
