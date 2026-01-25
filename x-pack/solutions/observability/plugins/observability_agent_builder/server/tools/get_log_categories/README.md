# get_log_categories

Compresses thousands of logs into a small set of categories to provide a high-level overview of what's being logged. This tool answers: **"What's being logged?"**

## Relationship to `get_error_groups` tool

`get_error_groups` returns structured exceptions with `exception.type`, `exception.message`, and `exception.stacktrace`. A log like `"Payment failed for user 12345"` at ERROR level appears in `get_log_categories` but NOT in `get_error_groups` (no exception type/stacktrace).


## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_log_categories",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: \"payments-service\""
  }
}
```
