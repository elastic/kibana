# get_correlated_logs

Retrieves logs and their surrounding context based on shared correlation identifiers (e.g. trace.id). Can start from a specific log ID or find error logs within a time range to use as anchors. Returns chronologically sorted groups of logs, providing visibility into the sequence of events leading up to and following the anchor log.

## Examples

### Find correlated logs for errors in the payment-service

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_correlated_logs",
  "tool_params": {
    "kqlFilter": "service.name: \"payment-service\""
  }
}
```

### Find correlated logs for a specific log ID

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_correlated_logs",
  "tool_params": {
    "logId": "c8f9d2a1-4b3e-4a1c-9d8e-7f6a5b4c3d2e",
    "index": "logs-payment-service"
  }
}
```

### Limit the returned logs to specific fields only

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_correlated_logs",
  "tool_params": {
    "start": "now-15m",
    "end": "now",
    "logSourceFields": ["@timestamp", "message", "log.level", "service.name"],
    "maxSequences": 20
  }
}
```

### Specify non-standard correlation identifiers to correlate by

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_correlated_logs",
  "tool_params": {
    "correlationFields": ["my_custom_correlation_identifier"]
  }
}
```

### Find correlated logs for non-error events (e.g. slow transactions)

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_correlated_logs",
  "tool_params": {
    "kqlFilter": "service.name: \"payment-service\"",
    "interestingEventFilter": "event.duration > 1000000000"
  }
}
```
