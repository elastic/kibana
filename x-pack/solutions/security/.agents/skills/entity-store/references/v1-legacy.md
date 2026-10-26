# Entity Store v1 (Legacy — Transform-Based)

> **Applies to:** Kibana < 9.4.0, or environments not yet migrated to v2.
> **Code location:** `security_solution/server/lib/entity_analytics/entity_store/`
> **Only read this file** when specifically asked about v1, debugging pre-9.4 deployments, or investigating SDH tickets on older versions.

## Architecture

v1 uses ES Transforms, Enrich Policies, and Ingest Pipelines (no ESQL, no Kibana Task).

```
Source indices (logs-*, risk scores, asset criticality)
    ↓
ES Transforms (2 per entity type: latest + history)
    ↓
Latest Index (.entities.v1.latest.security_{type}_{namespace})
    ↓
Enrich Policy (field retention: entity_store_field_retention_{type}_{namespace}_v1.0.0)
    ↓
Ingest Pipeline (Painless scripts for field enrichment + cleanup)
    ↓
Updates Data Stream (.entities.v1.updates.security_{type}_{namespace})
```

Key difference from v2: v1 has **per-entity-type indices** (separate index for host, user, service), while v2 uses a **single shared index per namespace**.

## Index Naming

| Index Type | Pattern | Example |
|-----------|---------|---------|
| Latest | `.entities.v1.latest.security_{type}_{namespace}` | `.entities.v1.latest.security_host_default` |
| History | `.entities.v1.history.{date}.security_{type}_{namespace}` | `.entities.v1.history.2025-04-01.security_host_default` |
| Updates | `.entities.v1.updates.security_{type}_{namespace}` | `.entities.v1.updates.security_host_default` |
| Reset | `.entities.v1.reset.security_{type}_{namespace}` | `.entities.v1.reset.security_host_default` |

Definition ID format: `security_{entityType}_{namespace}` (e.g., `security_host_default`)

## v1 API Routes (Public v1)

All use `API_VERSIONS.public.v1` versioning.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/entity_store/engines/{entityType}/init` | Initialize engine |
| POST | `/api/entity_store/engines/{entityType}/start` | Start engine |
| POST | `/api/entity_store/engines/{entityType}/stop` | Stop engine |
| DELETE | `/api/entity_store/engines/{entityType}` | Delete engine |
| GET | `/api/entity_store/engines/{entityType}` | Get engine status |
| GET | `/api/entity_store/engines` | List all engines |
| GET | `/api/entity_store/privileges` | Check privileges (internal) |
| POST | `/api/entity_store/apply_dataview_indices` | Apply data view indices |

> **Removal:** v1 endpoints are being removed. After 9.4, these routes will not exist.

## v1 Background Tasks

| Task Type | Schedule | Timeout | Purpose |
|-----------|----------|---------|---------|
| `entity_store:snapshot` | Daily 00:01 UTC | 1h | Daily entity state snapshots |
| `entity_store:field_retention:enrichment` | Every 1h | 10m | Refresh enrich policy data |
| `entity_store:data_view:refresh` | On demand | — | Refresh data view indices |
| `entity_store:health` | Shared | — | Health monitoring |

## v1 Defaults

| Setting | Value |
|---------|-------|
| Lookback period | 3h |
| Field history length | 10 |
| Sync delay | 1m |
| Transform frequency | 1m |
| Timeout | 180s |

## Required ES Privileges (v1-specific)

v1 needs additional privileges that v2 does not:
- `manage_transform`
- `manage_enrich`
- `manage_ingest_pipelines`
- `manage_index_templates`

## v1 → v2 Migration

Migration is **automatic** when v2 is installed on a namespace with v1 running. The `stopAndRemoveV1()` function (`entity_store/server/infra/remove_v1.ts`) cleans up:

- 2 transforms per entity type (`entities-v1-latest-*`, `entities-v1-history-*`)
- Ingest pipelines (latest, history, platform)
- Index templates and component templates
- Enrich policy (`entity_store_field_retention_*_v1.0.0`)
- Reset index and updates data stream
- Saved objects (`entity-definition:*`, `entity-engine-status:*`)
- Shared tasks (field retention enrichment, data view refresh, health)

The engine descriptor's `VersionState` tracks migration:
```typescript
{ version: 2, state: 'running', isMigratedFromV1: true }
```

## v1 Deprecation Timeline

- **v3 schema** — stops returning v1 config fields in schemas (but keeps in mappings)
- **v4 data_removal** — deletes v1 fields from saved object documents

## Debugging v1 (SDH Context)

**Common v1 issues:**
- Transform failures (check `GET _transform/entities-v1-latest-security_{type}_{namespace}/_stats`)
- Enrich policy stale data (check last enrichment task execution)
- Field retention not working (check ingest pipeline Painless script errors)
- History index growing unbounded (check snapshot task scheduling)

**Key files for v1 debugging:**
- `security_solution/server/lib/entity_analytics/entity_store/elasticsearch_assets/` — index templates, pipelines, enrich policies
- `security_solution/server/lib/entity_analytics/entity_store/tasks/` — task type constants
- `security_solution/server/lib/entity_analytics/entity_store/painless/` — Painless script builders
- `entity_store/server/infra/remove_v1.ts` — v1 cleanup logic (useful to understand what v1 resources exist)

**Transform IDs for debugging:**
- `entities-v1-latest-security_host_default`
- `entities-v1-latest-security_user_default`
- `entities-v1-latest-security_service_default`
