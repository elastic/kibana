# get_metric_change_points

Analyzes metrics to detect statistically significant changes like "dip", "spike", "distribution_change", "non_stationary", "stationary", "step_change" "trend_change" or "indeterminable" change points. Returns the top 25 most significant change points ordered by p-value.


## Examples

### Basic time range

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_metric_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now"
  }
}
```

### With index pattern

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_metric_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "index": "metrics-*"
  }
}
```

### With aggregation

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_metric_change_points",
  "tool_params": {
    "start": "now-5d",
    "end": "now",
    "index": "metrics-*",
    "aggregation": {
        "field": "system.memory.actual.free",
        "type": "avg"
    }
  }
}
```

### With groupBy fields

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_metric_change_points",
  "tool_params": {
    "start": "now-5d",
    "end": "now",
    "index": "metrics-*",
    "groupBy": ["service.name", "service.environment"]
  }
}
```

### With KQL filter

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_metric_change_points",
  "tool_params": {
    "start": "now-5d",
    "end": "now",
    "kqlFilter": "service.environment:development"
  }
}
```
