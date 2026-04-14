# get_services

Retrieves a list of monitored services from APM, logs, and metrics sources. This includes their health status (for APM services), active alert counts (for APM services), and key performance metrics: latency, transaction error rate, and throughput (for APM services).

## Data Sources

Services are discovered from three sources:

- **APM**: Services with APM instrumentation. Includes health status, alerts, and performance metrics (latency, throughput, error rate).
- **Logs**: Services identified from log data via the `service.name` field.
- **Metrics**: Services identified from metrics data via the `service.name` field.

Each service in the response includes a `sources` array indicating which data sources the service was found in (e.g., `["apm", "logs"]` or `["metrics"]`).

## Filters

- **kqlFilter**: KQL filter to narrow down services (e.g., `service.environment: "production"`, `host.name: "web-server-01"`)
- **healthStatus**: Filter by health status (`healthy`, `warning`, `critical`, `unknown`). Note: This filter only applies to APM services. Services found only in logs or metrics will not have health status information and will be excluded when this filter is used.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_services",
  "tool_params": {
    "start": "now-15m",
    "end": "now"
  }
}
```
