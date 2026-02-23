# Security Solution Evals

Evaluation test suite for the SIEM Entity Analytics **skills-based** agent, built on top of [`@kbn/evals`](../../../../platform/packages/shared/kbn-evals/README.md).

## Overview

This test suite contains evaluation tests specifically for the SIEM Entity Analytics skills-based agent, which provides security analysis capabilities through the Agent Builder API using Agent Builder skills (`invoke_skill`).

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../../../../platform/packages/shared/kbn-evals/README.md).

## Prerequisites

### Configure Phoenix Exporter (Optional)

If you want to view traces in the Phoenix UI, configure a Phoenix exporter in `kibana.dev.yml`:

```yaml
telemetry.tracing.exporters:
  - phoenix:
      base_url: 'https://<my-phoenix-host>'
      public_url: 'https://<my-phoenix-host>'
      project_name: '<my-name>'
      api_key: '<my-api-key>'
```

This is **optional** for the default (in-Kibana) executor. If you only care about trace-based evaluators stored in Elasticsearch, you can skip Phoenix configuration.

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
# Run all skills-based SIEM Entity Analytics evaluations
node scripts/playwright test --config x-pack/solutions/security/test/security_solution_evals/playwright.skills.config.ts

# Run specific test files
node scripts/playwright test --config x-pack/solutions/security/test/security_solution_evals/playwright.skills.config.ts evals_skills/basic.spec.ts

# Run with grep pattern
node scripts/playwright test --config x-pack/solutions/security/test/security_solution_evals/playwright.skills.config.ts --grep "risk score"
```

### Runtime/parallelism knobs

| Variable | Description | Default |
|----------|-------------|---------|
| `SECURITY_SOLUTION_EVALS_WORKERS` | Number of Playwright workers | `2` |
| `SECURITY_SOLUTION_EVALS_CONCURRENCY` | Experiment concurrency per worker | `4` |
| `EVALUATION_CONNECTOR_ID` | AI connector to use | `pmeClaudeV45SonnetUsEast1` |
| `HEADED` | Set to `true` or `1` for headed browser mode | `false` |
| `SECURITY_SOLUTION_EVALS_SKIP_CLEANUP` | Set to `true` or `1` to skip cleanup (debug mode) | `false` |

### Parallelization

All tests are designed for safe parallel execution:

- Each worker runs in its own isolated Kibana space (`skills-evals-w1`, `skills-evals-w2`, etc.)
- Test data is created with worker-specific identifiers to avoid conflicts
- Anomaly tests create worker-scoped indices (e.g., `.ml-anomalies-security_auth-skills-evals-w1`)

Default: 2 workers. To run with more workers:

```bash
SECURITY_SOLUTION_EVALS_WORKERS=4 node scripts/playwright test --config x-pack/solutions/security/test/security_solution_evals/playwright.skills.config.ts
```

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
    ({ chatClient, evaluators, executorClient }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
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

### Test Structure

The `evals_skills/` directory contains focused test files organized by feature area:

| File | Description | Data Source |
|------|-------------|-------------|
| `basic.spec.ts` | Role and off-topic handling | None |
| `asset_criticality.spec.ts` | Asset criticality queries | Kibana API |
| `entity_store.spec.ts` | Entity store queries | Worker-scoped index |
| `privileged_users.spec.ts` | Privileged user monitoring | Worker-scoped index |
| `risk_score.spec.ts` | Risk score queries | Worker-scoped indices |
| `anomalies_auth.spec.ts` | Authentication anomalies | Worker-scoped ML indices |
| `anomalies_data_exfiltration.spec.ts` | Data exfiltration anomalies | Worker-scoped ML indices |
| `anomalies_lateral_movement.spec.ts` | Lateral movement anomalies | Worker-scoped ML indices |
| `anomalies_network.spec.ts` | Network anomalies | Worker-scoped ML indices |
| `anomalies_privileged_access.spec.ts` | Privileged access anomalies | Worker-scoped ML indices |

### Skills-based suite

Skills-based evals live under `evals_skills/` and should be executed with:

```bash
node scripts/playwright test --config x-pack/solutions/security/test/security_solution_evals/playwright.skills.config.ts
```
