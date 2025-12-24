# get_log_change_points

Analyzes logs to detect statistically significant changes like "dip", "spike", "distribution_change", "non_stationary", "stationary", "step_change" "trend_change" or "indeterminable" change points. Returns the top 25 most significant change points ordered by p-value.

## Parameters

- **start**: Required datemath range start, e.g. `now-1h`.
- **end**: Required datemath range end, e.g. `now`.
- **index**: Optional index or pattern. If omitted, the tool uses discovered Observability log indices.
- **kqlFilter**: Optional KQL filter to narrow logs, e.g. `log.level: error`.
- **messageField**: Optional text field to categorize (default: `message`). Use a field present in your data.

## Response

Returns an array of the most significant change points ordered by statistical significance (p-value). Each change point includes:

- **key**: Pattern identifier for the log message group
- **pattern**: Regex pattern matching the log messages
- **message**: Human-readable description of the detected change
- **timeSeries**: Array of `{x, y}` points showing the metric values over time (x = timestamp, y = count)
- **changes**: Object with change details:
  - **time**: ISO timestamp when the change occurred
  - **type**: Change type (`spike`, `dip`, `trend_change`, `step_change`, `distribution_change`, `indeterminable`, `non_stationary`, or `stationary`)
  - **p_value**: Statistical significance (lower = more significant)
  - **change_point**: Index position in the time series where the change was detected

```json
{
  "results": [
    {
      "type": "other",
      "data": {
        "changePoints": [
          {
            "key": "index_not_found_exception",
            "pattern": ".*?index_not_found_exception.*?",
            "message": "A significant spike (transient increase) was detected for the time range 2025-12-24T08:04:00.000Z to 2025-12-24T08:59:00.000Z at 2025-12-24T08:29:00.000Z (p_value: 0.00004714748796375012).",
            "timeSeries": [
              {
                "x": 1766563440000,
                "y": 2
              },
              {
                "x": 1766563500000,
                "y": 0
              },
              ...
            ],
            "changes": {
              "time": "2025-12-24T08:29:00.000Z",
              "type": "spike",
              "p_value": 0.00004714748796375012,
              "change_point": 25
            }
          },
          {
            "key": "resource_not_found_exception",
            "pattern": ".*?resource_not_found_exception.*?",
            "message": "No change points were found for the time range 2025-12-24T08:27:24.000Z to 2025-12-24T08:30:49.000Z. The data is stationary (stable).",
            "changes": {
              "type": "stationary"
            }
          }
        ]
      },
      "tool_result_id": "hz5l9S"
    }
  ]
}
```

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
