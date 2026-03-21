# Incremental Attack Discovery API Documentation

## Overview

Incremental Attack Discovery enables processing large alert volumes and continuous monitoring using small-context models (8K-32K tokens) through two modes:

- **Delta Mode**: Process only NEW alerts since the last run (continuous monitoring)
- **Progressive Mode**: Process large datasets in bounded rounds (one-time analysis)

Both modes maintain bounded context (<8K tokens per call), enabling 100% OSS model compatibility.

## API Endpoint

```
POST /api/elastic_assistant/attack_discovery/_generate
```

## Request Body

### Standard Fields (Existing)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alertsIndexPattern` | `string` | Yes | Alert index pattern (e.g., `.alerts-security.alerts-*`) |
| `apiConfig` | `object` | Yes | LLM connector configuration |
| `apiConfig.connectorId` | `string` | Yes | Connector ID |
| `apiConfig.actionTypeId` | `string` | Yes | Action type (e.g., `.gen-ai`) |
| `apiConfig.model` | `string` | No | Model name (e.g., `qwen-2.5-7b`) |
| `size` | `number` | Yes | Maximum alerts to process |
| `start` | `string` | No | Start time (ISO 8601 or ES date math) |
| `end` | `string` | No | End time (ISO 8601 or ES date math) |
| `filter` | `object` | No | Additional Elasticsearch filter |

### Incremental Mode Fields (New)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `incrementalMode` | `'delta' \| 'progressive' \| null` | No | `null` | Processing mode |
| `sessionId` | `string` | No | Auto-generated | Session identifier (required for delta mode) |
| `incrementalConfig` | `object` | No | `{}` | Incremental configuration |
| `incrementalConfig.alertsPerRound` | `number` | No | `50` | Alerts per round (affects context size) |
| `incrementalConfig.maxRounds` | `number` | No | `20` | Maximum rounds to process |
| `incrementalConfig.mergeStrategy` | `'rule-based'` | No | `'rule-based'` | Insight merging strategy |
| `incrementalConfig.similarityThreshold` | `number` | No | `0.8` | Title similarity threshold (0-1) |

## Response Body

### Standard Response (Mode: null or Progressive)

```typescript
{
  "execution_uuid": "string",        // Execution identifier
  "attackDiscoveries": AttackDiscovery[], // Generated insights
  // ... existing fields ...
}
```

### Incremental Response (Delta or Progressive Mode)

```typescript
{
  "execution_uuid": "string",
  "attackDiscoveries": AttackDiscovery[],
  "incrementalStats": {
    "mode": "delta" | "progressive",
    "totalRounds": number,          // Rounds executed
    "totalAlertsProcessed": number, // Total alerts processed
    "deltaSize": number,            // NEW alerts (delta mode only)
    "durationMs": number,           // Total duration
    "rounds": [{                    // Per-round details
      "roundNumber": number,
      "alertsProcessed": string[],  // Alert IDs
      "insightsGenerated": number,
      "insightsMerged": number,
      "durationMs": number
    }]
  }
}
```

## Examples

### 1. Delta Mode (Continuous Monitoring)

**First Run** (processes all alerts):

```bash
POST /api/elastic_assistant/attack_discovery/_generate
Content-Type: application/json

{
  "alertsIndexPattern": ".alerts-security.alerts-default",
  "apiConfig": {
    "connectorId": "my-connector-id",
    "actionTypeId": ".gen-ai",
    "model": "qwen-2.5-7b"
  },
  "size": 100,
  "start": "now-24h",
  "end": "now",
  "incrementalMode": "delta",
  "sessionId": "continuous-monitoring-session-1",
  "incrementalConfig": {
    "alertsPerRound": 50,
    "maxRounds": 10
  }
}
```

**Response**:

```json
{
  "execution_uuid": "abc-123",
  "attackDiscoveries": [
    {
      "title": "SSH Brute Force Attack",
      "summaryMarkdown": "Multiple failed SSH attempts from 1.2.3.4",
      "detailsMarkdown": "...",
      "alertIds": ["alert-1", "alert-2", ...]
    }
  ],
  "incrementalStats": {
    "mode": "delta",
    "totalRounds": 2,
    "totalAlertsProcessed": 100,
    "deltaSize": 100,
    "durationMs": 45000,
    "rounds": [...]
  }
}
```

**Second Run** (30 minutes later, only processes NEW alerts):

```bash
# Same request - only processes alerts created since last run
```

**Response**:

```json
{
  "execution_uuid": "def-456",
  "attackDiscoveries": [
    {
      "title": "SSH Brute Force Attack",
      "summaryMarkdown": "Attack continues from 1.2.3.4 with 15 new attempts",
      "detailsMarkdown": "...",
      "alertIds": ["alert-1", "alert-2", ... "alert-115"]
    }
  ],
  "incrementalStats": {
    "mode": "delta",
    "totalRounds": 1,
    "totalAlertsProcessed": 15,
    "deltaSize": 15,
    "durationMs": 12000,
    "rounds": [...]
  }
}
```

### 2. Progressive Mode (Large Dataset Analysis)

```bash
POST /api/elastic_assistant/attack_discovery/_generate
Content-Type: application/json

{
  "alertsIndexPattern": ".alerts-security.alerts-default",
  "apiConfig": {
    "connectorId": "my-connector-id",
    "actionTypeId": ".gen-ai",
    "model": "llama-3.1-8b"
  },
  "size": 200,
  "start": "now-7d",
  "end": "now",
  "incrementalMode": "progressive",
  "incrementalConfig": {
    "alertsPerRound": 50,
    "maxRounds": 5
  }
}
```

**Response**:

```json
{
  "execution_uuid": "ghi-789",
  "attackDiscoveries": [
    {
      "title": "Multi-Stage Ransomware Attack",
      "summaryMarkdown": "Coordinated attack across 200 alerts",
      "detailsMarkdown": "...",
      "alertIds": ["alert-1", ... "alert-200"]
    }
  ],
  "incrementalStats": {
    "mode": "progressive",
    "totalRounds": 4,
    "totalAlertsProcessed": 200,
    "durationMs": 90000,
    "rounds": [
      {
        "roundNumber": 1,
        "alertsProcessed": ["alert-1", ... "alert-50"],
        "insightsGenerated": 2,
        "insightsMerged": 0,
        "durationMs": 22000
      },
      // ... rounds 2-4 ...
    ]
  }
}
```

### 3. Standard Mode (Backward Compatible)

```bash
POST /api/elastic_assistant/attack_discovery/_generate
Content-Type: application/json

{
  "alertsIndexPattern": ".alerts-security.alerts-default",
  "apiConfig": {
    "connectorId": "my-connector-id",
    "actionTypeId": ".gen-ai",
    "model": "gpt-4o"
  },
  "size": 50,
  "start": "now-1h",
  "end": "now"
  // No incrementalMode - uses standard processing
}
```

## Mode Selection Guide

### When to Use Delta Mode

✅ **Best for:**
- Continuous monitoring scenarios
- Scheduled runs (every 30 minutes, hourly, daily)
- Small-context models (Qwen 2.5 7B, Llama 3.1 8B)
- Cost optimization (only process new alerts)

❌ **Not suitable for:**
- One-time historical analysis
- Alert indexes that reset/rotate frequently
- Scenarios where session state persistence is unreliable

**Configuration Tips:**
- Use a persistent `sessionId` (e.g., `"monitoring-{space-id}"`)
- Set `alertsPerRound` based on alert volume (default 50 works for most)
- Keep `size` high enough to catch all new alerts

### When to Use Progressive Mode

✅ **Best for:**
- One-time analysis of large alert datasets (100+ alerts)
- Small-context models processing >50 alerts
- Scenarios where context overflow is a concern
- Analysis across extended time ranges (7+ days)

❌ **Not suitable for:**
- Small alert counts (<50 alerts) - use standard mode instead
- Real-time/low-latency requirements (adds round overhead)

**Configuration Tips:**
- Set `alertsPerRound` to keep context <8K tokens (~50 alerts)
- Adjust `maxRounds` based on expected alert count
- Monitor `contextBudgetPerRound` telemetry

### When to Use Standard Mode

✅ **Best for:**
- Large-context models (GPT-4, Claude Opus)
- Small alert counts (<50 alerts)
- Single-pass analysis requirements
- Low-latency requirements

## Configuration Tuning

### Context Budget Optimization

**Goal**: Keep context <8K tokens per round

| Alerts/Round | Estimated Tokens | Model Compatibility |
|--------------|------------------|---------------------|
| 30 | ~3.5K | ✅ All models (4K+) |
| 50 | ~5.5K | ✅ Most models (8K+) |
| 75 | ~8K | ⚠️ Models with 16K+ |
| 100 | ~10.5K | ❌ Exceeds small models |

**Formula**: `tokens ≈ (alerts * 100) + 500`

### Performance Tuning

**Latency vs Throughput Trade-off:**

| Config | Latency | Throughput | Use Case |
|--------|---------|------------|----------|
| 30 alerts, 10 rounds | Medium | High | Real-time monitoring |
| 50 alerts, 5 rounds | Low | Medium | Balanced |
| 75 alerts, 3 rounds | Very Low | Low | One-time analysis |

### Similarity Threshold Tuning

Controls insight merging aggressiveness:

| Threshold | Behavior | Result |
|-----------|----------|--------|
| 0.9 | Strict merging | More distinct insights |
| 0.8 | Balanced (default) | Good deduplication |
| 0.6 | Aggressive merging | Fewer, broader insights |

## Error Handling

### Common Errors

**1. Context Overflow**

```json
{
  "error": "Context budget exceeded: 12000 tokens > 8000 limit",
  "statusCode": 400,
  "message": "Reduce alertsPerRound to fit within model context"
}
```

**Solution**: Reduce `incrementalConfig.alertsPerRound`

**2. Session Not Found (Delta Mode)**

```json
{
  "error": "Session state not found for session-id-123",
  "statusCode": 404,
  "message": "Session may have expired or been deleted"
}
```

**Solution**: Use a new `sessionId` to start fresh

**3. Max Rounds Exceeded**

```json
{
  "error": "Max rounds (20) exceeded, 50 alerts remaining unprocessed",
  "statusCode": 400,
  "message": "Increase maxRounds or reduce alert count"
}
```

**Solution**: Increase `incrementalConfig.maxRounds` or reduce `size`

## Monitoring and Observability

### Key Metrics

Monitor via telemetry (see [TELEMETRY.md](./TELEMETRY.md)):

1. **Delta Efficiency**: `deltaSize / size` (target: <20%)
2. **Context Budget**: `contextBudgetPerRound` (target: <8000)
3. **Round Throughput**: `totalAlertsProcessed / totalRounds` (target: ~50)
4. **Merge Rate**: `mergedInsightCount / totalInsights` (target: 10-30%)

### Dashboards

Create visualizations for:
- Mode distribution over time
- Context budget trends
- Failure rate by mode/model
- Performance by model

## Migration from Standard Mode

### Step 1: Test with Progressive Mode

```bash
# Before (standard mode)
{
  "size": 200,
  // ... other params ...
}

# After (progressive mode for testing)
{
  "size": 200,
  "incrementalMode": "progressive",
  "incrementalConfig": {
    "alertsPerRound": 50
  },
  // ... other params ...
}
```

### Step 2: Enable Delta for Continuous Monitoring

```bash
# Scheduled job (every 30 min)
{
  "size": 1000,  // High limit to catch all new alerts
  "incrementalMode": "delta",
  "sessionId": "continuous-monitoring-{space-id}",
  "incrementalConfig": {
    "alertsPerRound": 50,
    "maxRounds": 10
  }
}
```

### Step 3: Monitor Metrics

- Watch `deltaSize` - should be <20% after initial run
- Check `contextBudgetPerRound` - must stay <8K
- Verify insights are coherent (not fragmented)

## Best Practices

### ✅ DO

- Use delta mode for scheduled/continuous monitoring
- Use progressive mode for one-time large dataset analysis
- Set persistent sessionId for delta mode
- Monitor context budget telemetry
- Tune alertsPerRound based on your alert size

### ❌ DON'T

- Don't use delta mode for one-time analysis
- Don't change sessionId between delta runs
- Don't set alertsPerRound >75 for small models
- Don't ignore context budget warnings
- Don't mix modes within the same session

## Support

For issues or questions:
- Implementation: `./index.ts`
- Integration: `./INTEGRATION.md`
- Telemetry: `./TELEMETRY.md`
- Tests: `./__tests__/`
