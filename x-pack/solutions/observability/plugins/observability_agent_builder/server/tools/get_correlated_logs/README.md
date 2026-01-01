# get_correlated_logs

Retrieves log sequences around error events to understand what happened. By default, anchors on error logs (ERROR, WARN, FATAL, HTTP 5xx). Set `errorLogsOnly: false` to anchor on any (non-error) logs.

## Examples

### Find correlated logs for errors in the payment-service

```json
{
  "tool_id": "observability.get_correlated_logs",
  "tool_params": {
    "kqlFilter": "service.name: payment-service"
  }
}
```

### Find correlated logs for slow requests (non-errors)

```json
{
  "tool_id": "observability.get_correlated_logs",
  "tool_params": {
    "kqlFilter": "service.name: payment-service AND event.duration > 1000000",
    "errorLogsOnly": false
  }
}
```

### Find correlated logs for a specific log ID

```json
{
  "tool_id": "observability.get_correlated_logs",
  "tool_params": {
    "logId": "c8f9d2a1-4b3e-4a1c-9d8e-7f6a5b4c3d2e"
  }
}
```

### Use custom correlation fields

```json
{
  "tool_id": "observability.get_correlated_logs",
  "tool_params": {
    "correlationFields": ["my_custom_correlation_id"]
  }
}
```
