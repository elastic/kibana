# get_traces

Retrieves trace data (APM transactions/spans/errors) plus logs for a single request/flow.

This tool supports:

- Direct lookup by `traceId`
- Anchor-based lookup from logs (via `logId`, or `kqlFilter` + time range)

When anchoring from logs, the tool tries to extract the best correlation identifier from the anchor log (prefers `trace.id`). If the anchor only contains non-APM identifiers (e.g., `request.id`), APM results may be empty while logs still return.

## Examples

### Direct lookup by `traceId`

```jsonc
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_traces",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "traceId": "abc123"
  }
}
```

### Anchor from a specific log entry (`logId`)

```jsonc
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_traces",
  "tool_params": {
    "logId": "abc123"
  }
}
```

### Anchor from a log query (`kqlFilter`)

By default, anchors are selected from warning-and-above logs (ERROR, WARN, FATAL, HTTP 5xx). Set `errorLogsOnly: false` to anchor on any log lines.

```jsonc
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_traces",
  "tool_params": {
    "start": "now-30m",
    "end": "now",
    "kqlFilter": "service.name: payment-service",
    "maxSequences": 5
  }
}
```

### Use custom log indices

```jsonc
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_traces",
  "tool_params": {
    "start": "now-15m",
    "end": "now",
    "traceId": "abc123",
    "index": "logs-*,filebeat-*"
  }
}
```

## Notes

- Results are returned as sequences. Each sequence contains `traceItems` (APM events), `errorItems` (APM error documents), and `logs` (log events).
- Each array is sorted by `@timestamp`, but the tool does not merge APM + logs into a single timeline.
- When anchoring from logs, the correlation window is expanded to +/- 1 hour around the anchor timestamp.
