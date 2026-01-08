# get_index_info Tool

Discovers available fields and index patterns in the user's Elasticsearch cluster.

## Call Signatures

### 1. `get_index_info()` — Curated Fields + Data Sources

```typescript
// Returns curated fields that exist, plus index patterns
{
  curatedFields: [{ name: "service.name", type: "keyword", isOtel: false }, ...],
  schemas: { hasEcsData: true, hasOtelData: false },
  dataSources: { apm: {...}, logs: [...], metrics: [...], alerts: [...] }
}
```

### 2. `get_index_info({ index, userIntentDescription? })` — All Fields (with optional LLM filtering)

```typescript
// Returns all fields grouped by Elasticsearch type
{
  fieldsByType: { keyword: [...], text: [...], date: [...], long: [...] },
  totalFields: 150
}

// With userIntentDescription and >100 fields, LLM filters to relevant ones:
get_index_info({ index: "logs-*", userIntentDescription: "High latency in checkout" })
{
  fieldsByType: { keyword: ["service.name", ...], long: ["duration.ms", ...] },
  totalFields: 520,
  filtered: true
}
```

### 3. `get_index_info({ index, field })` — Field Values

```typescript
// Keyword field → distinct values
{ type: "keyword", field: "service.name", values: ["payment", "order"], hasMoreValues: false }

// Numeric field → min/max range
{ type: "numeric", field: "http.response.status_code", min: 200, max: 503 }

// Date field → min/max range
{ type: "date", field: "@timestamp", min: "2024-01-01T00:00:00Z", max: "2024-01-07T23:59:59Z" }

// Multiple fields (batch)
{ fields: { "service.name": {...}, "host.name": {...} } }
```

## Example Workflow

```
1. get_index_info() → Get curated fields + index patterns
2. get_index_info({ index: "logs-*", userIntentDescription: "checkout latency" }) → Get relevant fields
3. get_index_info({ index: "logs-*", field: "service.name" }) → Get valid values
4. Build filter: kqlFilter: "service.name: payment"
```

## Implementation

| API                | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `field_caps`       | Check field existence/types                                    |
| `terms_enum`       | Get keyword field values                                       |
| `stats` agg        | Get min/max for numeric fields                                 |
| `min/max` agg      | Get min/max for date fields                                    |
| `inference.output` | LLM filtering when userIntentDescription provided and >100 fields |
