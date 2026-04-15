# get_trace_change_points

Detects statistically significant changes (e.g., "spike", "dip", "trend_change", "step_change", "distribution_change", "non_stationary", "stationary", or "indeterminable") in trace metrics (latency, throughput, and failure rate). Returns the top 25 most significant change points ordered by p-value.

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

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "latencyType": "p95"
  }
}
```

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_trace_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "groupBy": "transaction.name"
  }
}
```
