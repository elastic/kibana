# Entity Maintainers Framework

Recurring background tasks operating on entity data. Used by automated resolution and entity relationships maintainers.

## Registration

Register at consuming plugin's `setup()`:

```typescript
interface RegisterEntityMaintainerConfig {
  id: string;
  description?: string;
  interval: string;                    // e.g. '5m', '1h'
  initialState: EntityMaintainerState;
  run: EntityMaintainerTaskMethod;     // Called every interval
  setup?: EntityMaintainerTaskMethod;  // Optional one-time init (first run only)
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
  status: EntityMaintainerStatus;       // { metadata: { namespace, runs, lastSuccessTimestamp, lastErrorTimestamp }, state }
  abortController: AbortController;
  logger: Logger;
  fakeRequest: KibanaRequest;           // For creating scoped clients
  esClient: ElasticsearchClient;        // Scoped to installing user's permissions
  crudClient: EntityUpdateClient;       // For updating entity documents
}
```

## Key Behaviors

- **Scheduling**: On Entity Store install + plugin start
- **Task type**: `entity_store:v2:entity_maintainer_task:{id}`
- **`setup()` runs once**: When `status.metadata.runs === 0`
- **State persistence**: Via task manager (survives restarts)
- **Telemetry**: `entity_maintainer` event
- **Licensing**: Per-maintainer gating possible via `minLicenseLevel` on registration

## Available Context Clients

The `crudClient: EntityUpdateClient` gives maintainers write access to entity documents. The `esClient` provides raw ES access scoped to the installing user's permissions. Use `fakeRequest` when you need to create additional scoped Kibana clients.
