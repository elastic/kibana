# get_exit_span_change_points

Detects statistically significant change points in **egress** APM metrics: outbound calls from a service to each dependency (`span.destination.service.resource`). Series are built from **service destination** metric documents.

For the current implementation:

- **Required scope:** `serviceName` and `serviceEnvironment` (both must be non-empty). The tool returns an empty `changePoints` array if either is missing.
- **Metrics analyzed:** exit span **latency** (average, ms) and exit span **failure rate** (%). Each metric is evaluated per dependency; only series that include at least one detected change point are returned.
- **Ingress** (incoming requests to a service): use `observability.get_trace_change_points` instead.

## Response shape

`changePoints` is an array of objects:

| Field       | Description |
|------------|-------------|
| `title`    | Human-readable metric label (e.g. `Exit span latency`, `Exit span failure rate`). |
| `grouping` | Dependency identifier: `span.destination.service.resource`. |
| `changes`  | List of detected change points (`date`, `type`, optional stats such as `p_value`, `r_value`, `trend`). |

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_exit_span_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "serviceName": "checkout",
    "serviceEnvironment": "production"
  }
}
```
