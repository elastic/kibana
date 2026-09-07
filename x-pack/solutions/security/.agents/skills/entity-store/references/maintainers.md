# Entity Maintainers Framework

Recurring background tasks operating on entity data. Used by automated resolution, entity relationships, and risk score maintainers.

- **Automated resolution** / **entity relationships** maintainers are registered by `entity_store` itself.
- **Risk score maintainer** (`id: 'risk-score'`, `timeout: '45m'`) is registered by `security_solution` via `registerRiskScoreMaintainer()`. See [references/risk-score.md](risk-score.md) for its feature gates, conservative entity creation policy, and telemetry funnel.

## Registration

Register at consuming plugin's `setup()`:

```typescript
interface RegisterEntityMaintainerConfig {
  id: string;
  description?: string;
  interval: string;                    // e.g. '5m', '1h'
  timeout?: string;                    // e.g. '45m' — max runtime before abort
  initialState: EntityMaintainerState;
  run: EntityMaintainerTaskMethod;     // Called every interval
  setup?: EntityMaintainerTaskMethod;  // Optional one-time init (first run only)
  minLicense?: LicenseType;            // Per-maintainer license gate
}
```

Example:
```typescript
// In your plugin's setup():
entityStore.registerEntityMaintainer({
  id: 'my_maintainer',
  description: 'Computes relationships',
  interval: '5m',
  initialState: { lastProcessedTimestamp: null },
  setup: async (ctx) => { /* one-time init */ },
  run: async (ctx) => { /* called every 5m */ },
});
```

## Task Method Context

```typescript
interface EntityMaintainerTaskMethodContext {
  status: EntityMaintainerStatus;       // { metadata: { namespace, runs, lastSuccessTimestamp, lastErrorTimestamp }, state, taskStatus }
  signal: AbortSignal;
  logger: Logger;
  fakeRequest: KibanaRequest;           // For creating scoped clients
  esClient: ElasticsearchClient;        // Scoped to installing user's permissions
  cpsEsClient: ElasticsearchClient;     // Cross-cluster search scoped client
  crudClient: EntityUpdateClient;       // For updating entity documents (incl. createEntitiesFromSource — see risk-score.md)
  resolutionRulesClient: ResolutionRulesClient;
  entityMetadataClient: EntityMetadataClient;
  telemetry: MaintainerTelemetryClient; // .report(...) — the Entity Maintainers framework telemetry
}
```

## Key Behaviors

- **Scheduling**: On Entity Store install + plugin start
- **Task type**: `entity_store:v2:entity_maintainer_task:{id}`
- **`setup()` runs once**: When `status.metadata.runs === 0`
- **State persistence**: Via task manager (survives restarts)
- **Telemetry**: `entity_maintainer` event, reported via `telemetry.report(...)` on the task context
- **Licensing**: Per-maintainer gating possible via `minLicense` on registration

## Available Context Clients

The `crudClient: EntityUpdateClient` gives maintainers write access to entity documents — including the policy-gated `createEntitiesFromSource` (see [references/risk-score.md](risk-score.md)), but never the unrestricted `createEntity`/`deleteEntity`. The `esClient` provides raw ES access scoped to the installing user's permissions; `cpsEsClient` is the cross-cluster-search-scoped equivalent. Use `fakeRequest` when you need to create additional scoped Kibana clients.
