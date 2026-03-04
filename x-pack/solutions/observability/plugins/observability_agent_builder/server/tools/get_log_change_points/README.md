# get_log_change_points

Analyzes logs to detect statistically significant changes like "dip", "spike", "distribution_change", "non_stationary", "stationary", "step_change" "trend_change" or "indeterminable" change points. Returns the top 25 most significant change points ordered by p-value.


## Examples

### Basic time range

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
  }
}
```

### With index pattern

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "index": "logs-*"
  }
}
```

### With KQL filter

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "log.level: info"
  }
}
```

### With message field override

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "messageField": "message"
  }
}
```
