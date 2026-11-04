# Entity Inventory

Server plugin for the Observability entity inventory. It will serve inventory lists, details and counts for registered entity types straight from raw telemetry, using queries generated from the entity definitions held by the entity store (`entityStore` plugin).

The plugin is disabled by default. To enable it, add the following to `kibana.yml`:

```yaml
xpack.entityInventory.enabled: true
```

At start it logs the names of the entity definitions registered in the entity store. It has no routes or UI yet.

## Query generation

`server/inventory/generator/` turns a definition that carries a `dynamic` block into ES|QL. It is a pure function of the definition and the request: no Elasticsearch calls, so the same inputs always give the same text, and the tests are snapshots. The design and the reasons behind each rule are in the Observability design doc "Entity inventory query generation" (`docs/infra-inventory/design/` in `elastic/observability-dev`); this section is the map.

| module | does |
| --- | --- |
| `dynamic.ts` | Returns the `dynamic` block or throws `InventoryDefinitionError`. |
| `esql_syntax.ts` | Backticks identifiers; checks an index pattern's character set and that it parses after `FROM`. |
| `filters.ts` | Canonicalises an author's filter: parses it as one boolean expression without parameters and re-prints it from its syntax tree, checking the re-print parses back to itself. |
| `parse_guard.ts` | Parses generated text before it is returned; a failure is a generator bug. |
| `identity.ts` | The `BY` keys, the identity-presence predicate and the `entity.id` evaluation. The last two come from the entity store's id compiler verbatim. |
| `source_plans.ts` | One query plan per source, validated once. A later phase splits a source into several plans by metric filter. |
| `columns.ts` | The output columns in order: `entity.id`, identity fields, attributes (one column per name across sources), `last_seen`. |
| `list_query.ts` | One list query per plan. |
| `count_query.ts` | One count query across all plans. |

Attributes only for now; metrics, detail and the document filter are later phases.

**List query**, one per plan:

```
SET unmapped_fields="nullify";
TS|FROM <index pattern>
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

The source keyword is the engine the caller resolved for the pattern (`TS` only when every backing index is a time series index). Attributes are never `BY` keys. Identity is grouped on the raw fields and the id is computed on the aggregated rows.

**Count query**, one for the type:

```
SET unmapped_fields="nullify";
FROM <patterns> METADATA _index
| WHERE <time> AND <identity present>
    AND ((<index matches plan a> AND (<a filter>)) OR (<index matches plan b>) ...)
| STATS BY <identity fields>
| STATS `count` = COUNT(*)                                  -- single identity field; otherwise:
| EVAL <entity.id> | STATS BY `entity.id` | STATS `count` = COUNT(*)
```

A single plan has no `METADATA _index` and no per-plan clause. An identity with more than one field is counted by distinct id, exactly, because a ranked fallback or a composed id can give two raw groups the same id.

**Safety.** The window travels as the named parameters `?from` and `?to`. Every reference the generator writes is backticked. An index pattern may contain only letters, digits, `_`, `.`, `-`, `*`, `?` and `:`, may not start with `-`, and must parse. An author's filter is parsed as a single boolean expression without query parameters and re-printed from its syntax tree; only that canonical text reaches a query, so comments are dropped and string literals may contain anything. Every generated query is parsed before it leaves the generator. Anything a definition gets wrong throws `InventoryDefinitionError`; anything the generator gets wrong throws a plain `Error`.

**Fixtures.** `server/inventory/__fixtures__/definitions.ts` holds test-only definitions (`k8s.deployment`, `k8s.node`, a host-like ranked identity) in the store's `dynamic` shape. Nothing registers them.
