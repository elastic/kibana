# Entity Inventory

Server plugin for the Observability entity inventory. It will serve inventory lists, details and counts for registered entity types straight from raw telemetry, using queries generated from the entity definitions held by the entity store (`entityStore` plugin).

The plugin is disabled by default. To enable it, add the following to `kibana.yml`:

```yaml
xpack.entityInventory.enabled: true
```

It has no routes or UI yet.

## Registered definitions

`server/definitions/` holds the definitions this plugin registers with the entity store during its
own `setup()`, grouped by family (`kubernetes/` today). `ENTITY_DEFINITIONS` is the whole list, and
each one carries `managedBy: { kind: 'plugin', id: 'entityInventory' }`. The registry validates a
definition when it is registered: one it rejects is logged and skipped, and Kibana keeps starting.
It logs the types it registered at debug, or the rejected ones as an error. At start it logs the
names of every definition the store holds, its own and the built-ins.

Registered today:

| type | identified by | sources |
| --- | --- | --- |
| `k8s.deployment` | `<namespace>/<name>` (`kubernetes.namespace`, `kubernetes.deployment.name`; the ECS<->OTel alias layer resolves them on the OTel stream), cluster as the `k8s.cluster.name` column | `metrics-kubernetes.state_deployment-*`, `metrics-k8sclusterreceiver.otel-*` |

The same namespace and name in two clusters is one `k8s.deployment` entity today.

The definitions under `server/inventory/__fixtures__/` are test-only and stay that way; nothing
registers them.

## Query generation

`server/inventory/generator/` turns a definition that carries a `dynamic` block into ES|QL. It is a pure function of the definition, the request and the probe result for each source's pattern: no Elasticsearch calls, so the same inputs always give the same text, and the tests are snapshots. The design and the reasons behind each rule are in the Observability design doc "Entity inventory query generation" (`docs/infra-inventory/design/` in `elastic/observability-dev`); this section is the map.

| module | does |
| --- | --- |
| `dynamic.ts` | Returns the `dynamic` block or throws `InventoryDefinitionError`. |
| `esql_syntax.ts` | Backticks identifiers; checks an index pattern's character set and that it parses after `FROM`. |
| `filters.ts` | Canonicalises an author's filter: parses it as one boolean expression without parameters and re-prints it from its syntax tree, checking the re-print parses back to itself. |
| `parse_guard.ts` | Parses generated text before it is returned; a failure is a generator bug. |
| `identity.ts` | The `BY` keys, the identity-presence predicate, the `entity.id` evaluation, the identity compositions as field lists, and a raw column for each `BY` key the evaluation overwrites. The predicate and the evaluation come from the entity store's id compiler verbatim. |
| `source_plans.ts` | Query plans from the sources and their probe results: a `FROM` plan per source, and a `TS` plan before it when the probe found a time-series index, validated once. A later phase also splits a source by metric filter. |
| `columns.ts` | The output columns in order: `entity.id`, identity fields, attributes (one column per name across sources), `last_seen`. |
| `list_query.ts` | One list query per plan. |
| `probe_query.ts` | The probe deciding whether a source gets a `TS` plan. |

Attributes only for now; metrics, detail and the document filter are later phases.

**Planning.** `planSources(definition, probes)` takes one `SourceProbe` per source, in source order: `{ hasTimeSeries }`, whether a readable time-series index exists behind its pattern. Every source gives a `FROM` plan; one with `hasTimeSeries` also gives a `TS` plan, listed first. Plans are numbered in the resulting order, carry `sourceIndex` and the pattern as the author wrote it, and the 32-plan budget counts them after the split. No concrete index name reaches a query.

**List query**, one per plan:

```
SET unmapped_fields="nullify";
TS <index pattern>                            -- TS plan
FROM <index pattern> METADATA _index_mode     -- FROM plan
| WHERE [`_index_mode` != "time_series"        -- FROM plan only
    AND] `@timestamp` >= ?from AND `@timestamp` < ?to
    [AND (<plan filter>)]
    AND <identity present>
| STATS `<attr>` = LAST(`<field>`, `@timestamp`) WHERE `<field>` IS NOT NULL, ...,
        `last_seen` = MAX(`@timestamp`)
    BY <identity fields>
| EVAL [`raw:entity.id` = `entity.id`,]      -- a BY key the evaluation overwrites, in practice entity.id
    <entity.id, from the store's id compiler>
| KEEP <this plan's columns>[, `raw:entity.id`]
| SORT `last_seen` DESC NULLS LAST, `entity.id` ASC
| LIMIT <limit>
```

The source keyword is the plan's engine and both name the pattern. `TS` reads only the time-series indices behind it and the `FROM` plan excludes them, a predicate resolved at planning, so no index is read twice and no time-series shard is opened by `FROM`. `METADATA _index_mode` is bare, since Elasticsearch rejects a quoted name there. Attributes are never `BY` keys. Identity is grouped on the raw fields and the id is computed on the aggregated rows. When the identity includes `entity.id`, which the id evaluation overwrites, the grouped column is first copied into `raw:entity.id`, so its raw value and type survive, under a name no author-supplied column can take since field paths contain no `:`.

**Probe query**, one per distinct pattern, run by the executor:

```
SET unmapped_fields="nullify";
TS <index pattern>
| KEEP `@timestamp`
| LIMIT 0
```

The executor reads the type of the `@timestamp` column to decide whether the source gets a `TS` plan.

**Safety.** The window travels as the named parameters `?from` and `?to`. Every reference the generator writes is backticked. An index pattern may contain only letters, digits, `_`, `.`, `-`, `*`, `?` and `:`, may not start with `-`, and must parse. An author's filter is parsed as a single boolean expression without query parameters and re-printed from its syntax tree; only that canonical text reaches a query, so comments are dropped and string literals may contain anything. Every generated query is parsed before it leaves the generator. Anything a definition gets wrong throws `InventoryDefinitionError`; anything the generator gets wrong throws a plain `Error`.

**Fixtures.** `server/inventory/__fixtures__/definitions.ts` holds test-only definitions (`k8s.deployment`, `k8s.node`, a host-like ranked identity, and an `entity.id` identity alone and leading a ranking) in the store's `dynamic` shape. Nothing registers them.

### Execution

`server/inventory/executor/` runs the generated queries with the request-scoped Elasticsearch client.

| module | does |
| --- | --- |
| `source_probe.ts` | Runs the probe once per distinct pattern and reads whether a time-series index exists behind it. |
| `esql_results_to_rows.ts` | Turns the ES\|QL `columns` and `values` arrays into rows keyed by column name. |
| `esql_client.ts` | Runs one generated query with its named parameters and `include_execution_metadata`, returning rows as objects keyed by column name (multi-values stay arrays) with `took`, documents found, values loaded and the row count. `drop_null_columns` stays off so every plan returns the same columns. |
| `errors/source_error.ts` | Flattens a failed query to `{ indexPattern, status, reason }`; never a stack or the raw body. |
| `value_labels.ts` | Maps an attribute's raw values to its `valueLabels` per plan, before the merge; an unmapped value passes through stringified. |
| `merge.ts` | One row per `entity.id` across plans: attributes from the row with the newest `last_seen`, identity fields and `entity.id` first non-null, `last_seen` newest, a null never replacing a value; `provenance` names the source pattern behind each attribute value; column types come from the first plan that returned the column. |
| `plan_result.ts` | Reads from a plan's column types whether it is usable and which of its attribute fields no index maps. |
| `output.ts` | Orders by `last_seen` descending with ties on `entity.id`, takes the limit from the front, sets each plan's `LIMIT` one above the request, derives `total` and `truncated` from plan cuts and partial results (there is no count query), and fills every row with every column. |

No metadata API is called and no concrete index is named: the executor learns everything from ES\|QL results.

**Probe.** One probe per distinct pattern, concurrently: `TS <pattern> | KEEP @timestamp | LIMIT 0`. `@timestamp` of any type other than `null` means a time-series index exists and the source gets a `TS` plan. `null`, no column, or a verification error (a concrete index that is not time series, a name that does not exist) means none. Any other failure is a source error and no plan of the source runs: the `FROM` plan excludes time-series indices, so reading the failure as "none" would silently leave them out. The decision reads the error type, never the message. Elasticsearch drops indices the user cannot read like indices that do not exist.

**Reading results.** Every query runs with `unmapped_fields="nullify"`, so a field no index maps comes back as a column of type `null`. `last_seen` of type `null` means no readable index maps `@timestamp` and the plan is unusable. A plan is also unusable when no identity composition has every field mapped; a field the id evaluation overwrites, in practice `entity.id`, which the evaluation types `keyword` even when unmapped, is read from `raw:entity.id`, its value as the documents supplied it, which the response does not carry. An attribute of type `null` is an unavailable field, not fatal. A plan that returns its full limit is cut; `total` is the merged row count, exact, only when no plan is cut or partial, otherwise null, and `truncated` is true whenever rows were left out.

Nothing is cached yet.

The reasoning behind the probe, the result reading and the absence of a count query, with the Elasticsearch behaviours relied on and which of them are documented, is in the note `docs/infra-inventory/notes/entity_inventory_minimal_resolver_proposal.md` in `elastic/observability-dev`.
