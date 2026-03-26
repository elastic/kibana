# get_anomaly_detection_jobs

Return anomaly detection jobs and associated anomaly records. Useful for identifying unusual patterns in observability data.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_anomaly_detection_jobs",
  "tool_params": {
    "start": "now-24h",
    "end": "now",
    "jobIds": ["my-job-1"],
    "limit": 5
  }
}
```