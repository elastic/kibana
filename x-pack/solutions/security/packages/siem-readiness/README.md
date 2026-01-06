# @kbn/siem-readiness

## Overview

The SIEM readiness package helps log readiness events within Kibana.

## Usage

```typescript
import { useLogReadinessTask } from '@kbn/siem-readiness';

// Example usage
  const { logReadinessTask } = useLogReadinessTask();

  const handleLogTask = useCallback(async () => {
    logReadinessTask({ task_id: '1', status: 'complete', meta: { demo: 'demo_data' } });
  }, [logReadinessTask]);
```

## API

The package is using the post_readiness_task API which can be found at: 

`kibana/x-pack/solutions/security/plugins/security_solution/server/lib/siem_readiness/routes/post_readiness_task.ts`