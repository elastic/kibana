# Reindexing and Rollover Support

This document describes the enhanced functionality in the `@kbn/data-stream-adapter` and `@kbn/index-adapter` packages for handling mapping updates that require reindexing older documents and rollover operations.

## Overview

When updating mappings, especially for `semantic_text` fields with `inference_id` properties, existing documents in older indices may need to be reindexed to apply the new mappings. This functionality provides:

1. **Automatic rollover** after mapping updates to prevent blocking new document ingestion
2. **Reindexing of older documents** to apply new mappings (e.g., updating inference_id)
3. **Comprehensive error handling** for data corruption scenarios
4. **Atomic operations** to ensure data integrity

## Data Stream Adapter

### Basic Usage

```typescript
import { 
  updateDataStreams, 
  createOrUpdateDataStream,
  rolloverDataStream,
  reindexDataStreamDocuments 
} from '@kbn/data-stream-adapter';

// Update data stream with rollover and reindexing
await updateDataStreams({
  esClient,
  logger,
  name: 'logs-*',
  totalFieldsLimit: 1000,
  writeIndexOnly: true,
  enableRollover: true,      // Trigger rollover after mapping update
  enableReindexing: true,    // Reindex older documents with new mappings
});
```

### Manual Operations

```typescript
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

### Error Handling

The system automatically handles mapping conflicts by triggering rollover:

```typescript
// This will automatically rollover if mapping conflicts occur
await createOrUpdateDataStream({
  esClient,
  logger,
  name: 'logs-security-default',
  totalFieldsLimit: 1000,
  enableRollover: true,
  enableReindexing: true,
});
```

## Index Adapter

### Basic Usage

```typescript
import { 
  updateIndices, 
  createOrUpdateIndex,
  reindexIndexDocuments 
} from '@kbn/index-adapter';

// Update index with reindexing
await updateIndices({
  esClient,
  logger,
  name: 'security-*',
  totalFieldsLimit: 1000,
  writeIndexOnly: false,
  enableReindexing: true,    // Reindex documents with new mappings
});
```

### Manual Reindexing

```typescript
// Manual reindexing for standalone indices
await reindexIndexDocuments({
  esClient,
  logger,
  indexName: 'security-alerts-000001',
  batchSize: 1000,
  timeout: '10m',
});
```

## Semantic Text and Inference ID Updates

This functionality is particularly useful when updating `semantic_text` fields with new `inference_id` values:

```typescript
// Example: Update data stream mappings with new inference_id
// The system will:
// 1. Update the mapping on the write index
// 2. Rollover to create a new backing index
// 3. Reindex older documents to apply the new inference_id

await updateDataStreams({
  esClient,
  logger,
  name: 'logs-security-default',
  totalFieldsLimit: 2000,
  writeIndexOnly: true,
  enableRollover: true,
  enableReindexing: true,
});
```

## Monitoring

### Check Active Reindex Tasks

```typescript
import { getActiveReindexTasks } from '@kbn/data-stream-adapter';

const tasks = await getActiveReindexTasks({
  esClient,
  logger,
  dataStreamName: 'logs-security-default',
});

console.log('Active reindex tasks:', tasks);
```

### Task Status

Each task includes:
- `taskId`: Elasticsearch task identifier
- `completed`: Whether the task is finished
- `total`: Total documents to process
- `created`: Documents created
- `updated`: Documents updated
- `batches`: Number of batches processed

## Error Scenarios

### Data Corruption Prevention

- **Atomic operations**: Index swapping uses aliases for atomic transitions
- **Cleanup on failure**: Temporary indices are automatically cleaned up
- **Task monitoring**: Reindex operations are monitored for failures
- **Retry mechanisms**: Uses existing transient error retry logic

### Rollover Triggers

Automatic rollover is triggered for:
- `illegal_argument_exception`
- `mapper_exception` with mapping conflicts
- Subobjects field changes
- Index mode changes

### Failure Modes

1. **Mapping update fails**: System attempts rollover and retries
2. **Rollover fails**: Error is logged and propagated
3. **Reindex task fails**: Cleanup is performed and error is thrown
4. **Task timeout**: After 10 minutes, operation is considered failed

## Configuration Options

### Data Stream Options

- `enableRollover`: Enable automatic rollover after mapping updates
- `enableReindexing`: Enable reindexing of older documents
- `writeIndexOnly`: Only update mappings on write index
- `batchSize`: Documents per reindex batch (default: 1000)
- `timeout`: Maximum time per reindex operation (default: '10m')

### Index Options

- `enableReindexing`: Enable reindexing during mapping updates
- `batchSize`: Documents per reindex batch (default: 1000)
- `timeout`: Maximum time per reindex operation (default: '10m')

## Best Practices

1. **Test in non-production**: Always test mapping changes in development first
2. **Monitor resources**: Reindexing can be resource-intensive
3. **Use batching**: Adjust `batchSize` based on document size and cluster capacity
4. **Set timeouts**: Configure appropriate timeouts for large indices
5. **Check compatibility**: Ensure new mappings are compatible with existing data
6. **Backup data**: Consider backing up critical data before major mapping changes

## Integration Example

```typescript
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { updateDataStreams } from '@kbn/data-stream-adapter';

async function updateSemanticTextInferenceId(
  esClient: ElasticsearchClient,
  logger: Logger,
  dataStreamPattern: string,
  newInferenceId: string
) {
  try {
    logger.info(`Updating inference_id for data streams matching: ${dataStreamPattern}`);
    
    // Update mappings with rollover and reindexing
    await updateDataStreams({
      esClient,
      logger,
      name: dataStreamPattern,
      totalFieldsLimit: 2000,
      writeIndexOnly: true,
      enableRollover: true,
      enableReindexing: true,
    });
    
    logger.info(`Successfully updated inference_id for ${dataStreamPattern}`);
  } catch (error) {
    logger.error(`Failed to update inference_id for ${dataStreamPattern}: ${error.message}`);
    throw error;
  }
}
```

This functionality ensures that mapping updates, particularly for semantic text fields, are applied safely across all documents while maintaining data integrity and minimizing service disruption.