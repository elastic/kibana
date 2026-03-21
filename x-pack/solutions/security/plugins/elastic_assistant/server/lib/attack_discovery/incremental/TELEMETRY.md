# Incremental Attack Discovery Telemetry

## Overview

This document describes the telemetry events captured by the incremental Attack Discovery implementation.

## Events

### 1. `incremental_attack_discovery_completed`

Fired when incremental AD successfully completes.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `'delta' \| 'progressive'` | Processing mode used |
| `totalRounds` | `number` | Total rounds executed |
| `totalAlertsProcessed` | `number` | Total alerts processed across all rounds |
| `deltaSize` | `number?` | Number of NEW alerts (delta mode only) |
| `durationMs` | `number` | Total execution time in milliseconds |
| `avgRoundDurationMs` | `number` | Average duration per round |
| `avgAlertsPerRound` | `number` | Average alerts processed per round |
| `totalInsights` | `number` | Total insights generated (after merging) |
| `avgInsightsPerRound` | `number` | Average insights generated per round |
| `mergedInsightCount` | `number` | Number of insights merged (deduplication) |
| `contextBudgetPerRound` | `number` | Estimated tokens per round |
| `modelId` | `string?` | LLM model identifier |
| `success` | `boolean` | Always `true` for this event |

**Example:**

```json
{
  "mode": "delta",
  "totalRounds": 2,
  "totalAlertsProcessed": 75,
  "deltaSize": 75,
  "durationMs": 45000,
  "avgRoundDurationMs": 22500,
  "avgAlertsPerRound": 37.5,
  "totalInsights": 5,
  "avgInsightsPerRound": 2.5,
  "mergedInsightCount": 1,
  "contextBudgetPerRound": 4250,
  "modelId": "qwen-2.5-7b",
  "success": true
}
```

### 2. `incremental_attack_discovery_failed`

Fired when incremental AD encounters an error.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `'delta' \| 'progressive'` | Processing mode attempted |
| `modelId` | `string?` | LLM model identifier |
| `success` | `boolean` | Always `false` for this event |
| `errorMessage` | `string` | Error message |
| `errorStack` | `string?` | Stack trace (for debugging) |

**Example:**

```json
{
  "mode": "progressive",
  "modelId": "llama-3.1-8b",
  "success": false,
  "errorMessage": "Elasticsearch connection timeout",
  "errorStack": "Error: Elasticsearch connection timeout\n  at ..."
}
```

### 3. `incremental_attack_discovery_round`

Fired after each round completes (for detailed monitoring).

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `roundNumber` | `number` | Round number (1-indexed) |
| `alertsProcessed` | `number` | Alerts processed in this round |
| `insightsGenerated` | `number` | Insights generated in this round |
| `insightsMerged` | `number` | Insights merged in this round |
| `durationMs` | `number` | Round execution time |
| `mode` | `'delta' \| 'progressive'` | Processing mode |
| `sessionId` | `string` | Session identifier |

**Example:**

```json
{
  "roundNumber": 1,
  "alertsProcessed": 50,
  "insightsGenerated": 3,
  "insightsMerged": 0,
  "durationMs": 22000,
  "mode": "progressive",
  "sessionId": "ad-session-1710951234567"
}
```

## Usage

### In Route Handler

```typescript
import { reportIncrementalADTelemetry, reportIncrementalADFailure } from '../../lib/attack_discovery/incremental/telemetry';

try {
  const result = await incrementalAttackDiscovery({
    // ... params ...
  });

  // Report success telemetry
  reportIncrementalADTelemetry({
    telemetry,
    logger,
    result,
    modelId: apiConfig.model,
  });

  return result;
} catch (error) {
  // Report failure telemetry
  reportIncrementalADFailure({
    telemetry,
    logger,
    mode: incrementalMode,
    error: error as Error,
    modelId: apiConfig.model,
  });

  throw error;
}
```

### In Incremental AD Implementation

For per-round tracking (optional):

```typescript
import { reportRoundTelemetry } from './telemetry';

for (const round of rounds) {
  // ... process round ...

  reportRoundTelemetry({
    telemetry,
    logger,
    roundNumber: round.roundNumber,
    alertsProcessed: round.alertsProcessed.length,
    insightsGenerated: round.insightsGenerated,
    insightsMerged: round.insightsMerged,
    durationMs: round.durationMs,
    mode,
    sessionId,
  });
}
```

## Metrics to Monitor

### Key Performance Indicators (KPIs)

1. **Delta Efficiency**
   - Metric: `deltaSize / totalAlertsAvailable`
   - Target: <20% (most alerts already processed)
   - Indicates effective continuous monitoring

2. **Context Budget**
   - Metric: `contextBudgetPerRound`
   - Target: <8000 tokens (fits in small model context)
   - Ensures OSS model compatibility

3. **Round Throughput**
   - Metric: `totalAlertsProcessed / totalRounds`
   - Target: ~50 alerts/round
   - Validates configuration tuning

4. **Merge Efficiency**
   - Metric: `mergedInsightCount / (totalInsights + mergedInsightCount)`
   - Target: 10-30% (good deduplication without over-merging)
   - Indicates effective insight merging

5. **Processing Speed**
   - Metric: `avgRoundDurationMs`
   - Target: <30s per round
   - Ensures acceptable latency

### Dashboards

Create Kibana dashboards to visualize:

1. **Delta vs Progressive Adoption**
   - Line chart: mode distribution over time
   - Goal: Track incremental adoption

2. **Context Budget Trends**
   - Line chart: contextBudgetPerRound over time
   - Goal: Ensure staying under 8K token limit

3. **Failure Rate**
   - Line chart: success rate by mode and model
   - Goal: Identify problematic configurations

4. **Performance by Model**
   - Bar chart: avgRoundDurationMs by modelId
   - Goal: Compare model performance

## Alerts

### Context Budget Exceeded

```
Alert: Context budget exceeds 8K tokens
Condition: contextBudgetPerRound > 8000
Action: Notify team, investigate alertsPerRound configuration
```

### High Failure Rate

```
Alert: Incremental AD failure rate > 5%
Condition: (failed_events / total_events) > 0.05
Action: Investigate error messages, check model availability
```

### Delta Mode Inefficiency

```
Alert: Delta size consistently high (>80%)
Condition: deltaSize / size > 0.8 for 5+ consecutive runs
Action: Check if schedule is too infrequent or alerts are resetting
```

## Telemetry Schema Registration

Register telemetry events in the Elastic Assistant plugin:

```typescript
// x-pack/solutions/security/plugins/elastic_assistant/server/telemetry.ts

export const telemetryEvents = [
  {
    eventType: 'incremental_attack_discovery_completed',
    schema: {
      mode: { type: 'keyword' },
      totalRounds: { type: 'long' },
      totalAlertsProcessed: { type: 'long' },
      deltaSize: { type: 'long' },
      durationMs: { type: 'long' },
      avgRoundDurationMs: { type: 'float' },
      avgAlertsPerRound: { type: 'float' },
      totalInsights: { type: 'long' },
      avgInsightsPerRound: { type: 'float' },
      mergedInsightCount: { type: 'long' },
      contextBudgetPerRound: { type: 'long' },
      modelId: { type: 'keyword' },
      success: { type: 'boolean' },
    },
  },
  {
    eventType: 'incremental_attack_discovery_failed',
    schema: {
      mode: { type: 'keyword' },
      modelId: { type: 'keyword' },
      success: { type: 'boolean' },
      errorMessage: { type: 'text' },
      errorStack: { type: 'text' },
    },
  },
  {
    eventType: 'incremental_attack_discovery_round',
    schema: {
      roundNumber: { type: 'long' },
      alertsProcessed: { type: 'long' },
      insightsGenerated: { type: 'long' },
      insightsMerged: { type: 'long' },
      durationMs: { type: 'long' },
      mode: { type: 'keyword' },
      sessionId: { type: 'keyword' },
    },
  },
];
```

## Privacy Considerations

- ✅ No PII or alert content is captured
- ✅ Only aggregate statistics and metadata
- ✅ Session IDs are ephemeral (not user identifiers)
- ✅ Error messages are sanitized (no alert details)

## References

- Implementation: `./telemetry.ts`
- Integration guide: `./INTEGRATION.md`
- Example usage: `../../routes/attack_discovery/helpers/report_attack_discovery_success_telemetry.ts`
