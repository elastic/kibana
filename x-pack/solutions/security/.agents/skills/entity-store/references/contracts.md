# Entity Store Plugin Contracts

## Setup Contract

```typescript
interface EntityStoreSetupContract {
  registerEntityMaintainer: (config: RegisterEntityMaintainerConfig) => void;
}
```

## Start Contract

```typescript
interface EntityStoreStartContract {
  createCRUDClient: (esClient: ElasticsearchClient, namespace: string) => EntityStoreCRUDClient; // Exposes create + update only
  createResolutionClient: (esClient: ElasticsearchClient, namespace: string) => ResolutionClient;
}
```

## Request Handler Context

All route handlers receive this context (from `server/types.ts`):

```typescript
interface EntityStoreApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  logger: Logger;
  assetManagerClient: AssetManagerClient;         // Engine lifecycle
  entityMaintainersClient: EntityMaintainersClient; // Maintainer management
  crudClient: CRUDClient;                         // Entity CRUD operations
  resolutionClient: ResolutionClient;             // Link/unlink/group
  ccsLogsExtractionClient: CcsLogsExtractionClient; // Cross-cluster extraction
  logsExtractionClient: LogsExtractionClient;     // Standard logs extraction
  historySnapshotClient: HistorySnapshotClient;   // History snapshots
  featureFlags: FeatureFlags;
  security: SecurityPluginStart;
  namespace: string;
}
```

## Index Naming

- **Latest**: `.entities.v2.latest.security_{namespace}` (single-shard, `mode: 'lookup'`)
- **Updates**: `.entities.v2.updates.security_{namespace}` (data stream)

## Key Fields

- `entity.source` — **array of strings**. Priority cascade: `event.module` > `event.dataset` > `data_stream.dataset`
- `entity.namespace` — from `event.module` (e.g., `'okta'`, `'active_directory'`, `'local'`)
- `entity.EngineMetadata.Type` — entity type discriminator on shared index
- `entity.relationships.resolution.resolved_to` — alias target (resolution)
- `entity.relationships.resolution.risk.*` — aggregated risk on target entity
