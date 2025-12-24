# get_metric_change_points

Analyzes metrics to detect statistically significant changes like "dip", "spike", "distribution_change", "non_stationary", "stationary", "step_change" "trend_change" or "indeterminable" change points. Returns the top 25 most significant change points ordered by p-value.

## Parameters

- **start**: Required time (datemath) for range start, e.g. `now-1h`.
- **end**: Required time (datemath) for range end, e.g. `now`.
- **index**: Optional index or pattern. If omitted, the tool uses the Observability metrics indices discovered at runtime.
- **kqlFilter**: Optional KQL to narrow documents, e.g. `service.environment:production`.
- **aggregation**: Optional object describing the metric to aggregate.
  - **field**: Numeric field to aggregate, e.g. `system.memory.actual.free`.
  - **type**: One of `avg`, `sum`, `min`, `max`, `p95`, `p99`.
  - Note: If `aggregation` is omitted, the tool analyzes bucket counts (`count`).
- **groupBy**: Optional array of keyword fields to split results (low-cardinality recommended).

## Response

Returns an array of the most significant change points ordered by statistical significance (p-value). Each change point includes:

- **message**: Human-readable description of the detected change
- **timeSeries**: Array of `{x, y}` points showing the metric values over time
- **changes**: Object with change details:
  - **time**: ISO timestamp when the change occurred
  - **type**: Change type (`spike`, `dip`, `trend_change`, `step_change`, `distribution_change`, `indeterminable`, `non_stationary`, or `stationary`)
  - **p_value**: Statistical significance (lower = more significant)
  - **r_value**: Correlation coefficient
  - **change_point**: Index position in the time series

When grouping is used, each result is scoped to a specific group with its corresponding key values.

```
{
  "results": [
    {
      "type": "other",
      "data": {
        "changePoints": [
          {
            "message": "A trend change (slope shift) was detected for the time range 2025-12-22T10:36:00.000Z to 2025-12-24T08:36:00.000Z starting at 2025-12-23T09:06:00.000Z (p_value: 5.26318193206813e-23).",
            "timeSeries": [
              {
                "x": 1766399760000,
                "y": 12631
              },
              {
                "x": 1766401560000,
                "y": 15750
              },
              ...
            ],
            "changes": {
              "time": "2025-12-23T09:06:00.000Z",
              "type": "trend_change",
              "p_value": 5.26318193206813e-23,
              "r_value": 5.26318193206813e-23,
              "change_point": 45
            }
          }
        ]
      },
      "tool_result_id": "moEmHV"
    }
  ]
}
```

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
