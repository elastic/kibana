# @kbn/data-stream-adapter

Utility library for Elasticsearch data stream management.

## DataStreamAdapter

Manage single data streams. Example:

```
// Setup
const dataStream = new DataStreamAdapter('my-awesome-datastream', { kibanaVersion: '8.12.1' });

dataStream.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

dataStream.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
    template: {
        lifecycle: {
            data_retention: '5d',
        },
    },
});

// Start
await dataStream.install({ logger, esClient, pluginStop$ }); // Installs templates and the data stream, or updates existing.
```


## DataStreamSpacesAdapter

Manage data streams per space. Example:

```
// Setup
const spacesDataStream = new DataStreamSpacesAdapter('my-awesome-datastream', { kibanaVersion: '8.12.1' });

spacesDataStream.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

spacesDataStream.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
    template: {
        lifecycle: {
            data_retention: '5d',
        },
    },
});

// Start
await spacesDataStream.install({ logger, esClient, pluginStop$ }); // Installs templates and updates existing data streams.

// Create a space data stream on the fly
await spacesDataStream.installSpace('space2'); // creates 'my-awesome-datastream-space2' data stream if it does not exist.
```

## Rollover and Reindexing Support

Enhanced functionality for handling mapping updates that require reindexing older documents and rollover operations.

### Updating Data Streams with Rollover and Reindexing

```typescript
import { updateDataStreams, createOrUpdateDataStream } from '@kbn/data-stream-adapter';

// Update data stream with automatic rollover and reindexing
await updateDataStreams({
  esClient,
  logger,
  name: 'logs-security-*',
  totalFieldsLimit: 1000,
  writeIndexOnly: true,
  enableRollover: true,      // Triggers rollover after mapping update
  enableReindexing: true,    // Reindexes older documents with new mappings
});

// Create or update with rollover/reindexing enabled
await createOrUpdateDataStream({
  esClient,
  logger,
  name: 'logs-security-default',
  totalFieldsLimit: 1000,
  enableRollover: true,
  enableReindexing: true,
});
```

### Manual Operations

```typescript
import { rolloverDataStream, reindexDataStreamDocuments } from '@kbn/data-stream-adapter';

// Manual rollover
await rolloverDataStream({
  esClient,
  logger,
  dataStreamName: 'logs-security-default',
});

// Manual reindexing of older documents
await reindexDataStreamDocuments({
  esClient,
  logger,
  dataStreamName: 'logs-security-default',
  batchSize: 1000,
  timeout: '10m',
});
```

### Use Cases

This functionality is particularly useful for:

- **Semantic Text Updates**: Updating `inference_id` properties in `semantic_text` fields
- **Mapping Conflicts**: Automatic rollover when mapping updates fail due to conflicts
- **Schema Evolution**: Safely applying new mappings to existing data
- **Performance Optimization**: Ensuring new documents aren't blocked during reindexing

### Features

- **Automatic rollover** after mapping updates to prevent ingestion blocking
- **Selective reindexing** of older backing indices (preserves write index)
- **Error handling** with automatic cleanup and rollback
- **Task monitoring** with progress tracking and failure detection
- **Atomic operations** for data integrity

See [REINDEX_ROLLOVER.md](./REINDEX_ROLLOVER.md) for detailed documentation and examples.
