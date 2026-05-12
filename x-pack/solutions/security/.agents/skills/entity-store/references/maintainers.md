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

## Built-in Maintainers

| `id` | Interval | License | Purpose |
|---|---|---|---|
| `automated-resolution` | 5m | Enterprise | Resolves entity aliases to canonical targets (resolution graph). |
| `ki-relationships` | 5m | Enterprise | Stamps `entity.relationships.*` on KI-extracted entities from cross-stream features. |
| `ki-promotion` | 15m | Enterprise | Re-types Streams-derived `generic` KI entities into `host` / `service` engines when the underlying KI feature confidence and identifier shape allow. See note below. |

### `ki-promotion` — semantics and safety rails

The maintainer is **opt-in** and a no-op until both of these are set on the global state SO:

- `knowledgeIndicators.promoteToTypedThreshold: number` — minimum KI feature confidence to promote (must be `>= entityMinConfidence`)
- `knowledgeIndicators.promotedEntityTypes: Array<'host' | 'service'>` — engine allow-list

Promotion gates (all must pass; failures are counted but never throw):

- The entity must be in the `generic` engine and carry an `entity.source` tag of the form `stream:<streamName>:<subtype>`.
- The matching KI feature for that lineage must have `confidence >= promoteToTypedThreshold`.
- `entity.type` must map to an enabled target engine (`Service` → `service`, `Host` → `host`). `Identity` and pass-through subtypes like `database` are ignored.
- The doc must have the engine's ECS identity field populated (`host.id` for host, `service.name` for service).
- The KI feature's `properties.<grouping_field>` must match one of the ECS identity fields above.

On promotion the maintainer:

- Re-computes the EUID with `getEuidFromObject(targetEngine, flattenedDoc)` and writes a new doc at the new `_id`.
- Sets `entity.confidence: 'low'` and `entity.previous_id: <oldEntityId>` so the relationship to the original generic doc is traceable.
- Switches `entity.EngineMetadata.Type` to the target engine.

On demotion (when a previously-promoted entity no longer satisfies the gates):

- Restores `entity.EngineMetadata.Type: 'generic'`, clears `entity.confidence` and `entity.previous_id`, and re-keys the doc back to the original EUID.

Failures from `bulkUpdateEntityDocs` are logged at `warn` level and counted in `bulkUpdateErrors`; the run continues so a partial failure does not stall promotion of unrelated entities.
