# get_alerts

Retrieve Observability alerts and relevant fields for a given time range. Defaults to active alerts (set includeRecovered to true to include recovered alerts).

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_alerts",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "query": "Show me alerts related to payment service latency",
    "kqlFilter": "service.name: \"payment-service\""
  }
}
```