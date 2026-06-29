# Internal Schedule API

Internal workflow schedule routes for the `discoveries` plugin.

## Overview

These routes provide the same capabilities as the existing public schedule API in `elastic_assistant` (`/api/attack_discovery/schedules`), but with workflow-specific configuration. When the feature flag is enabled, the Attack Discovery UI calls these internal routes instead of the public API.

### Key Design Decisions

- **Always alerting-backed**: Schedules are always alerting rules of type `attack-discovery`, managed via the `AttackDiscoveryScheduleDataClient` from `@kbn/attack-discovery-schedules-common`. This is true regardless of feature flag state — the hybrid architecture ensures the Alerting Framework always owns scheduling, alert persistence, and action execution (with full throttling/frequency support). See the [ADR](../../../../packages/kbn-attack-discovery-schedules-common/docs/adr_scheduling_strategy.md) for rationale.
- **Tag isolation**: Internal schedules use a bidirectional tag strategy: `applyTags` tags every write with `attack-discovery-schedule`, and `filterTags` restricts reads to only that tag. This ensures the internal API never surfaces schedules created by the public API. See [Why isolation?](#why-isolation) for the rationale.
- **Shared infrastructure**: Both APIs share the same data client, field maps, and transforms from `@kbn/attack-discovery-schedules-common`, minimizing duplication.
- **snake_case**: All request/response parameters use snake_case, matching the OpenAPI schemas in `@kbn/discoveries-schemas`.

### Why isolation?

The public API's update path (`rulesClient.update()`) performs **full parameter replacement** — not a merge. The public API's update transform (`transformAttackDiscoveryScheduleUpdatePropsFromApi`) builds rule params without `workflowConfig`, so any existing `workflowConfig` stored on the alerting rule is silently wiped on update.

Allowing the internal API to surface public-API schedules would mean users could inadvertently update those schedules via the internal API, stripping their `workflowConfig` (ESQL queries, custom workflow IDs) without any warning.

Tag isolation is therefore a **data safety** measure, not merely a cosmetic filter. Internal schedules are safe to update via the internal API; public schedules are safe to update via the public API. Cross-API mutation would cause silent data loss.

## Feature Flag

```yaml
feature_flags.overrides:
  securitySolution.attackDiscoverySchedulesEnabled: true
```

When disabled, these routes return `403 Forbidden`.

## Routes

All routes require `internal` access and the `securitySolution:attackDiscovery` privilege.

### POST /internal/attack_discovery/schedules

Creates a new workflow schedule.

**Auth:** `attackDiscovery.all` + `attackDiscovery.updateSchedule`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Schedule display name |
| `interval` | string | yes | Execution interval (e.g., `24h`, `1d`) |
| `enabled` | boolean | no | Whether the schedule is active (default: `false`) |
| `actions` | Action[] | no | Notification actions to trigger on execution |
| `api_config` | InsightsApiConfig | yes | Connector configuration |
| `workflow_config` | WorkflowConfig | no | Workflow-specific settings |

**InsightsApiConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connector_id` | string | yes | Connector saved object ID |
| `action_type_id` | string | yes | Connector type (e.g., `.gen-ai`) |
| `default_system_prompt_id` | string | no | Default system prompt to use |

**WorkflowConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `default_alert_retrieval_mode` | `'custom_query'` \| `'disabled'` \| `'esql'` | no | Alert retrieval mode (default: `'custom_query'`) |
| `alert_retrieval_workflow_ids` | string[] | no | Custom alert retrieval workflow IDs |
| `promotion_workflow_id` | string | no | Custom promotion workflow ID |

**Response:** `200 OK` with the created schedule object.

### GET /internal/attack_discovery/schedules/{id}

Retrieves a single schedule by ID.

**Auth:** `attackDiscovery.all`

**Path params:** `id` — schedule ID

**Response:** `200 OK` with the schedule object.

### GET /internal/attack_discovery/schedules/_find

Lists schedules with pagination and sorting.

**Auth:** `attackDiscovery.all`

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

**Auth:** `attackDiscovery.all` + `attackDiscovery.updateSchedule`

**Path params:** `id` — schedule ID

**Request body:** Same fields as create (all optional for partial update).

**Response:** `200 OK` with the updated schedule object.

### DELETE /internal/attack_discovery/schedules/{id}

Deletes a schedule.

**Auth:** `attackDiscovery.all` + `attackDiscovery.updateSchedule`

**Path params:** `id` — schedule ID

**Response:** `200 OK` with `{ id }`.

### POST /internal/attack_discovery/schedules/{id}/_enable

Enables a disabled schedule.

**Auth:** `attackDiscovery.all` + `attackDiscovery.updateSchedule`

**Path params:** `id` — schedule ID

**Response:** `200 OK` with `{ id }`.

### POST /internal/attack_discovery/schedules/{id}/_disable

Disables an enabled schedule.

**Auth:** `attackDiscovery.all` + `attackDiscovery.updateSchedule`

**Path params:** `id` — schedule ID

**Response:** `200 OK` with `{ id }`.

## Architecture

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  Public API (elastic_assistant) │     │  Internal API (discoveries)│
│  /api/attack_discovery/schedules│     │  /internal/.../schedules        │
│  applyTags:  (none)             │     │  applyTags:  attack-discovery-   │
│  filterTags: (none)             │     │              schedule            │
│                                 │     │  filterTags: attack-discovery-   │
│                                 │     │              schedule            │
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
| **Filter tags** | None | `attack-discovery-schedule` (read isolation — see [Why isolation?](#why-isolation)) |
| **Workflow config** | Not supported | `workflow_config` field |
| **Feature flag** | Always available | `attackDiscoverySchedulesEnabled` |
| **Access** | `public` | `internal` |

Both APIs use the same `AttackDiscoveryScheduleDataClient` (alerting-backed). The internal API adds `workflow_config` support so the executor can delegate generation to the workflows engine while the Alerting Framework retains ownership of scheduling and action execution.

## Relationship to Public API

The internal API is **additive** — it does not modify or replace the public API. Both APIs coexist, creating alerting rules of the same type but isolated by tags. The public API's FTR tests continue to pass unchanged.

When the feature flag is disabled, the UI falls back to the public API, ensuring zero disruption for users who have not opted into the new scheduling.

## Testing

Scout API integration tests are located at:

```
discoveries/test/scout/api/schedules/
```

See the [test README](../../../test/scout/api/schedules/README.md) for instructions.
