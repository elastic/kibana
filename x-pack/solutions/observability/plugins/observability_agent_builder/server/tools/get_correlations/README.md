# get_correlations

Detect

## Examples

### Get correlations

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_correlations",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "serviceName": "my-service",
    "transactionName": "GET /api/product",
    "transactionType": "request",
    "type": "failures"
  }
}
```
