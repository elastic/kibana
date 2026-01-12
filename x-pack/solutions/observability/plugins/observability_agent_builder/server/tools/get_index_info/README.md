# get_index_info Tool

Discovers available index patterns, data streams, fields, and field values in the user's Elasticsearch cluster.

## Operations

### 1. `get-index-patterns` — Index Patterns and Data Streams

```typescript
get_index_info({ operation: "get-index-patterns" })

// Returns index patterns AND discovered data streams:
{
  indexPatterns: {
    apm: { transaction: "traces-apm*", span: "traces-apm*", error: "logs-apm*", metric: "metrics-apm*" },
    logs: ["logs-*-*", "logs-*", "filebeat-*"],
    metrics: ["metrics-*", "metricbeat-*"],
    alerts: [".alerts-observability.*"]
  },
  dataStreams: [
    { name: "logs-apm.error-default", dataset: "apm.error" },
    { name: "metrics-system.cpu-default", dataset: "system.cpu" },
    { name: "metrics-system.memory-default", dataset: "system.memory" },
    { name: "traces-apm-default", dataset: "apm" }
  ]
}
```

Use data streams for targeted field discovery (e.g., `metrics-system.memory-*` for memory fields).

### 2. `list-fields` — Fields in an Index

```typescript
// Use specific data stream for better results:
get_index_info({ operation: "list-fields", index: "metrics-system.memory-*" })

// Returns fields grouped by Elasticsearch type:
{
  fieldsByType: {
    float: ["system.memory.used.pct", "system.memory.actual.used.pct"],
    long: ["system.memory.total", "system.memory.actual.free", "system.memory.used.bytes"],
    keyword: ["host.name", "cloud.region"],
    date: ["@timestamp"]
  }
}

// With intent and >100 fields, LLM filters to relevant ones:
get_index_info({ operation: "list-fields", index: "logs-*", intent: "high latency" })
```

### 3. `get-field-values` — Field Values

```typescript
get_index_info({ operation: "get-field-values", index: "traces-apm*", fields: "service.name" })

// Keyword → distinct values
{ fields: { "service.name": { type: "keyword", values: ["payment", "order"], hasMoreValues: false } } }

// Numeric → min/max
{ fields: { "transaction.duration.us": { type: "numeric", min: 100000, max: 500000 } } }

// Multiple fields
get_index_info({ operation: "get-field-values", index: "traces-apm*", fields: ["service.name", "host.name"] })

// Wildcard patterns — discover values for all matching fields at once
get_index_info({ operation: "get-field-values", index: "traces-*", fields: "attributes.app.*" })
// Returns all 33 fields matching the pattern: attributes.app.product.id, attributes.app.order.amount, etc.

// Multiple wildcards
get_index_info({ operation: "get-field-values", index: "traces-*", fields: ["resource.service.*", "attributes.http.*"] })
```

## Example Workflow

```
1. get-index-patterns   → Discover data streams (e.g., metrics-system.memory-*)
2. list-fields          → Get fields from specific data stream
3. get-field-values     → Get valid values for filtering
4. Build kqlFilter      → "host.name: discover-host-01"
```
