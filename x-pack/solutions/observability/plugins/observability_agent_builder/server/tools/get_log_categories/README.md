# get_log_categories

Retrieve distinct log patterns for a given time range using categorize_text aggregation. Returns categorized log messages with their patterns, counts, and sample documents.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_categories",
  "tool_params": {
    "index": "logs-*",
    "start": "now-1h",
    "end": "now",
    "terms": {
      "service.name": "payments-service"
    }
  }
}
```
