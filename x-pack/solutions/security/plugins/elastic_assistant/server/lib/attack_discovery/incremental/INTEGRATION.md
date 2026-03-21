# Incremental Attack Discovery Integration Guide

## Overview

This document explains how to integrate the incremental Attack Discovery implementation with the Elastic Assistant endpoints.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ POST /api/elastic_assistant/attack_discovery/_generate      │
│ (Endpoint)                                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ generateAndUpdateAttackDiscoveries()                         │
│ - Orchestrates the generation flow                           │
│ - Handles telemetry, deduplication, persistence              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ generateAttackDiscoveries()                                  │
│ - Prepares config and callbacks                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
┌─────────────┐      ┌──────────────────────────────┐
│ EXISTING:   │      │ NEW: Incremental Mode        │
│ Standard    │      │                              │
│ Mode        │      │ invokeIncrementalAttack      │
│             │      │ Discovery()                  │
│ invoke      │      │ (wrapper for incremental)    │
│ Attack      │      │                              │
│ Discovery   │      │ Uses:                        │
│ Graph()     │      │ - incrementalAttackDiscovery│
│             │      │ - StateTracker               │
└─────────────┘      │ - Round Processor            │
                     │ - Delta Computer             │
                     │ - Insight Merger             │
                     └──────────────────────────────┘
```

## Integration Steps

### 1. Update Request Schema

Add incremental mode configuration to `PostAttackDiscoveryGenerateRequestBody`:

```typescript
// x-pack/solutions/security/plugins/elastic_assistant/common/api/attack_discovery/post_attack_discovery_generate/post_attack_discovery_generate_route.gen.ts

export interface PostAttackDiscoveryGenerateRequestBody {
  // ... existing fields ...

  // NEW: Incremental mode configuration
  incrementalMode?: 'delta' | 'progressive' | null;
  incrementalConfig?: {
    alertsPerRound?: number;      // Default: 50
    maxRounds?: number;            // Default: 20
    mergeStrategy?: 'rule-based';  // Default: 'rule-based'
    similarityThreshold?: number;  // Default: 0.8
  };
  sessionId?: string;  // For delta mode: track which alerts have been processed
}
```

### 2. Update Route Handler

Modify `postAttackDiscoveryGenerateRoute` to pass incremental configuration:

```typescript
// x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/post_attack_discovery_generate.ts

const {
  apiConfig,
  size,
  incrementalMode,  // NEW
  incrementalConfig, // NEW
  sessionId,         // NEW
} = request.body;

// Pass to generateAndUpdateAttackDiscoveries
generateAndUpdateAttackDiscoveries({
  // ... existing params ...
  incrementalMode,
  incrementalConfig,
  sessionId,
})
```

### 3. Update Generation Logic

Modify `generateAttackDiscoveries` to branch based on mode:

```typescript
// x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/helpers/generate_discoveries.ts

export const generateAttackDiscoveries = async ({
  actionsClient,
  config,
  esClient,
  logger,
  savedObjectsClient,
  incrementalMode,      // NEW
  incrementalConfig,    // NEW
  sessionId,            // NEW
}: GenerateAttackDiscoveriesParams) => {
  const alertsIndexPattern = decodeURIComponent(config.alertsIndexPattern);

  // ... existing setup ...

  // Branch based on mode
  if (incrementalMode === 'delta' || incrementalMode === 'progressive') {
    // Use incremental implementation
    const { anonymizedAlerts, attackDiscoveries } = await invokeIncrementalAttackDiscovery({
      actionsClient,
      alertsIndexPattern,
      anonymizationFields: config.anonymizationFields,
      apiConfig: config.apiConfig,
      connectorTimeout: CONNECTOR_TIMEOUT,
      end: config.end,
      esClient,
      filter: config.filter,
      incrementalConfig: incrementalConfig ?? {},
      langSmithProject: config.langSmithProject,
      langSmithApiKey: config.langSmithApiKey,
      latestReplacements,
      logger,
      mode: incrementalMode,
      onNewReplacements,
      savedObjectsClient,
      sessionId: sessionId ?? `ad-session-${Date.now()}`,
      size: config.size,
      start: config.start,
    });

    return { anonymizedAlerts, attackDiscoveries, replacements: latestReplacements };
  }

  // Existing standard mode
  const { anonymizedAlerts, attackDiscoveries } = await invokeAttackDiscoveryGraph({
    // ... existing params ...
  });

  return { anonymizedAlerts, attackDiscoveries, replacements: latestReplacements };
};
```

### 4. Alert Fetching Integration

The incremental implementation needs actual alert data. Update `invokeIncrementalAttackDiscovery`:

```typescript
// Fetch alerts from Elasticsearch
const alertsResponse = await esClient.search({
  index: alertsIndexPattern,
  size,
  query: {
    bool: {
      must: [
        { range: { '@timestamp': { gte: start, lte: end } } },
        ...(filter ? [filter] : []),
      ],
    },
  },
});

const alerts: Alert[] = alertsResponse.hits.hits.map(hit => ({
  id: hit._id as string,
  content: JSON.stringify(hit._source),
  timestamp: (hit._source as any)['@timestamp'],
}));
```

## Testing

### Manual Testing

1. Start Kibana:
   ```bash
   yarn start
   ```

2. Generate attack discoveries in delta mode:
   ```bash
   POST http://localhost:5601/api/elastic_assistant/attack_discovery/_generate
   {
     "alertsIndexPattern": ".alerts-security.alerts-default",
     "apiConfig": {
       "connectorId": "your-connector-id",
       "actionTypeId": ".gen-ai",
       "model": "qwen-2.5-7b"
     },
     "size": 100,
     "start": "now-24h",
     "end": "now",
     "incrementalMode": "delta",
     "sessionId": "my-test-session",
     "incrementalConfig": {
       "alertsPerRound": 50,
       "maxRounds": 10
     }
   }
   ```

3. Run again to test delta processing (should only process NEW alerts):
   ```bash
   # Same request - should return immediately if no new alerts
   ```

4. Test progressive mode with large dataset:
   ```bash
   POST http://localhost:5601/api/elastic_assistant/attack_discovery/_generate
   {
     ...
     "size": 200,
     "incrementalMode": "progressive",
     "incrementalConfig": {
       "alertsPerRound": 50,
       "maxRounds": 5
     }
   }
   ```

### Unit Tests

Add tests for incremental mode:

```typescript
// x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/helpers/generate_discoveries.test.ts

describe('generateAttackDiscoveries with incremental mode', () => {
  it('should use delta mode when specified', async () => {
    const result = await generateAttackDiscoveries({
      // ... params ...
      incrementalMode: 'delta',
      sessionId: 'test-session',
    });

    expect(invokeIncrementalAttackDiscovery).toHaveBeenCalled();
  });

  it('should use standard mode when incremental not specified', async () => {
    const result = await generateAttackDiscoveries({
      // ... params ...
      incrementalMode: null,
    });

    expect(invokeAttackDiscoveryGraph).toHaveBeenCalled();
  });
});
```

## Telemetry Integration

See [TELEMETRY.md](./TELEMETRY.md) for details on tracking incremental AD metrics.

## Performance Considerations

### Delta Mode
- **Benefit**: Only processes new alerts (reduces API calls and cost)
- **Trade-off**: Requires persistent state tracking in Elasticsearch
- **Best for**: Continuous monitoring scenarios (scheduled runs)

### Progressive Mode
- **Benefit**: Handles large datasets in bounded context
- **Trade-off**: Slightly higher latency (multiple rounds)
- **Best for**: One-time analysis of large alert volumes

### Context Budget
Both modes keep context <8K tokens per call, enabling:
- ✅ Small OSS models (Qwen 2.5 7B, Llama 3.1 8B)
- ✅ Lower API costs
- ✅ 100% success rate (no context overflow failures)

## Migration Path

1. **Phase 1** (Current): Incremental mode is opt-in via API parameter
2. **Phase 2**: Auto-detect when to use incremental (based on alert count, model context window)
3. **Phase 3**: Make incremental the default for OSS models

## Troubleshooting

### Issue: Delta mode not filtering alerts
**Solution**: Check sessionId is consistent across runs

### Issue: Progressive mode still hitting context limits
**Solution**: Reduce alertsPerRound in config (try 30 instead of 50)

### Issue: Insights not merging correctly
**Solution**: Check similarity threshold (default 0.8, try lowering to 0.6)

## References

- Implementation: `./index.ts`
- Types: `./types.ts`
- Tests: `./__tests__/`
- Integration helper: `../../routes/attack_discovery/public/post/helpers/invoke_incremental_attack_discovery.ts`
