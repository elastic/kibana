# Analyze Latency Bottlenecks Tool

## Overview

This tool analyzes a service's latency bottlenecks by examining transaction groups, downstream dependencies, and performance metrics to identify root causes of high latency.

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceName` | string | Yes | The APM service name to analyze |
| `serviceEnvironment` | string | No | Environment filter (e.g., "production", "staging") |
| `transactionType` | string | No | Transaction type filter (e.g., "request", "page-load") |
| `start` | string | Yes | Start time using Elasticsearch date math (e.g., "now-24h") |
| `end` | string | Yes | End time using Elasticsearch date math (e.g., "now") |

## Output Structure

```typescript
interface LatencyBottleneckAnalysis {
  serviceName: string;
  timeRange: { start: string; end: string };
  summary: {
    totalTransactions: number;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
    totalThroughputPerMin: number;
    overallFailureRate: number;
  };
  transactionBottlenecks: TransactionBottleneck[];
  dependencyBottlenecks: DependencyBottleneck[];
  insights: LatencyBottleneckInsight[];
}
```

### Transaction Bottleneck

```typescript
interface TransactionBottleneck {
  name: string;
  transactionType: string;
  latencyMs: number | null;
  throughputPerMin: number;
  failureRate: number;
  impactPercent: number;  // % of total service time
}
```

### Dependency Bottleneck

```typescript
interface DependencyBottleneck {
  resource: string;
  spanType?: string;
  spanSubtype?: string;
  latencyMs: number | null;
  throughputPerMin: number;
  failureRate: number;
  impactPercent: number;  // % of total dependency call time
}
```

### Insights

The tool automatically generates actionable insights based on detected patterns:

- **Slowest Transaction**: Identifies transactions with highest average latency (>1s)
- **Highest Impact Transaction**: Identifies transactions consuming most total time
- **Slow Dependencies**: Identifies external calls with high latency (>500ms)
- **High Error Rate**: Identifies transactions with elevated failure rates (>5%)

Each insight includes:
- Severity level (critical, warning, info)
- Description of the issue
- Relevant metric
- Actionable recommendation

## Example Usage

### Basic Analysis

```json
{
  "serviceName": "frontend-api",
  "start": "now-1h",
  "end": "now"
}
```

### Environment-Specific Analysis

```json
{
  "serviceName": "payment-service",
  "serviceEnvironment": "production",
  "start": "now-24h",
  "end": "now"
}
```

### Transaction Type Filtered

```json
{
  "serviceName": "checkout-service",
  "transactionType": "request",
  "start": "now-6h",
  "end": "now"
}
```

## Workflow Integration

1. **Identify Problem Service**: Use `get_services` tool to find services with latency issues
2. **Analyze Bottlenecks**: Use this tool to identify specific bottlenecks
3. **Drill Down**: Use `get_trace_metrics` to investigate specific transactions or hosts

## Insight Severity Levels

| Severity | Latency Threshold | Error Rate Threshold |
|----------|-------------------|---------------------|
| Critical | >5000ms or >2000ms (deps) | >20% |
| Warning | >2000ms or >1000ms (deps) | >10% |
| Info | >1000ms or >500ms (deps) | >5% |

## Performance Considerations

- Analyzes up to 50 transaction groups
- Analyzes up to 25 downstream dependencies
- Returns top 10 of each in the response
- Uses optimized aggregations on metric documents when available
