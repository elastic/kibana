# get_traces

Retrieves trace data (APM transactions/spans/errors) plus logs for one or more traces.

This tool finds traces: documents grouped  by `trace.id` within a given time range and for a given kql filter. 


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

Note: When `kqlFilter` targets a specific `trace.id`, the tool typically returns a single trace. If `kqlFilter` is broader (e.g. `service.name: ...`), it may discover multiple trace ids; you can control how many via `maxTraceIds`.

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
    "maxTraceIds": 5
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
