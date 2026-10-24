# Entity Inventory

Server plugin for the Observability entity inventory. It will serve inventory lists, details and counts for registered entity types straight from raw telemetry, using queries generated from the entity definitions held by the entity store (`entityStore` plugin).

The plugin is disabled by default. To enable it, add the following to `kibana.yml`:

```yaml
xpack.entityInventory.enabled: true
```

At start it logs the names of the entity definitions registered in the entity store. It has no routes or UI yet.

## Query generation

`server/inventory/generator/` turns a definition that carries a `dynamic` block into ES|QL. It is a pure function of the definition, the request and what the caller resolved behind each source's pattern: no Elasticsearch calls, so the same inputs always give the same text, and the tests are snapshots. The design and the reasons behind each rule are in the Observability design doc "Entity inventory query generation" (`docs/infra-inventory/design/` in `elastic/observability-dev`); this section is the map.

| module | does |
| --- | --- |
| `dynamic.ts` | Returns the `dynamic` block or throws `InventoryDefinitionError`. |
| `esql_syntax.ts` | Backticks identifiers; checks an index pattern's character set and that it parses after `FROM`. |
| `filters.ts` | Canonicalises an author's filter: parses it as one boolean expression without parameters and re-prints it from its syntax tree, checking the re-print parses back to itself. |
| `parse_guard.ts` | Parses generated text before it is returned; a failure is a generator bug. |
| `identity.ts` | The `BY` keys, the identity-presence predicate, the `entity.id` evaluation and the identity compositions as field lists. The predicate and the evaluation come from the entity store's id compiler verbatim. |
| `source_plans.ts` | Query plans from the sources and their resolved concrete indices: one plan per index mode a source has, validated once. A later phase also splits a source by metric filter. |
| `columns.ts` | The output columns in order: `entity.id`, identity fields, attributes (one column per name across sources), `last_seen`. |
| `list_query.ts` | One list query per plan. |
| `count_query.ts` | One count query across all plans. |

Attributes only for now; metrics, detail and the document filter are later phases.

**Planning.** `planSources(definition, resolved)` takes one `ResolvedSource` per source, in source order: the readable concrete indices behind its pattern, each with its index mode (`time_series` or `standard`). A source's `time_series` indices become a `TS` plan and its `standard` indices a `FROM` plan, `TS` first; a source with no indices gives no plan, and the caller reports it. Plans are numbered in the resulting order, carry their sorted concrete indices and `sourceIndex`, and the 32-plan budget counts them after the split. Resolved index names pass the same character-set rule as an author's pattern.

**List query**, one per plan:

```
SET unmapped_fields="nullify";
TS|FROM <index pattern, or the plan's indices>
| WHERE `@timestamp` >= ?from AND `@timestamp` < ?to
    [AND (<plan filter>)]
    AND <identity present>
| STATS `<attr>` = LAST(`<field>`, `@timestamp`) WHERE `<field>` IS NOT NULL, ...,
        `last_seen` = MAX(`@timestamp`)
    BY <identity fields>
| EVAL <entity.id, from the store's id compiler>
| KEEP <this plan's columns>
| SORT `last_seen` DESC NULLS LAST
| LIMIT <limit>
```

The source keyword is the plan's engine. A plan covering every index of its source (`queryTarget: 'pattern'`) names the pattern; a plan split from a mixed source (`queryTarget: 'indices'`) names its concrete indices, so `TS` never sees a standard index. Attributes are never `BY` keys. Identity is grouped on the raw fields and the id is computed on the aggregated rows.

**Count query**, one for the type:

```
SET unmapped_fields="nullify";
FROM <patterns> METADATA _index
| WHERE <time> AND <identity present>
    AND ((`_index` IN (?i0_0, ?i0_1) AND (<plan 0 filter>)) OR (`_index` IN (?i1_0)) ...)
| STATS BY <identity fields>
| STATS `count` = COUNT(*), `raw_groups` = COUNT(*)        -- single identity field; otherwise:
| EVAL <entity.id> | STATS `rows` = COUNT(*) BY `entity.id`
| STATS `count` = COUNT(*), `raw_groups` = COALESCE(SUM(`rows`), 0)
```

Each plan matches its documents by the concrete index names it was planned from, passed as named parameters `?i<plan>_<n>`, so an alias or a failure store matches exactly and one stream never matches a longer-named one. A single plan over its whole pattern has no `METADATA _index` and no per-plan clause; a single plan split from its source keeps its clause, since the pattern covers more than the plan. An identity with more than one field is counted by distinct id, exactly, because a ranked fallback or a composed id can give two raw groups the same id. `raw_groups` is the number of raw identity groups before that merge, equal to `count` for a single field; the difference is the number of id collisions.

**Safety.** The window travels as the named parameters `?from` and `?to`, and the count query's index names as `?i<plan>_<n>`. Every reference the generator writes is backticked. An index pattern may contain only letters, digits, `_`, `.`, `-`, `*`, `?` and `:`, may not start with `-`, and must parse. An author's filter is parsed as a single boolean expression without query parameters and re-printed from its syntax tree; only that canonical text reaches a query, so comments are dropped and string literals may contain anything. Every generated query is parsed before it leaves the generator. Anything a definition gets wrong throws `InventoryDefinitionError`; anything the generator gets wrong throws a plain `Error`.

**Fixtures.** `server/inventory/__fixtures__/definitions.ts` holds test-only definitions (`k8s.deployment`, `k8s.node`, a host-like ranked identity) in the store's `dynamic` shape. Nothing registers them.

### Execution

`server/inventory/executor/` runs the generated queries with the request-scoped Elasticsearch client.

| module | does |
| --- | --- |
| `source_metadata.ts` | Resolves each pattern to its concrete indices and their index mode (`time_series`, or `standard` for anything else, `logsdb` included), then checks field availability and whether each plan can serve its identity. |
| `esql_client.ts` | Runs one generated query with its named parameters and `include_execution_metadata`, returning rows as objects keyed by column name (multi-values stay arrays) with `took`, documents found, values loaded and the row count. `drop_null_columns` stays off so every plan returns the same columns. |
| `errors/source_error.ts` | Flattens a failed query to `{ indexPattern, status, reason }`; never a stack or the raw body. |
| `value_labels.ts` | Maps an attribute's raw values to its `valueLabels` per plan, before the merge; an unmapped value passes through stringified. |
| `merge.ts` | One row per `entity.id` across plans: attributes from the row with the newest `last_seen`, identity fields and `entity.id` first non-null, `last_seen` newest, a null never replacing a value; `provenance` names the source pattern behind each attribute value; column types come from the first plan that returned the column. |
| `output.ts` | Orders by `last_seen` descending with ties on `entity.id`, takes the limit from the front, decides `truncated` (`total > rows`, or the count failed), and fills every row with every column. |

**Readability.** Index metadata and field capabilities succeed with metadata privileges alone, while ES\|QL silently drops indices the user cannot read. One `_has_privileges` call checks `read` over every resolved concrete index and its data stream (`_has_privileges` matches names literally, so a grant on a stream does not show on its backing indices); a failure store index needs `read_failure_store` on its stream. An unreadable index is removed from its source, a source left with none is reported. The check is skipped when security is off. Access granted only through an alias is not recognised, and a remote pattern (`cluster:index`) resolves to nothing, since the get-index API is local only.

**Availability.** One field-capabilities call covers every source's indices and fields; if it fails, each pattern is retried alone so the failure stays with that pattern. A plan is usable if one of its indices maps every field of one identity composition. Attribute fields no index maps stay in the query and come back null.

Nothing is cached yet.
