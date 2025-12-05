# get_correlated_error_logs

Retrieves error logs and their surrounding context based on shared correlation identifiers. Returns chronologically sorted groups of logs, providing visibility into the sequence of events leading up to and following an error. Custom filters for defining "errors" and specifying correlation fields are supported.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_correlated_error_logs",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "terms": {
      "service.name": "payment-service"
    },
    "correlationFields": ["trace.id", "transaction.id"],
    "errorSeverityFilter": {
      "term": {
        "http.response.status_code": 500
      }
    }
  }
}
```
