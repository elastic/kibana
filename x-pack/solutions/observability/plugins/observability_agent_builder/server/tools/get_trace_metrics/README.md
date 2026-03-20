# get_trace_metrics

Retrieves trace metrics (Rate, Errors, Duration) for APM data with flexible filtering and grouping. This tool is designed for drilling down into performance issues after identifying an unhealthy service.

## Trace Metrics

- **Rate (throughput)**: requests per minute
- **Errors (failure rate)**: percentage of failed transactions (0-1)
- **Duration (latency)**: average response time in milliseconds

## When to use

- After identifying an unhealthy service with `get_services`, use this tool to drill down and find the root cause
- Analyze which specific transactions, hosts, or containers are causing performance issues
- Compare trace metrics across different dimensions (e.g.: by transaction name, host, region)
- Investigate performance by service version during deployments

## Examples

### Get trace metrics grouped by service (default)

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-1h",
    "end": "now"
  }
}
```

#### Example: Specify latencyType (p95)

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "latencyType": "p95"
  }
}
```

#### Example: Specify sortBy (failureRate)

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "sortBy": "failureRate"
  }
}
```

### Drill down by transaction name for a specific service

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: \"frontend\"",
    "groupBy": "transaction.name"
  }
}
```

### Analyze performance by host

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-30m",
    "end": "now",
    "kqlFilter": "service.name: \"checkout-service\"",
    "groupBy": "host.name"
  }
}
```

### Compare performance across service versions

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-2h",
    "end": "now",
    "kqlFilter": "service.name: \"payment-api\"",
    "groupBy": "service.version"
  }
}
```

### Filter by transaction type

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "transaction.type: \"request\"",
    "groupBy": "service.name"
  }
}
```

### Analyze specific transaction across containers

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-15m",
    "end": "now",
    "kqlFilter": "service.name: \"frontend\" AND transaction.name: \"POST /api/cart\"",
    "groupBy": "container.id"
  }
}
```

### Identify problematic Kubernetes pods

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: \"frontend\"",
    "groupBy": "kubernetes.pod.name"
  }
}
```

### Analyze by cloud region

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_metrics",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: \"api-gateway\"",
    "groupBy": "cloud.region"
  }
}
```
