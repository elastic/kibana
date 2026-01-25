# get_exceptions

Retrieves error groups (structured exceptions) with counts and sample details.

## Data Sources

This tool returns two arrays:

### `errorGroups`

- Errors grouped by `error.grouping_key` (pre-computed hash based on exception type, stack trace fingerprint, and code location)
- Includes errors from both Elastic APM agents and [OpenTelemetry span exceptions](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/)

### `logExceptionGroups`

- [OpenTelemetry log exceptions](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/) from log indices that don't have a pre-computed grouping key
- Grouped by message pattern using `categorize_text` aggregation

## When to use

- Get a quick overview of what errors are occurring across services
- Identify which services or exception types are generating the most errors
- Find the most frequent error patterns in a time range
- Investigate errors after seeing high failure rates in `get_trace_metrics`

## Relationship to other tools

| Tool                  | Question it answers                 | Data                                                    |
| --------------------- | ----------------------------------- | ------------------------------------------------------- |
| `get_exceptions`      | "What exceptions are being thrown?" | Errors and exceptions, grouped                          |
| `get_log_categories`  | "What's being logged?"              | All logs, grouped by message pattern                    |
| `get_trace_metrics`   | "What's the service health?"        | Transaction metrics (latency, throughput, failure rate) |
| `get_correlated_logs` | "What happened before this error?"  | Logs correlated by trace.id                             |

## Examples

### Get all errors (default)

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_exceptions",
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
  "tool_id": "observability.get_exceptions",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: \"payment-service\""
  }
}
```

### Filter by environment

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_exceptions",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.environment: \"production\""
  }
}
```

### Find only unhandled exceptions

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_exceptions",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "error.exception.handled: false"
  }
}
```

### Filter by specific exception type

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_exceptions",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "error.exception.type: \"NullPointerException\""
  }
}
```

### Include first seen timestamps

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_exceptions",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "includeFirstSeen": true
  }
}
```

### Include stack traces

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_exceptions",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "includeStackTrace": true
  }
}
```

## Typical workflow

1. **Start broad**: Call `get_exceptions()` to see all errors
2. **Identify hotspot**: Find the service or pattern with most errors
3. **Drill down**: Call `get_exceptions(kqlFilter='service.name: "..."')` to focus on a specific service
4. **Investigate**: Use `get_correlated_logs` with a trace.id from the sample to understand the sequence of events
