# Security Solution Evals

Evaluation test suites for the SIEM Entity Analytics skill, built on top of [`@kbn/evals`](../../../../platform/packages/shared/kbn-evals/README.md).

## Overview

This test suite contains evaluation tests specifically for the SIEM Entity Analytics skill (`entity-analytics`), which provides entity analytics capabilities.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../../../../platform/packages/shared/kbn-evals/README.md).

## Prerequisites

### Optionally Configure Phoenix Exporter

If using phoenix, configure Phoenix exporter in `kibana.dev.yml`:

```yaml
elastic.apm.active: false
elastic.apm.contextPropagationOnly: false
telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.sample_rate: 1
telemetry.tracing.exporters:
  - phoenix:
      base_url: "http://0.0.0.0:6006"
      public_url: "http://0.0.0.0:6006"
```

> **Note:** `elastic.apm.active: false` and `elastic.apm.contextPropagationOnly: false` are required — Elastic APM and OpenTelemetry tracing cannot run simultaneously.

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

Start Scout server for v1 evals:

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_entity_analytics
```

For v2 evals (Entity Store V2):

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_entity_analytics_v2
```

### Run Evaluations

Run v1 evaluations:

```bash
# Run all SIEM Entity Analytics skills evaluations
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/playwright.config.ts

# Run specific test file
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/playwright.config.ts x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/evals/risk_score_engine_on.spec.ts

# Run with specific connector
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/playwright.config.ts --project="my-connector"

# Run with multiple workers (parallel test files; default is usually 1–2 for evals)
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/playwright.config.ts --workers=4

# Run with LLM-as-a-judge for consistent evaluation results
EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/playwright.config.ts

# Export result to Phoenix
PHOENIX_BASE_URL=http://localhost:6006 KBN_EVALS_EXECUTOR=phoenix node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/playwright.config.ts  --project="my-connector"
```

Run v2 evaluations:

```bash
# Run all Entity Store V2 evaluations
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/playwright.v2.config.ts

# Run with specific connector
node scripts/playwright test --config x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/playwright.v2.config.ts --project="my-connector"
```

## Coverage Matrix

Prompt-to-spec mapping showing which strategy doc prompts are covered by which spec files.

| Prompt | Description | Spec File |
|--------|-------------|-----------|
| P001 | Risk score queries (engine on) | `risk_score_engine_on.spec.ts` |
| P001 | Risk score queries (engine off) | `risk_score_engine_off.spec.ts` |
| P002 | Users logged in from multiple locations | `anomalous_behavior_active_jobs.spec.ts` |
| P003 | Service accounts with unusual access | `anomalous_behavior_active_jobs.spec.ts`, `anomalous_behavior_no_jobs.spec.ts` |
| P004 | Risk score queries (engine on/off) | `risk_score_engine_on.spec.ts`, `risk_score_engine_off.spec.ts` |
| P005 | Risk score jump over time | `partial_feasibility.spec.ts` |
| P006 | Riskiest hosts with high impact | `partial_feasibility.spec.ts` |
| P007 | Risk score queries (engine on/off) | `risk_score_engine_on.spec.ts`, `risk_score_engine_off.spec.ts` |
| P008 | Risk score change for named user | `partial_feasibility.spec.ts` |
| P011 | Privileged accounts with unusual commands | `anomalous_behavior_active_jobs.spec.ts` |
| P012 | Lateral movement connections | `anomalous_behavior_active_jobs.spec.ts` |
| P013 | User activity queries | `partial_feasibility.spec.ts` |
| P015 | Compromised account interactions | `partial_feasibility.spec.ts` |
| P017 | Unusual administrative actions | `anomalous_behavior_active_jobs.spec.ts` |
| P021 | Data uploads to external domains | `anomalous_behavior_active_jobs.spec.ts` |
| P023 | Unusual access to privileged accounts | `anomalous_behavior_active_jobs.spec.ts` |
| P024 | Large email attachments | `partial_feasibility.spec.ts` |
| P026 | Suspicious login patterns | `anomalous_behavior_active_jobs.spec.ts` |
| P028 | Entities with anomalous behavior | `anomalous_behavior_active_jobs.spec.ts` |
| P032 | Unusually large data downloads | `anomalous_behavior_active_jobs.spec.ts` |
| P035 | Downloads exceeding threshold | `anomalous_behavior_active_jobs.spec.ts` |
| P037 | Accounts with increasing risk trends | `partial_feasibility.spec.ts` |
| P039 | Accessing sensitive data from new locations | `anomalous_behavior_active_jobs.spec.ts` |
| P040 | Failed logins followed by successful (EQL) | `boundary_cases.spec.ts` |
| P043 | Unusual after-hours access patterns | `anomalous_behavior_active_jobs.spec.ts` |
| P-AC1 | Asset criticality for host | `asset_criticality.spec.ts` |
| P-AC2 | Business-critical assets with elevated risk | `asset_criticality.spec.ts` |
| P-MS1 | Privileged users with anomalous activity | `multi_skill_routing.spec.ts`, `partial_feasibility.spec.ts` |
| P-MS2 | Privileged accounts outside normal scope | `multi_skill_routing.spec.ts`, `partial_feasibility.spec.ts` |
| P-DR1/2/3 | Detection rules boundary cases | `boundary_cases.spec.ts` |
| Tier 3 | 18 negative/boundary prompts | `boundary_cases.spec.ts` |
| Grounding | Risk score grounding with seeded data | `risk_score_grounding.spec.ts` |
| V2 | Entity Store V2 get_entity routing | `v2/entity_store_v2_get_entity.spec.ts` |
| V2 | Entity Store V2 search_entities routing | `v2/entity_store_v2_search_entities.spec.ts` |
| V2 | Entity Store V2 multi-skill routing | `v2/entity_store_v2_multi_skill.spec.ts` |

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

