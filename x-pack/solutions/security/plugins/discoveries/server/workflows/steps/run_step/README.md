# `attack-discovery.run` Workflow Step

The `attack-discovery.run` step is the high-level entry point into the Attack Discovery pipeline. It orchestrates alert retrieval, LLM-based discovery generation, and validation in a single, composable workflow step.

## What it does

When a workflow invokes `attack-discovery.run`, the step:

1. **Resolves the connector** — looks up the `action_type_id` for the given `connector_id` so the generation engine knows which LLM provider to use.
2. **Builds a workflow config** — maps the step's inputs to the internal `WorkflowConfig` structure, including alert retrieval mode, ES|QL query, pre-retrieved alerts, and validation overrides.
3. **Runs the pipeline** via `executeGenerationWorkflow` from `@kbn/discoveries`:
   - **Alert retrieval** — fetches and anonymizes alerts from Elasticsearch (unless `alerts` is provided directly).
   - **Generation** — sends anonymized alerts to the LLM and parses attack discovery objects.
   - **Validation** — deduplicates discoveries against previously persisted results.
4. **Returns the output** — in sync mode, returns discoveries inline; in async mode, returns only `execution_uuid` immediately.

## Why it exists

Before this step, the only way to trigger Attack Discovery was through the internal REST API at `POST /internal/attack_discovery/_generate`. That endpoint works well for the Kibana UI, but it is not composable — it cannot be wired into a larger workflow, it cannot receive alerts from an upstream step, and it cannot be customized without modifying the API itself.

The `attack-discovery.run` step exposes the same underlying pipeline to the Kibana Workflows engine. This means:

- A detection rule workflow can retrieve specific alerts and pass them directly to Attack Discovery.
- Multiple Attack Discovery runs can be composed into a single workflow (e.g., separate runs per tenant or time window).
- Custom alert retrieval workflows can feed their results into the step via the `alerts` input.
- The validation step can be replaced with a custom workflow by setting `validation_workflow_id`.

## Key design decisions

### `alerts` is the primary composability point

When `alerts` is provided (non-empty), the step automatically sets `alert_retrieval_mode` to `provided`, bypassing all retrieval. This is how upstream steps or workflows pass their alert output to Attack Discovery without having to know about retrieval modes:

```yaml
with:
  alerts: ${{ steps.my_retrieval_step.output.alerts }}
  connector_id: ${{ inputs.connector_id }}
```

### The `replacements` map is never exposed

The anonymization `replacements` map (which maps anonymized tokens back to real entity names) is held in memory during the pipeline but is intentionally excluded from the step output. Exposing it would leak PII/sensitive entity names into workflow state, logs, and any downstream steps.

### Sync vs async mode

| Mode | Behavior | When to use |
|------|----------|-------------|
| `sync` (default) | Waits for the full pipeline; returns `attack_discoveries`, `discovery_count`, `alerts_context_count`, `execution_uuid` | When downstream steps need the discoveries |
| `async` | Fires the pipeline without waiting; returns only `execution_uuid` | When the caller only needs to trigger the run and track it separately |

In async mode, pipeline errors are logged but do not propagate to the workflow — the step always returns successfully with the `execution_uuid`.

### Alert retrieval modes

| Mode | Description |
|------|-------------|
| `custom_query` (default) | DSL query against `.alerts-security.alerts-default`; respects `start`, `end`, `size`, `filter` |
| `provided` | Uses the `alerts` input directly; no Elasticsearch query |
| `esql` | Runs the ES\|QL query in `esql_query` |
| `disabled` | Skips retrieval entirely (generation receives no alert context) |

## Implementation files

| File | Purpose |
|------|---------|
| [`common/step_types/run_step.ts`](../../../../common/step_types/run_step.ts) | Zod schemas for input/output; `RunStepCommonDefinition` shared between server and UI |
| [`server/workflows/steps/run_step/get_run_step_definition.ts`](./get_run_step_definition.ts) | Server-side handler; connector resolution, pipeline orchestration, sync/async branching |
| [`common/step_types/shared_schemas.ts`](../../../../common/step_types/shared_schemas.ts) | Reusable `AttackDiscoverySchema`, `AnonymizedAlertSchema`, `ApiConfigSchema` |

## vs. the internal REST API

The `POST /internal/attack_discovery/_generate` route and the `attack-discovery.run` step call the same underlying function (`executeGenerationWorkflow`), but they serve different callers:

| | `POST /internal/attack_discovery/_generate` | `attack-discovery.run` step |
|---|---|---|
| **Caller** | Kibana UI (`useAttackDiscovery` hook) | Kibana Workflows engine |
| **Trigger** | HTTP request | Workflow execution |
| **Mode** | Always async (fire-and-forget) | Sync or async |
| **Composability** | None — standalone endpoint | Full — receives output from upstream steps |
| **Alert input** | Body parameter or retrieval via config | `alerts` input from upstream steps |
| **Auth** | Kibana HTTP auth | Workflow execution context |

Use the REST API when building Kibana UI features. Use the workflow step when building automated pipelines.

## Example workflow

The `Attack discovery - Run example` workflow ([`attack_discovery_run_example.workflow.yaml`](../../definitions/attack_discovery_run_example.workflow.yaml)) demonstrates the step with all inputs documented and the `alerts` composability pattern highlighted:

```yaml
steps:
  - name: run_attack_discovery
    type: attack-discovery.run
    timeout: '10m'
    with:
      # Primary composability point: when non-empty, retrieval is skipped.
      alerts: ${{ inputs.alerts }}
      connector_id: ${{ inputs.connector_id }}
      # All other inputs are optional with sensible defaults:
      alert_retrieval_mode: ${{ inputs.alert_retrieval_mode }}   # default: custom_query
      mode: ${{ inputs.mode }}                                    # default: sync
      start: ${{ inputs.start }}
      end: ${{ inputs.end }}
      size: ${{ inputs.size }}
```

The example exposes all inputs as workflow inputs so the same workflow can run standalone (using `custom_query` retrieval) or be called from another workflow that supplies pre-retrieved `alerts`.

## Output shape (sync mode)

```typescript
{
  execution_uuid: string;          // Always present
  attack_discoveries: Array<{      // null if validation failed
    alert_ids: string[];
    details_markdown: string;
    entity_summary_markdown?: string;
    id?: string;
    mitre_attack_tactics?: string[];
    summary_markdown: string;
    timestamp?: string;
    title: string;
  }> | null;
  discovery_count: number;         // 0 if validation failed
  alerts_context_count: number;    // 0 if validation failed
}
```

In async mode, only `execution_uuid` is returned.
