# get_error_groups

Retrieves error groups from APM errors and OTel exceptions. Returns errors grouped by type with occurrence counts, timestamps, and sample details.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_error_groups",
  "tool_params": {
    "serviceName": "payment-service",
    "start": "now-1h",
    "end": "now"
  }
}
```

## With environment filter

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_error_groups",
  "tool_params": {
    "serviceName": "payment-service",
    "serviceEnvironment": "production",
    "start": "now-24h",
    "end": "now"
  }
}
```

## With KQL filter

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_error_groups",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "host.name:\"web-server-01\""
  }
}
```
