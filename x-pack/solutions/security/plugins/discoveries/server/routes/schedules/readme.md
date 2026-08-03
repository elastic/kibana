# Internal Schedule API

Internal workflow schedule routes for the `discoveries` plugin.

## Overview

These routes provide the same capabilities as the existing public schedule API in `elastic_assistant` (`/api/attack_discovery/schedules`), but with workflow-specific configuration. When the feature flag is enabled, the Attack Discovery UI calls these internal routes instead of the public API.

### Key Design Decisions

- **Always alerting-backed**: Schedules are always alerting rules of type `attack-discovery`, managed via the `AttackDiscoveryScheduleDataClient` from `@kbn/attack-discovery-schedules-common`. This is true regardless of feature flag state — the hybrid architecture ensures the Alerting Framework always owns scheduling, alert persistence, and action execution (with full throttling/frequency support). See the [ADR](../../../../packages/kbn-attack-discovery-schedules-common/docs/adr_scheduling_strategy.md) for rationale.
- **Asymmetric tag visibility**: The internal API `applyTags` tags every write with `attack-discovery-schedule`, but it does **not** apply a read `filterTags`. As a result the internal API surfaces **all** schedules — both workflow-tagged schedules and legacy (untagged) schedules created via the public API. The legacy public API is the side that filters: it `excludeTags` the `attack-discovery-schedule` tag so it never surfaces workflow schedules. See [Why asymmetric visibility?](#why-asymmetric-visibility) for the rationale.
- **Shared infrastructure**: Both APIs share the same data client, field maps, and transforms from `@kbn/attack-discovery-schedules-common`, minimizing duplication.
- **snake_case**: All request/response parameters use snake_case, matching the OpenAPI schemas in `@kbn/discoveries-schemas`.

### Why asymmetric visibility?

The internal API is the migration surface for the new workflow-scheduling UI, so it must show users **all** of their existing schedules — including legacy schedules created before the feature flag was enabled. Applying a read `filterTags` would hide those legacy schedules, breaking migration continuity. The internal API therefore reads unfiltered (superset view) while tagging its own writes.

Cross-API update is safe because the public API's update path reads the existing schedule first and **preserves** any stored `workflowConfig` (see `elastic_assistant/.../schedules/public/put/update.ts`), so updating a workflow schedule through the public API no longer strips its `workflowConfig` (ESQL queries, custom workflow IDs). The legacy public API still `excludeTags` workflow schedules from its own reads so it presents only the classic experience.

## Feature Flag

```yaml
feature_flags.overrides:
  securitySolution.attackDiscoveryWorkflowsEnabled: true
```

The routes gate on this flag via `assertWorkflowsEnabled`. When it is OFF, these routes return `404 Not Found` with `{ message: 'Attack Discovery workflows are not enabled' }`.

## Routes

All routes require `internal` access. Read routes require the `securitySolution-attackDiscoveryAll` API privilege; mutating routes additionally require `securitySolution-updateAttackDiscoverySchedule` and `alerts-read`.

### POST /internal/attack_discovery/schedules

Creates a new workflow schedule.

**Auth:** `securitySolution-attackDiscoveryAll` + `securitySolution-updateAttackDiscoverySchedule` + `alerts-read`

**Request body** (`AttackDiscoveryScheduleCreateProps`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Schedule display name |
| `enabled` | boolean | no | Whether the schedule is active (default: `false`) |
| `params` | AttackDiscoveryScheduleParams | yes | Alert-selection and connector configuration (see below) |
| `schedule` | `{ interval: string }` | yes | Execution interval (e.g., `24h`, `1d`) |
| `actions` | ScheduleAction[] | no | Notification actions to trigger on execution |

**AttackDiscoveryScheduleParams:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alerts_index_pattern` | string | yes | Space-specific alerts index. Must equal `.alerts-security.alerts-<spaceId>`; any other value (another space or a cross-space `-*` wildcard) is rejected with `400` by `assertAlertsIndexPatternInSpace` |
| `api_config` | AttackDiscoveryApiConfig | yes | Connector configuration |
| `size` | number | yes | Maximum number of alerts to retrieve |
| `start` / `end` | string | no | Alert time-range bounds |
| `filters` / `query` / `combined_filter` | object | no | Additional alert-selection filters |
| `workflow_config` | WorkflowConfig | no | Workflow-specific settings |

**AttackDiscoveryApiConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connector_id` | string | yes | Connector saved object ID |
| `action_type_id` | string | yes | Connector type (e.g., `.gen-ai`) |
| `default_system_prompt_id` | string | no | Default system prompt to use |
| `provider` | string | no | Connector provider |
| `model` | string | no | LLM model ID |
| `name` | string | no | Connector display name |

**WorkflowConfig** (three independent retrieval toggles compose the alert set; at least one must be enabled):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `skill_enabled` | boolean | no | Toggle 1 — whether the attack discovery skill performs its own additional alert retrieval (default: `true`) |
| `default_retrieval_enabled` | boolean | no | Toggle 2 — whether the built-in default alert retrieval workflow runs (default: `false`) |
| `alert_retrieval_workflows_enabled` | boolean | no | Toggle 3 — whether the user-created alert retrieval workflows run (default: `false`) |
| `alert_retrieval_mode` | `'custom_query'` \| `'esql'` | no | Query mode for the built-in default retrieval; only meaningful when `default_retrieval_enabled` is true (default: `'custom_query'`) |
| `esql_query` | string | no | ES\|QL query (required when `default_retrieval_enabled` is true and `alert_retrieval_mode` is `'esql'`) |
| `alert_retrieval_workflow_ids` | string[] | no | User-created alert retrieval workflow IDs to execute (default: `[]`) |
| `validation_workflow_id` | string | no | ID of the validation workflow to use, or `'default'` for built-in (default: `'default'`) |

**Response:** `200 OK` with the created schedule object.

### GET /internal/attack_discovery/schedules/{id}

Retrieves a single schedule by ID.

**Auth:** `securitySolution-attackDiscoveryAll` + `alerts-read`

**Path params:** `id` — schedule ID

**Response:** `200 OK` with the schedule object.

### GET /internal/attack_discovery/schedules/_find

Lists schedules with pagination and sorting.

**Auth:** `securitySolution-attackDiscoveryAll` + `alerts-read`

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `per_page` | number | `10` | Results per page |
| `sort_field` | string | — | Field to sort by |
| `sort_direction` | `asc` \| `desc` | — | Sort direction |

**Response:** `200 OK` with `{ page, per_page, total, data: Schedule[] }`.

### PUT /internal/attack_discovery/schedules/{id}

Updates an existing schedule.

**Auth:** `securitySolution-attackDiscoveryAll` + `securitySolution-updateAttackDiscoverySchedule` + `alerts-read`

**Path params:** `id` — schedule ID

**Request body:** Same fields as create (all optional for partial update).

**Response:** `200 OK` with the updated schedule object.

### DELETE /internal/attack_discovery/schedules/{id}

Deletes a schedule.

**Auth:** `securitySolution-attackDiscoveryAll` + `securitySolution-updateAttackDiscoverySchedule` + `alerts-read`

**Path params:** `id` — schedule ID

**Response:** `200 OK` with `{ id }`.

### POST /internal/attack_discovery/schedules/{id}/_enable

Enables a disabled schedule.

**Auth:** `securitySolution-attackDiscoveryAll` + `securitySolution-updateAttackDiscoverySchedule` + `alerts-read`

**Path params:** `id` — schedule ID

**Response:** `200 OK` with `{ id }`.

### POST /internal/attack_discovery/schedules/{id}/_disable

Disables an enabled schedule.

**Auth:** `securitySolution-attackDiscoveryAll` + `securitySolution-updateAttackDiscoverySchedule` + `alerts-read`

**Path params:** `id` — schedule ID

**Response:** `200 OK` with `{ id }`.

## Architecture

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  Public API (elastic_assistant) │     │  Internal API (discoveries)│
│  /api/attack_discovery/schedules│     │  /internal/.../schedules        │
│  applyTags:  (none)             │     │  applyTags:  attack-discovery-   │
│  excludeTags: attack-discovery- │     │              schedule            │
│               schedule          │     │  filterTags: (none — shows all)  │
│                                 │     │                                  │
└───────────┬─────────────────────┘     └───────────┬─────────────────────┘
            │                                       │
            └──────────────┬────────────────────────┘
                           │
            ┌──────────────▼──────────────────────┐
            │ @kbn/attack-discovery-schedules-common│
            │ - AttackDiscoveryScheduleDataClient   │
            │ - Transforms (API ↔ internal)         │
            │ - Field maps, constants               │
            └──────────────┬──────────────────────┘
                           │
            ┌──────────────▼──────────────────────┐
            │ Kibana Alerting Framework            │
            │ - Rule type: attack-discovery         │
            │ - Task Manager (scheduling)           │
            │ - Alerts-as-data (results)            │
            │ - Actions (notifications)             │
            └──────────────────────────────────────┘
```

### Route Differences from Public API

| Aspect | Public API | Internal API |
|--------|-----------|--------------|
| **Executor** | Inline generation logic | `executeGenerationWorkflow` (delegates to workflows engine) |
| **Apply tags** | None | `attack-discovery-schedule` |
| **Read filter** | `excludeTags: attack-discovery-schedule` (hides workflow schedules) | None — surfaces all schedules (see [Why asymmetric visibility?](#why-asymmetric-visibility)) |
| **Workflow config** | Preserved on update, not settable | `workflow_config` field |
| **Feature flag** | Always available | `attackDiscoveryWorkflowsEnabled` |
| **Access** | `public` | `internal` |

Both APIs use the same `AttackDiscoveryScheduleDataClient` (alerting-backed). The internal API adds `workflow_config` support so the executor can delegate generation to the workflows engine while the Alerting Framework retains ownership of scheduling and action execution.

## Relationship to Public API

The internal API is **additive** — it does not modify or replace the public API. Both APIs coexist, creating alerting rules of the same type but isolated by tags. The public API's FTR tests continue to pass unchanged.

When the feature flag is disabled, the UI falls back to the public API, ensuring zero disruption for users who have not opted into the new scheduling.

## Testing

Scout API integration tests are located at:

```
discoveries/test/scout/api/tests/
```

See the [test README](../../../test/scout/api/README.md) for instructions.
