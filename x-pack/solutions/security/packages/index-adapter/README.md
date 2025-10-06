# @kbn/index-adapter

Utility library for Elasticsearch index management.

## IndexAdapter

Manage single index. Example:

```
// Setup
const indexAdapter = new IndexAdapter('my-awesome-index', { kibanaVersion: '8.12.1' });

indexAdapter.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

indexAdapter.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
});

// Start
await indexAdapter.install({ logger, esClient, pluginStop$ }); // Installs templates and the 'my-awesome-index' index, or updates existing.
```


## IndexPatternAdapter

Manage index patterns. Example:

```
// Setup
const indexPatternAdapter = new IndexPatternAdapter('my-awesome-index', { kibanaVersion: '8.12.1' });

indexPatternAdapter.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

indexPatternAdapter.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
});

// Start
indexPatternAdapter.install({ logger, esClient, pluginStop$ }); // Installs/updates templates for the index pattern 'my-awesome-index-*', and updates mappings of all specific indices

// Create a specific index on the fly
await indexPatternAdapter.installIndex('12345'); // creates 'my-awesome-index-12345' index if it does not exist.
```

## Reindexing Support

Enhanced functionality for handling mapping updates that require reindexing documents.

### Updating Indices with Reindexing

```typescript
import { updateIndices, createOrUpdateIndex } from '@kbn/index-adapter';

// Update indices with automatic reindexing
await updateIndices({
  esClient,
  logger,
  name: 'security-alerts-*',
  totalFieldsLimit: 1000,
  writeIndexOnly: false,
  enableReindexing: true,    // Reindexes documents with new mappings
});

// Create or update with reindexing enabled
await createOrUpdateIndex({
  esClient,
  logger,
  name: 'security-alerts-000001',
  totalFieldsLimit: 1000,
  enableReindexing: true,
});
```

### Manual Reindexing

```typescript
import { reindexIndexDocuments } from '@kbn/index-adapter';

// Manual reindexing for standalone indices
await reindexIndexDocuments({
  esClient,
  logger,
  indexName: 'security-alerts-000001',
  batchSize: 1000,
  timeout: '10m',
});
```

### Use Cases

This functionality is particularly useful for:

- **Semantic Text Updates**: Updating `inference_id` properties in `semantic_text` fields
- **Schema Evolution**: Safely applying new mappings to existing documents
- **Index Migration**: Moving to new index structures with updated mappings
- **Field Type Changes**: Updating field types that require document reprocessing

### Features

- **Atomic reindexing** with temporary index creation and swapping
- **Alias preservation** during index transitions
- **Error handling** with automatic cleanup and rollback
- **Task monitoring** with progress tracking and failure detection
- **Zero-downtime** operations using index aliases

For detailed documentation and examples, see the [Data Stream Adapter documentation](../data-stream-adapter/REINDEX_ROLLOVER.md) which covers similar concepts for data streams.
