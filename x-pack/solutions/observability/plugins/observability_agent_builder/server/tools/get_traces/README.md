# get_traces

Retrieves trace data (APM transactions/spans/errors) plus logs for a single request/flow.

This tool is KQL-driven: it finds one or more anchor logs within the time range, extracts the best available correlation identifier from each anchor log (prefers `trace.id`), then fetches APM events and logs for that identifier.

If the anchor only contains non-APM identifiers (e.g., `request.id`), APM results may be empty while logs still return.

## Examples

### Retrieve a specific trace by trace id

```jsonc
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_traces",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "trace.id: abc123"
  }
}
```

### Expand from a specific log document id

Use this when you already have a log event id (e.g. from Discover) and want to retrieve the surrounding trace/log context.

```jsonc
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_traces",
  "tool_params": {
    "kqlFilter": "_id: abc123"
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
    "kqlFilter": "trace.id: abc123",
    "index": "logs-*,filebeat-*"
  }
}
```

## Notes

- Results are returned as sequences. Each sequence contains `traceItems` (APM events), `errorItems` (APM error documents), and `logs` (log events).
- Each array is sorted by `@timestamp`, but the tool does not merge APM + logs into a single timeline.
- When anchoring from logs, the correlation window is expanded to +/- 1 hour around the anchor timestamp.
