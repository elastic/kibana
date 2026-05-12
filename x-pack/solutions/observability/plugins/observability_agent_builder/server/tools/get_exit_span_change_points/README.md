# get_exit_span_change_points

Detects statistically significant changes in **egress** APM metrics: outbound requests from a service to each dependency (`span.destination.service.resource`). Metrics are derived from service destination metric documents (avg latency, throughput per minute, failure rate).

For **ingress** (incoming requests to a service), use `observability.get_trace_change_points` instead.

## Examples

### Scope by service and environment

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_exit_span_change_points",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: \"checkout\" AND service.environment: \"production\""
  }
}
```
