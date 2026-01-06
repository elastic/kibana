# get_data_sources

Retrieve information about where observability data (logs, metrics, traces, alerts) is stored in Elasticsearch. Use this tool to discover which indices or index patterns to query for different types of observability signals.

## Example

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_data_sources",
  "tool_params": {}
}
```
