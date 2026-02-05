# get_index_info Tool

Discovers available index patterns, data streams, fields, and field values in the user's Elasticsearch cluster.

## Operations

### 1. `get-index-patterns` — Index Patterns and Data Streams

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_index_info",
  "tool_params": {
    "operation": "get-index-patterns"
  }
}
```

Use data streams for targeted field discovery (e.g., `metrics-system.memory-*` for memory fields).

### 2. `list-fields` — Fields in an Index

Use specific data stream for better results:

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_index_info",
  "tool_params": {
    "operation": "list-fields",
    "index": "metrics-system.memory-*"
  }
}
```

With intent and >100 fields, LLM filters to relevant ones:

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_index_info",
  "tool_params": {
    "operation": "list-fields",
    "index": "logs-*",
    "intent": "high latency"
  }
}
```

### 3. `get-field-values` — Field Values

Single field:

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_index_info",
  "tool_params": {
    "operation": "get-field-values",
    "index": "traces-apm*",
    "fields": ["service.name"]
  }
}
```

Wildcard patterns — discover values for all matching fields at once:

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_index_info",
  "tool_params": {
    "operation": "get-field-values",
    "index": "traces-*",
    "fields": ["attributes.app.*"]
  }
}
```

With time range and KQL filter:

```
POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "observability.get_index_info",
  "tool_params": {
    "operation": "get-field-values",
    "index": "logs-*",
    "fields": ["host.name"],
    "start": "now-1h",
    "end": "now",
    "kqlFilter": "service.name: checkout"
  }
}
```

## Example Workflow

```
1. get-index-patterns   → Discover data streams (e.g., metrics-system.memory-*)
2. list-fields          → Get fields from specific data stream
3. get-field-values     → Get valid values for filtering
4. Build kqlFilter      → "host.name: discover-host-01"
```
