# get_index_info Tool

Discovers available fields and index patterns in the user's Elasticsearch cluster.

## Operations

### 1. `get-overview` — Curated Fields + Data Sources

```typescript
get_index_info({ operation: "get-overview" })

// Returns:
{
  curatedFields: [{ name: "service.name", type: "keyword", schema: "ecs" }, ...],
  schemas: { hasEcsData: true, hasOtelData: false },
  dataSources: { apm: {...}, logs: [...], metrics: [...], alerts: [...] }
}
```

### 2. `list-fields` — All Fields in an Index

```typescript
get_index_info({ operation: "list-fields", index: "logs-*" })

// Returns fields grouped by Elasticsearch type:
{
  fieldsByType: { keyword: [...], text: [...], date: [...], long: [...] }
}

// With intent and >100 fields, LLM filters to relevant ones:
get_index_info({ operation: "list-fields", index: "logs-*", intent: "high latency" })
{
  fieldsByType: { keyword: ["service.name", ...], long: ["duration.ms", ...] }
}
```

### 3. `get-field-values` — Field Values

```typescript
get_index_info({ operation: "get-field-values", index: "logs-*", fields: "service.name" })

// Keyword → distinct values
{ fields: { "service.name": { type: "keyword", values: ["payment", "order"], hasMoreValues: false } } }

// Numeric → min/max
{ fields: { "http.status_code": { type: "numeric", min: 200, max: 503 } } }

// Multiple fields
get_index_info({ operation: "get-field-values", index: "logs-*", fields: ["service.name", "host.name"] })
```

## Example Workflow

```
1. get-overview         → Get curated fields + index patterns
2. list-fields          → Get all fields in an index
3. get-field-values     → Get valid values for filtering
4. Build kqlFilter      → "service.name: payment"
```
