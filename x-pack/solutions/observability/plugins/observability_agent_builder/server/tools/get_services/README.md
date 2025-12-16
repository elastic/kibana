# get_services

Get the list of monitored services, their health status, and alerts.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_services",
  "tool_params": {
    "start": "now-15m",
    "end": "now"
  }
}
```
