# Entity Inventory

Server plugin for the Observability entity inventory. It will serve inventory lists, details and counts for registered entity types straight from raw telemetry, using queries generated from the entity definitions held by the entity store (`entityStore` plugin).

The plugin is disabled by default. To enable it, add the following to `kibana.yml`:

```yaml
xpack.entityInventory.enabled: true
```

## Routes

The route exists only when the plugin is enabled.

### `GET /internal/entity_inventory/types`

No body and no parameters. It returns one entry per definition the entity store holds that has a `dynamic` block: this plugin's definitions and any other registered definition that carries one, such as the entity store's built-in `host`. Definitions without a `dynamic` block are left out. Example response for `k8s.deployment`:

```json
{
  "types": [
    {
      "type": "k8s.deployment",
      "name": "K8s Deployment",
      "description": "A Kubernetes deployment, identified by cluster/namespace/name. Read from the Elastic Agent Kubernetes integration (state_deployment) and the OpenTelemetry k8sclusterreceiver.",
      "identityFields": [
        "k8s.cluster.name",
        "k8s.namespace.name",
        "k8s.deployment.name",
        "orchestrator.cluster.name",
        "kubernetes.namespace",
        "kubernetes.deployment.name"
      ],
      "columns": [
        { "name": "entity.id", "kind": "id" },
        { "name": "k8s.cluster.name", "kind": "identity" },
        { "name": "k8s.namespace.name", "kind": "identity" },
        { "name": "k8s.deployment.name", "kind": "identity" },
        { "name": "orchestrator.cluster.name", "kind": "identity" },
        { "name": "kubernetes.namespace", "kind": "identity" },
        { "name": "kubernetes.deployment.name", "kind": "identity" },
        { "name": "available_replicas", "kind": "attribute" },
        { "name": "desired_replicas", "kind": "attribute" },
        { "name": "paused", "kind": "attribute" },
        { "name": "app", "kind": "attribute" },
        { "name": "resource_id", "kind": "attribute" },
        { "name": "last_seen", "kind": "last_seen" }
      ],
      "sources": [
        {
          "indexPattern": "metrics-kubernetes.state_deployment-*",
          "filter": "metricset.name == \"state_deployment\""
        },
        { "indexPattern": "metrics-k8sclusterreceiver.otel-*" }
      ]
    }
  ]
}
```

### Access control (interim)

The route sets `security.authz.enabled: false` with the reason: "Interim: this route is internal, reads only code-registered definitions, and the plugin is off by default. The privilege model is tracked in elastic/observability-dev#6244." Any authenticated user can call it until that issue defines the privileges. Tracked in [elastic/observability-dev#6244](https://github.com/elastic/observability-dev/issues/6244).

There is no UI yet.

## Registered definitions

`server/definitions/` holds the definitions this plugin registers with the entity store during its
own `setup()`, grouped by family (`kubernetes/` today). `ENTITY_DEFINITIONS` is the whole list, and
each one carries `managedBy: { kind: 'plugin', id: 'entityInventory' }`. The registry validates a
definition when it is registered: one it rejects is logged and skipped, and Kibana keeps starting.
At start the plugin logs the names of every definition the store holds, its own and the built-ins.

Registered today:

| type | identified by | sources |
| --- | --- | --- |
| `k8s.deployment` | `<cluster>/<namespace>/<name>`, OpenTelemetry names ranked before the Elastic Agent ones | `metrics-kubernetes.state_deployment-*`, `metrics-k8sclusterreceiver.otel-*` |

The definitions under `server/inventory/__fixtures__/` are test-only and stay that way; nothing
registers them.

### Adding a definition

1. Add a file under `server/definitions/<family>/` that exports a `RegistrableEntityDefinition`, with `managedBy: MANAGED_BY` (from `server/definitions/constants.ts`) and no `extraction`.
2. Append it to that family's list (`KUBERNETES_DEFINITIONS` in `server/definitions/kubernetes/index.ts` for a Kubernetes one). A new family gets its own folder and list, spread into `ENTITY_DEFINITIONS`.
3. Attributes may not read identity fields: the entity store schema rejects such a definition.
4. Run `node scripts/jest x-pack/solutions/observability/plugins/entity_inventory/server/definitions/definitions.test.ts`. It checks every definition against the store schema (this is where an attribute that reads an identity field fails) and compares each identity with its snapshot in `server/definitions/__snapshots__/`; a new definition adds a snapshot entry, so review it.
5. Start Kibana with `xpack.entityInventory.enabled: true` and check that the new type appears in the `GET /internal/entity_inventory/types` response.

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

## Scout

The API suite is `test/scout_entity_inventory/api/`. It sits in a `scout_<name>` folder because Scout picks the custom server config set of that name, `entity_inventory`, which starts Kibana with `--xpack.entityInventory.enabled=true`. Under `test/scout` the default config would run with the plugin disabled and the route would not exist.

Start the servers once, then run the suite against them:

```sh
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet entity_inventory
node scripts/playwright test --config x-pack/solutions/observability/plugins/entity_inventory/test/scout_entity_inventory/api/playwright.config.ts --project local
```

`node scripts/scout run-tests` starts its own servers, so it does not work against ones already running.

The suite loads the `k8s_deployment` archive from `test/scout_entity_inventory/common/es_archives/k8s_deployment/`. It is hand-written; how it is built and what it holds is in `test/scout_entity_inventory/common/README.md`.
