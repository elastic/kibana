# get_metric_change_points

Analyzes metrics to detect statistically significant changes like "dip", "spike", "distribution_change", "non_stationary", "step_change" or "trend_change" in metrics, ignoring "indeterminable" and "stationary" change points. Returns the top 25 most significant change points ordered by p-value, with each result including the metric name, change type, and statistical significance.

The tool supports multiple aggregation types (min, max, sum, count, avg, p95, p99) and can group results by one or more fields.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_metric_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "metrics": [
      {
        "name": "API Latency P95",
        "index": "metrics-*",
      }
    ]
  }
}
```
