# Risk Score Maintainer

The risk score maintainer (`id: 'risk-score'`) is registered by `security_solution`, not `entity_store`, via `registerRiskScoreMaintainer()`. It scores entities from alerts and **dual-writes** to both the risk score index and the entity store in the same run. Lives under `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/maintainer/`.

## Three Gates (don't confuse them)

| Gate | Kind | Controls | Default |
|------|------|----------|---------|
| `entityAnalyticsEntityStoreV2` | Experimental feature (`kibana.dev.yml` / `enableExperimental`) | Whether the maintainer is registered at all, checked in `security_solution`'s `plugin.ts` at setup. Requires Kibana restart. | `true` |
| `securitySolution:entityStoreEnableV2` | UI setting | Runtime `idBasedRiskScoringEnabled` — entity store dual-write (read via `getIsIdBasedRiskScoringEnabled()`) | `true`, `readonly: true` |
| `riskScoreCreateMissingEntitiesEnabled` | Experimental feature (`kibana.dev.yml` / `enableExperimental`) | Opt-in for the create-if-missing path only (see below). Requires Kibana restart. | `false` |

The platform Cloud feature flag `entityStore.entityProvenanceEnabled` is separate from these
three risk-score gates. It controls the `entity.created_by` mapping migration and
logs-extraction backfill, and defaults to `false`.

`riskScoreCreateMissingEntitiesEnabled` is ANDed with the UI setting in `loadRunConfiguration` — **both** must be on for creation to occur, so it can be disabled independently without turning off dual-write:

```typescript
const createMissingEntitiesEnabled =
  idBasedRiskScoringEnabled && experimentalFeatures.riskScoreCreateMissingEntitiesEnabled;
```

## Score Sources

- **Entity Store** (`entity.risk.*`, `entity.relationships.resolution.risk.*`) — for score badges, score values, risk levels. Primary source.
- **Risk score index** (`risk-score.risk-score-default`) — for detailed breakdowns (category scores, inputs, modifiers, Lens visualizations). Query with `useRiskScore()` hook + `score_type` filter.

## Create-If-Missing Path

Base scoring discovers EUIDs from alerts (composite agg + ES|QL), which can include identifiers with no canonical entity store record — `host.id` variations, synthetic identifiers, alerts naming an entity the store never saw. By default these scores are **dropped** (as the v1 maintainer did). When `createMissingEntitiesEnabled` is true, each dropped EUID is re-evaluated against a real alert document and created instead.

```mermaid
flowchart TD
  scores["Base scores from alerts"] --> lookup{"EUID in entity store?"}
  lookup -->|yes| both["Risk index + entity store update"]
  lookup -->|no| gate{"createMissingEntitiesEnabled?"}
  gate -->|no| dropped["Dropped (pre-existing behaviour)"]
  gate -->|yes| fetchDoc["fetchAlertIdentityDocs: chunked, event.outcome:failure excluded"]
  fetchDoc -->|no document found| skipped["Skipped: no_alert_document / policy-rejected"]
  fetchDoc -->|document found| policy{"getEntityCreationCandidate"}
  policy -->|rejected| skipped
  policy -->|"accepted, EUID matches score.id_value, no reserved fields"| bulk["createEntitiesFromSource: create-only bulk"]
  policy -->|"euid_mismatch or reserved_field"| failed["Failed: euid_mismatch / reserved_field / bulk_create_failed"]
  bulk -->|created| riskOnly["Risk index only (doc already carries entity.risk.*)"]
  bulk -->|"409 alreadyExists"| both
  bulk -->|other bulk error| failed
```

**Why it can't trust the maintainer's own EUID:** the ES|QL base-scoring query applies only `documentsFilter`, not `postAggFilter`. The user `postAggFilter` short-circuits on `entityIdExistsAfterLookup`, which trivially passes for any synthetic doc that already carries the candidate EUID. So the gate re-derives everything (namespace, identity fields, `event.outcome`) from a real source document instead.

`fetchAlertIdentityDocs` (`maintainer/utils/fetch_alert_identity_docs.ts`) fetches one representative alert `_source` per missing EUID, processed in sequential chunks of `ALERT_IDENTITY_DOCS_CHUNK_SIZE` (500) so a 10k-EUID page can't issue a single unbounded `terms` agg. Per chunk: a `terms` agg on the same `entity_id` Painless runtime mapping used by the composite query, with `must_not: { term: { event.outcome: failure } } }` so the newest *eligible* alert wins the `top_hits` size 1 selection (sorted by `@timestamp` desc) — without this filter, a single newer failure alert for an EUID could make `getEntityCreationCandidate` reject a candidate that has an older, eligible alert available. The in-memory policy check stays authoritative; this query filter only optimizes the selection. It pulls the **full `_source`**, not a trimmed field list — the namespace derivation reads `event.kind`, `event.category`, `event.type`, `cloud.provider`, and others beyond the identity fields themselves. Honors the maintainer's `abortSignal` between chunks, and short-circuits entirely (no query issued) for entity types with no `creatableFromSingleDocument` (via `isEntityTypeCreatableFromSingleDocument`).

## Conservative Entity Creation Gate

`getEntityCreationCandidate(entityType, sourceDoc)` in `entity_store/common/domain/definitions/creatable_from_single_document.ts`. The per-type rules are **not** hardcoded here — they live on each type's own definition as an optional `creatableFromSingleDocument` field (see `entity_schema.ts`), next to `postAggFilter`.

The gates exist because the caller holds a **single document** rather than logs extraction's aggregation over the whole corpus — not because that document is an alert. They read plain ECS and contain no alert-specific logic, so a future non-alert single-document creator inherits the same terms. Alert-specific concerns (which index, which filters, picking the representative doc) live entirely in `fetch_alert_identity_docs.ts` on the `security_solution` side.

`getEntityCreationCandidate` is a thin, generic evaluator: shared gates apply first, then the definition's own `creatableFromSingleDocument.requires`:

| Check | Rejection reason | Where it's declared | Why |
|-------|-------------------|----------------------|-----|
| Type has no `creatableFromSingleDocument` (currently `generic`) | `entity_type_not_creatable` | Absence in `generic.ts` | Generic's EUID is `entity.id` verbatim with no gates — creating it would be an arbitrary-string minting path. |
| `event.outcome === 'failure'` | `event_outcome_failure` | Evaluator (cross-cutting) | Missing/`unknown` outcome is allowed, keeping ML anomaly alerts (e.g. PAD jobs, which never carry `event.outcome`) eligible. Applied for every creatable type regardless of whether its own `documentsFilter` also encodes it. |
| `user`: namespace must be `local` | `user_not_local_namespace` | `user.ts`, `creatableFromSingleDocument.requires` | Alerts can't legitimately pass the IdP gates (`event.kind` is rewritten to `signal` on alert docs); an accidental non-local create would mint a high-confidence entity with no authoritative IdP evidence, since `entity.confidence` is stamped from the namespace. |
| `user`: needs `user.name` + `host.id` | `no_identity` | Implied by the `local` namespace derivation | Required to derive the medium-confidence, host-scoped EUID. |
| `host`: needs `host.id` | `host_missing_host_id` | `host.ts`, `creatableFromSingleDocument.requires` | Name-only alerts risk minting duplicates of entities already keyed by `host.id`, so they stay lookup-only. |
| `service`: needs `service.name` | `no_identity` | `service.ts` opts in with no extra `requires` | Single-field identity, low duplicate risk — no extra gate beyond identity presence. |
| any type, EUID/identity fields undeterminable | `no_identity` | Evaluator (cross-cutting) | Fallback for any type when derivation fails. |

The `requires` condition is evaluated against the document *after* `fieldEvaluations` and `whenConditionTrueSetFields*` have been applied (via `buildEvaluatedDoc` in `euid/memory.ts`), so it can reference derived fields like `entity.namespace`, not just raw document fields. It can't reuse `postAggFilter` directly: that filter's `entityIdExistsAfterLookup` branch trivially passes for a synthetic doc that already carries the candidate id.

Beyond `getEntityCreationCandidate`'s own rejection reasons, `createEntitiesFromSource` (`crud_client.ts`) reports a few more outcomes, split into two buckets (see `CreateEntitiesFromSourceResult` below):

- **Skipped** — never reached Elasticsearch, not the caller's fault: `no_alert_document` (no representative alert doc was found for the EUID — `fetchAlertIdentityDocs` came up empty), or any policy rejection reason from the table above.
- **Failed** — policy-eligible but not written: `euid_mismatch` (the EUID re-derived from the source document doesn't match the caller's `expectedEntityId` — for the risk-score maintainer, `score.id_value`); `reserved_field` (the caller's `fields` supplied a reserved dot-path: `entity.id`, `entity.created_by`, `entity.EngineMetadata.*`, `entity.name`, or `entity.lifecycle.*`); `bulk_create_failed` (the request passed both checks but the bulk create itself failed for a reason other than a 409 conflict, e.g. mapping/validation error).

## Write Path

`crudClient.createEntitiesFromSource(requests: CreateEntityFromSourceRequest[])` in `entity_store/server/domain/crud/crud_client.ts`. Deliberately included on `EntityUpdateClient` (unlike the unrestricted `createEntity`) because every request is policy-gated before anything reaches Elasticsearch:

```typescript
interface CreateEntityFromSourceRequest {
  type: EntityType;
  source: unknown;                  // representative alert _source
  expectedEntityId: string;         // EUID the caller already routed data under (e.g. score.id_value)
  createdBy: EntityCreatedBy;       // provenance stamp
  fields?: Record<string, unknown>; // e.g. entity.risk.calculated_score; reserved dot-paths rejected
}

interface CreateEntitiesFromSourceResult {
  created: string[];       // newly created EUIDs
  alreadyExists: string[]; // raced with another creator (e.g. logs extraction)
  skipped: Array<{ euid: string; reason: CreateEntityFromSourceRejectionReason }>; // policy-rejected, never reached ES
  failed: Array<{ euid: string; reason: CreateEntityFromSourceRejectionReason }>;  // euid_mismatch, reserved_field, bulk_create_failed
}
```

- Before any bulk write: the EUID re-derived from `source` must exactly match `expectedEntityId` (`euid_mismatch` otherwise), and `fields` must not touch a reserved dot-path (`reserved_field` otherwise). Score routing keys off `score.id_value`, while creation re-derives the EUID from the document — without this check a divergence (e.g. a multivalued field ranked differently) would create an orphan entity while the caller's own record still fails to land on it.
- Issues one `create`-only bulk request against the LATEST index with `_id = hashEuid(euid)`, `refresh: false`.
- A document that already exists (e.g. created concurrently by logs extraction) surfaces as a per-item 409 / `version_conflict_engine_exception`, routed to `alreadyExists` — never silently overwritten.
- Does not wait for refresh: nothing later in the same maintainer run reads these documents back from the latest index.

## Score Routing After a Create Attempt

From `scoreBaseEntities` (`maintainer/steps/score_base_entities.ts`):

| Outcome | Risk index | Entity store |
|---------|:-----------:|:------------:|
| Already in store | write | update |
| Created | write | *(skipped — create doc already carries `entity.risk.*`)* |
| Raced (`alreadyExists`) | write | update |
| Skipped or failed (no alert doc, policy-rejected, `euid_mismatch`, `reserved_field`, `bulk_create_failed`) | dropped | dropped |

## Provenance: `entity.created_by`

`entity.created_by` is a `managedValue` keyword field (`ENTITY_CREATED_BY_FIELD =
'entity.created_by'`), with values from `ENTITY_CREATED_BY`. Deep-import it from
`@kbn/entity-store/common/domain/definitions/common_fields`, **not** the `common` barrel — see
the page-load gotcha in [SKILL.md](../SKILL.md):

```typescript
export const ENTITY_CREATED_BY = {
  LogsExtraction: 'logs_extraction',
  RiskScoreMaintainer: 'risk_score_maintainer',
} as const;
```

The create-if-missing path writes the field once on create and dual-write updates never overwrite
it. That path remains independently gated by `riskScoreCreateMissingEntitiesEnabled`.

Logs extraction only references or backfills the field when the platform Cloud feature flag
`entityStore.entityProvenanceEnabled` is on. Before building the ES|QL query, Entity Store
idempotently installs current component/index templates and applies
`entity.created_by: keyword` in place to the resolved latest index. Only after that succeeds does
the query emit `COALESCE(entity.created_by, "logs_extraction")`, preserving a maintainer-created
stamp and backfilling touched pre-existing entities. If the mapping update fails, extraction runs
without the provenance reference and retries later, preventing `Unknown column` failures on
pre-existing indices. A one-shot upgrade task proactively performs the same migration for
installed namespaces.

## Funnel & Telemetry Semantics

`RunMetrics` (`maintainer/utils/run_metrics_tracker.ts`) splits what used to be one `scoresWritten*` counter per stage into risk-index and entity-store counters (`scoresWrittenRiskIndexBase`/`Resolution`/`ResetToZero` and `scoresWrittenEntityStoreBase`/`Resolution`/`ResetToZero`), plus `entitiesCreated` / `entitiesCreateSkipped` / `entitiesCreateFailed` (mirroring the CRUD-layer `skipped` / `failed` split above).

The Entity Maintainers framework funnel (`buildRiskScoreEntityMaintainerRunSummary` in `entity_maintainer_run_summary.ts`) for the base stage:

- `scanned` = `scoresCalculatedBase` — all scores calculated from alerts, before the not-in-store filter.
- `skipped` = `entitiesCreateSkipped` — not_in_store scores the create-if-missing path never attempted to write (no representative alert document, or policy-rejected).
- `qualified` = `scanned - skipped` — write failures stay qualified; they were never rejected up front.
- `applied` = `scoresWrittenEntityStoreBase + entitiesCreated` — successful existing-entity updates plus successful creates, counted exactly once.
- `failed` = `scoresFailedBase + entitiesCreateFailed` — entity-store update failures plus create-if-missing write failures (`euid_mismatch`, `reserved_field`, `bulk_create_failed`).
- `droppedNotInStore` is deliberately **not** set on this funnel: the framework defines that field as 404 bulk-write errors, not pre-write lookup misses. The raw missing-before-create count (`scoresMissingFromStoreBase`) is instead reported on the risk-score-specific stage-summary event below.

The legacy risk-score-specific `telemetryReporter` event (`RISK_SCORE_MAINTAINER_STAGE_SUMMARY_EVENT`, `phase1_base_scoring`) carries `scoresMissingFromStore`, `entitiesCreated`, `entityCreationsSkipped`, and `entityCreationsFailed`. Both reporters run side by side during migration onto the framework-only path.
