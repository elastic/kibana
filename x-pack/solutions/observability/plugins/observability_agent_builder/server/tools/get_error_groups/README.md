# get_error_groups

Retrieves error groups (exceptions and APM errors) with counts and sample details. This tool answers the question: **"What errors are occurring in my services?"**

## Data Sources

This tool covers both:
- **Elastic APM errors** — Errors captured by Elastic APM agents
- **OpenTelemetry exceptions** — Exceptions ingested via OTLP endpoint (converted to APM format)

Errors are grouped using Elastic's pre-computed `error.grouping_key`, which clusters similar errors based on exception type, stack trace fingerprint, and code location.

## When to use

- Get a quick overview of what errors are occurring across services
- Identify which services or exception types are generating the most errors
- Find the most frequent error patterns in a time range
- Investigate errors after seeing high failure rates in `get_trace_metrics`

## Relationship to other tools

| Tool | Question it answers | Data |
|------|---------------------|------|
| `get_error_groups` | "What exceptions are being thrown?" | APM errors + OTel exceptions, grouped by type |
| `get_log_categories` | "What's being logged?" | All logs, grouped by message pattern |
| `get_trace_metrics` | "What's the service health?" | Transaction metrics (latency, throughput, failure rate) |
| `get_correlated_logs` | "What happened before this error?" | Logs correlated by trace.id |

## Output

Each error group includes:
- `group` — Value of the groupBy field (e.g., service name or exception type)
- `count` — Number of error occurrences
- `lastSeen` — ISO timestamp of the most recent error
- `sample` — ECS fields from a representative error (dotted field names):
  - `error.grouping_key` — The error's grouping key
  - `error.exception.message` or `error.log.message` — Error message
  - `error.exception.type` — Exception class (e.g., `NullPointerException`)
  - `error.exception.handled` — Whether the exception was caught
  - `error.culprit` — Code location (e.g., `com.example.PaymentService.process`)
  - `service.name` — Service that generated the error
  - `service.environment` — Service environment (e.g., `production`)
  - `transaction.name` — The operation that failed (e.g., `GET /api/checkout`)
  - `trace.id` — Trace ID for correlation with `get_correlated_logs`
  - `downstreamServiceResource` — Dependency that failed (if error occurred during outbound call)

## Examples

### Get errors grouped by service (default)

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_error_groups",
  "tool_params": {
    "start": "now-1h",
    "end": "now"
  }
}
```

### Drill down into a specific service by exception type

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_error_groups",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: \"payment-service\"",
    "groupBy": "error.exception.type"
  }
}
```

### Find most common error locations (culprits)

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_error_groups",
  "tool_params": {
    "start": "now-24h",
    "end": "now",
    "groupBy": "error.culprit"
  }
}
```

### Filter by environment

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_error_groups",
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
  "tool_id": "observability.get_error_groups",
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
  "tool_id": "observability.get_error_groups",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "error.exception.type: \"NullPointerException\""
  }
}
```

### Combine filters: production + specific service + group by exception

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_error_groups",
  "tool_params": {
    "start": "now-2h",
    "end": "now",
    "kqlFilter": "service.environment: \"production\" AND service.name: \"checkout-api\"",
    "groupBy": "error.exception.type"
  }
}
```

## Common groupBy fields

| Field | Description |
|-------|-------------|
| `service.name` (default) | Group errors by service |
| `error.exception.type` | Group by exception class |
| `error.culprit` | Group by code location |
| `service.environment` | Group by environment |
| `host.name` | Group by host |

## Typical workflow

1. **Start broad**: Call `get_error_groups()` to see errors by service
2. **Identify hotspot**: Find the service with most errors
3. **Drill down**: Call `get_error_groups(kqlFilter='service.name: "..."', groupBy='error.exception.type')` to see exception types
4. **Investigate**: Use `get_correlated_logs` with a trace.id from the sample to understand the sequence of events
