# run_log_rate_analysis

Identify significant changes in log rates for a given index between two time windows (baseline vs deviation) to help explain spikes or dips in log volume.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.run_log_rate_analysis",
  "tool_params": {
    "index": "logs-*",
    "baseline": {
      "start": "now-1h",
      "end": "now-30m"
    },
    "deviation": {
      "start": "now-30m",
      "end": "now"
    }
  }
}
```
