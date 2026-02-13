# get_traces

Retrieves Observability documents (logs, transactions, spans, and errors) for one or more traces.

This tool finds traces: documents grouped by `trace.id` within a given time range and for a given kql filter.

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

### Find traces from a query (`kqlFilter`)

```jsonc
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_traces",
  "tool_params": {
    "start": "now-30m",
    "end": "now",
    "kqlFilter": "service.name: payment-service",
    "maxTraces": 5
  }
}
```

### Use custom indices for trace.id discovery

The optional `index` parameter applies to the trace.id discovery step (finding documents matching `kqlFilter`). APM/log results are fetched from the configured Observability data sources.

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

- Results are returned as `traces` (one entry per discovered `trace.id`).
- Each trace contains `items` (sorted by `@timestamp`) and an `isTruncated` flag.
