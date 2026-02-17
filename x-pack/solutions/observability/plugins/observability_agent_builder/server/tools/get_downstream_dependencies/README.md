# get_downstream_dependencies

Get downstream dependencies (services or uninstrumented backends) for a given service and time range.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_downstream_dependencies",
  "tool_params": {
    "start": "now-15m",
    "end": "now",
    "serviceName": "frontend"
  }
}
```
