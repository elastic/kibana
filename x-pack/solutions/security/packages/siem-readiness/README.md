# @kbn/siem-readiness

This package provides SIEM readiness functionality for the Kibana Security Solution.

## Overview

The SIEM readiness package helps assess and ensure that the Security Information and Event Management (SIEM) components are properly configured and ready for use within Kibana.

## Structure

- `src/types.ts` - TypeScript type definitions
- `src/constants.ts` - Package constants and configuration
- `src/log_readiness_task.ts` - Function to log readiness tasks to Elasticsearch
- `index.ts` - Main entry point

## Usage

```typescript
import { 
  logReadinessTask, 
  SiemReadinessTask, 
  SIEM_READINESS_INDEX 
} from '@kbn/siem-readiness';

// Example usage
const task: SiemReadinessTask = {
  task_id: 'my-task-1',
  status: 'complete',
  meta: {
    description: 'Checked security rules',
    rulesCount: 42,
    duration: 1500
  }
};

// Log to Elasticsearch (requires ES client)
await logReadinessTask(esClient, task);
```

## API

### `logReadinessTask(esClient, task)`

Logs a SIEM readiness task to the `security_solution-siem_readiness` Elasticsearch index.

**Parameters:**
- `esClient`: Elasticsearch client instance from `@kbn/core/server`
- `task`: Object with `task_id` (string), `status` ('complete' | 'incomplete'), and `meta` (object)

**Returns:** Promise that resolves when the task is logged

## Development

This is a private package within the Kibana monorepo. It follows the standard Kibana package conventions and structure.
