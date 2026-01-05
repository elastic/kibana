# get_trace_change_points

Detects statistically significant changes (e.g., "spike", "dip", "trend_change", "step_change", "distribution_change", "non_stationary", "stationary", or "indeterminable") in trace data over time. Returns the top 25 most significant change points ordered by p-value.

## Examples

### Basic time range

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now"
  }
}
```

### With explicit index pattern

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "index": "index-example-*"
  }
}
```

### With custom aggregation (span latency p99)

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_change_points",
  "tool_params": {
    "start": "now-24h",
    "end": "now",
    "aggregation": {
      "field": "span.duration.us",
      "type": "p99"
    }
  }
}
```

### With groupBy fields

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_change_points",
  "tool_params": {
    "start": "now-24h",
    "end": "now",
    "groupBy": ["service.name", "service.environment"]
  }
}
```

### With KQL filter

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_change_points",
  "tool_params": {
    "start": "now-24h",
    "end": "now",
    "kqlFilter": "service.name:my-service AND transaction.type:request"
  }
}
```
