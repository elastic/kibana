# observability.elasticsearch Tool

Executes Elasticsearch API calls by dynamically searching indexed Elasticsearch OpenAPI documentation for the right endpoint and calling it.

## When to Use

- Running Elasticsearch APIs that no other tool covers (cluster health, node stats, index mappings, shard allocation, reindex, snapshot management)
- Querying any index directly with full control over the request body (aggregations, filters, sorting, pagination)

## When NOT to Use

| Goal                               | Use instead                                                     |
| ---------------------------------- | --------------------------------------------------------------- |
| Log search and filtering           | `observability.get_logs`                                        |
| APM service health and performance | `observability.get_services`, `observability.get_trace_metrics` |
| Infrastructure host metrics        | `observability.get_hosts`                                       |
| Anomaly detection results          | `observability.get_anomaly_detection_jobs`                      |

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.elasticsearch",
  "tool_params": {
    "nlQuery": "get the cluster health status"
  }
}
```
