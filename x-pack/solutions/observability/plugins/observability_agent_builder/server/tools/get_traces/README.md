# get_traces

Retrieves trace data (APM transactions/spans/errors) plus logs for one or more traces.

This tool is KQL-driven: it finds one or more anchor documents (logs or APM events) within the time range, extracts one or more `trace.id` values from those documents, then fetches APM events and logs for each trace.

If a matching document does not contain `trace.id`, it cannot be used to fetch a trace.

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

### Anchor from a query (`kqlFilter`)

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

### Use custom indices for anchor discovery

The optional `index` parameter applies to the anchor discovery step (finding documents matching `kqlFilter`). APM/log results are fetched from the configured Observability data sources.

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

- Results are returned as sequences. Each sequence contains `traceItems` (APM events) and `logs` (log events).
- Each array is sorted by `@timestamp`, but the tool does not merge APM + logs into a single timeline.
