# get_log_change_points

Analyzes logs to detect statistically significant changes like "dip", "spike", "distribution_change", "non_stationary", "step_change" or "trend_change" in specific log patterns, ignoring "indeterminable" and "stationary" change points. Returns the top 25 most significant change points ordered by p-value.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "logs": [
      {
        "name": "Error Logs",
        "index": "logs-*"
      }
    ]
  }
}
```
