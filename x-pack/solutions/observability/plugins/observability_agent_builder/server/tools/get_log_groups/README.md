# get_log_groups

Returns a comprehensive view of application health by grouping and categorizing logs and exceptions. This tool answers: **"What's happening in my application?"**

## Output

Returns a flat array of log groups sorted by count (descending). Each group has a `type` field:

- `spanException` - APM errors and [OTel span exceptions](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/), grouped by `error.grouping_key`
- `logException` - [OTel log exceptions](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/), grouped by message pattern
- `log` - Regular log messages, grouped by message pattern

## Examples

### Get all groups (default)

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_groups",
  "tool_params": {
    "start": "now-1h",
    "end": "now"
  }
}
```

### Filter by service

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_groups",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: \"payment-service\""
  }
}
```

### Include stack traces for debugging

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_groups",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "includeStackTrace": true
  }
}
```

### Include first seen timestamps for exception groups

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_groups",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "includeFirstSeen": true
  }
}
```

### Get additional fields for non-exception logs

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_groups",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "fields": ["service.name", "host.name", "trace.id"]
  }
}
```

## Typical workflow

1. **Start broad**: Call `get_log_groups()` to see all logs and exceptions
2. **Identify hotspot**: Find the service or pattern with most errors
3. **Drill down**: Call `get_log_groups(kqlFilter='service.name: "..."')` to focus on a specific service
4. **Investigate**: Use `get_correlated_logs` with a trace.id from the sample to understand the sequence of events
