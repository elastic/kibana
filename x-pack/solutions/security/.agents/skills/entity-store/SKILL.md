---
name: entity-store
description: >
  Security Solution Entity Store architecture and implementation guide.
  Use when working with Security Entity Store code, entity analytics, entity resolution,
  golden entity, alias entity, resolved_to, resolution fields, entity maintainers,
  EUID, entity CRUD API, or related features in the Security Solution.
  Also use when someone asks "how does entity store work", "entity store v2",
  "entity maintainer", or mentions the entity_store plugin under
  x-pack/solutions/security/plugins/entity_store/.
  NOTE: This is the Security Solution Entity Store, not Observability's entity model.
---

# Security Solution Entity Store

Entity Store is part of Kibana **Security Solution's** Entity Analytics. It aggregates entity-centric security data from multiple sources into a single shared index. It lives in `x-pack/solutions/security/plugins/entity_store/`.

> This skill covers the **Security Solution** Entity Store (`entityStore` plugin). It is not related to Observability's entity model or SLO entities.

**Two versions exist:**
- **v2 (ESQL + Kibana Task)** — active architecture, default since 9.4.0. All new features (Entity Resolution, CRUD API, Maintainers) are v2-only.
- **v1 (Transforms + Enrich Policies)** — legacy, pre-9.4.0. See [references/v1-legacy.md](references/v1-legacy.md) only when debugging older deployments or support tickets.

## v2 Architecture (Active — 9.4.0+)

- **Kibana Task** runs ESQL queries with timestamp-based pagination (~10s batches)
- **Upsert with conflict retry** — never overwrites entire documents
- **LOOKUP JOIN + COALESCE** for field retention — preserves API-set fields across extraction runs
- **EUID** — deterministic entity ID via `euid.getEuidFromObject('host', doc)` (from `@kbn/entity-store-plugin`). Also ES stored scripts.
- **Single shared index** — `.entities.v2.latest.security_{namespace}`, all entity types, scoped by `entity.EngineMetadata.Type`
- **Auto-enabled** — installs on Security Solution navigation. `entityStore` is a required plugin dependency of `securitySolution`.

## Entity Types

**Host** (`host.name`), **User** (`user.name`), **Service**, **Generic** (dynamic, Asset Inventory).

User entities use namespace-qualified `entity.id` (`user:id@namespace`). `entity.namespace` from `event.module`. Non-IDP entities have `namespace: 'local'`, confidence `medium`.

## Plugin Location

```
x-pack/solutions/security/plugins/entity_store/
├── common/domain/definitions/        # Entity schemas, field definitions
├── server/
│   ├── plugin.ts                     # Setup + start contracts
│   ├── domain/
│   │   ├── asset_manager/            # Engine lifecycle (directory)
│   │   ├── resolution/               # Resolution: link/unlink/group
│   │   ├── crud_client/              # CRUD: create/update/bulk/delete
│   │   ├── errors/                   # 12 error classes (see references/errors.md)
│   │   └── logs_extraction/          # ESQL query builders
│   ├── routes/apis/                  # Route handlers
│   └── tasks/
│       ├── extract_entity_task.ts    # ESQL extraction (~10s)
│       └── entity_maintainers/       # Maintainers framework (plural)
```

## References

**IMPORTANT: Never guess route paths, field names, error classes, or API shapes from memory. READ the relevant reference file first — your training data is stale.**

| When you need to... | READ this file first |
|---------------------|---------------------|
| Call any Entity Store API or write curl | [references/api-routes.md](references/api-routes.md) |
| Work with resolution (link/unlink/group) | [references/resolution.md](references/resolution.md) |
| Register or debug a maintainer | [references/maintainers.md](references/maintainers.md) |
| Construct or parse an entity.id (EUID) | [references/euid.md](references/euid.md) |
| Handle errors or write error handling code | [references/errors.md](references/errors.md) |
| Use plugin contracts or handler context | [references/contracts.md](references/contracts.md) |
| Debug pre-9.4 / v1 deployments or support tickets | [references/v1-legacy.md](references/v1-legacy.md) |

## Key Facts (inline — don't rely on memory for these)

**Public route base:** `/api/security/entity_store/` — API version `2023-10-31` (use header `elastic-api-version: 2023-10-31`)
**Internal route base:** `/internal/security/entity_store/` — API version `2` (use header `elastic-api-version: 2`)
**Public routes:** status, install, uninstall, start, stop, CRUD (entities), resolution (link/unlink/group), check_privileges
**Internal routes:** entity_maintainers, force_log_extraction, force_history_snapshot, force_ccs_extract_to_updates
**Resolution routes (public):** `resolution/link` (POST), `resolution/unlink` (POST), `resolution/group` (GET)
**Maintainer routes (internal):** `entity_maintainers` (GET), `entity_maintainers/start/{id}` (PUT), `entity_maintainers/stop/{id}` (PUT), `entity_maintainers/run/{id}` (PUT), `entity_maintainers/init` (POST)
**Resolution field path:** `entity.relationships.resolution.resolved_to` (NOT `entity.resolved_to`)
**Target entity** = no `resolved_to` field. **Alias entity** = has `resolved_to` pointing to target's `entity.id`.
**Create** uses `esClient.create()`. **Bulk** writes to LATEST index (not UPDATES).
**UnlinkResult:** `{ unlinked: string[], skipped: string[] }` — non-aliases silently skipped, no error thrown.
**Start contract CRUD client** exposes create + update only (not full CRUD).

## Gotchas

- **Route paths use underscores** — `entity_maintainers` not `entity-maintainers`. All routes follow this pattern.
- **Unlink skips non-aliases silently** — `UnlinkResult` has a `skipped: string[]` field for entities without `resolved_to`. No error thrown.
- **`?force=true` required** for CRUD updates to fields without `allowAPIUpdate: true`. Resolution fields have it set, so no force needed for resolution operations.
- **`entity.source` is an array**. Previously was a single string. UI must handle arrays.
- **`entity.source` ≠ `entity.namespace`** — `entity.source` (array) lists the index names the entity data came from. `entity.namespace` is the identity provider namespace (`active_directory`, `okta`, `entra_id`, `local`). For resolution target selection by IDP priority, use `entity.namespace`.
- **Document `_id` = MD5 hash of EUID** — not the EUID itself.
- **v1 endpoints being removed** — v1 routes are deprecated and being removed. For v1 details, see [references/v1-legacy.md](references/v1-legacy.md).
- **EUID stored scripts must be registered** before entity store init — they're deployed during install.
- **CCS indices excluded** from extraction queries — cross-cluster data handled by separate `ccsLogsExtractionClient`.
- **bucket_sort VALUE_NULL** — grouping queries using `bucket_sort` with pagination error if `from` is null. Always coalesce to 0: `from: pageIndex * pageSize || 0`. Manifests as `EsError: [bucket_sort] from doesn't support values of type: VALUE_NULL`.
- **ES bulk `update` with partial `doc` does NOT run `default_pipeline`** — known upstream bug ([elastic/elasticsearch#105804](https://github.com/elastic/elasticsearch/issues/105804), fix targeted for ES v9.4.0). The latest index has a `dot_expander` pipeline, but it's bypassed by partial updates. Always use `unflattenObject` from `@kbn/object-utils` when writing partial docs with dotted keys (see `bulkUpdateEntityDocs` in `infra/elasticsearch/resolution.ts`).

## Licensing

- **Entity Store** (v2) — all license tiers
- **Entity Graph** — Platinum+
- **Entity Analytics** — Platinum+
- **Advanced Entity Analytics** (includes Entity Resolution) — Enterprise (ESS) + Complete (Serverless)

## Feature Gating

**Two separate gates exist — don't confuse them:**

1. **UI setting** `securitySolution:entityStoreEnableV2` — runtime toggle for v2 features in the frontend (entity store data source, id-based scoring, dual-write)
   - Frontend: `useUiSetting$<boolean>('securitySolution:entityStoreEnableV2')`
   - Constant: `FF_ENABLE_ENTITY_STORE_V2` from `@kbn/entity-store/public`

2. **Experimental feature flag** `entityAnalyticsEntityStoreV2` — gates server-side plugin setup (risk score maintainer registration). Requires Kibana restart.
   - Enable in `kibana.dev.yml`: `xpack.securitySolution.enableExperimental: ['entityAnalyticsEntityStoreV2']`
   - Defaults to `false` in `common/experimental_features.ts`
   - The **risk score maintainer** only registers when this flag is `true` (checked in `plugin.ts` at setup)

## Risk Score Architecture (v2)

The risk score maintainer (`id: 'risk-score'`) is registered by `security_solution` plugin (not `entity_store`) via `registerRiskScoreMaintainer()`. It **dual-writes** to both the risk score index AND the entity store in the same run.

**When to use which source:**
- **Entity Store** (`entity.risk.*`, `entity.relationships.resolution.risk.*`) — for displaying score badges, score values, risk levels. Primary source for scores.
- **Risk score index** (`risk-score.risk-score-default`) — for detailed breakdowns (category scores, inputs, modifiers, Lens visualizations). Query with `useRiskScore()` hook + `score_type` filter.
