# Domain: Graph Visualization

## What every reviewer must know

This area renders the security graph shown in the events and entities flyout: events and entities appear as entity nodes, while actions and relationships appear as action/relationship (connector) nodes with edges directed from the actor entity to the target. There are two distinct entry modes that converge on the same API: **event/alert mode** (caller provides `originEventIds`) and **entity mode** (caller provides `entityIds` from Entity Store v2 EUIDs). Both POST to `/internal/cloud_security_posture/graph` via `useFetchGraphData` (`graph/src/hooks/use_fetch_graph_data.ts:105`), where the server orchestrator `fetchGraph` runs `fetchEvents` (ES|QL FORK + LOOKUP JOIN against logs/alerts) and `fetchEntityRelationships` (ES|QL FORK over `ENTITY_RELATIONSHIP_FIELDS` against `.entities.v2.latest.security_*`) concurrently, then `parseRecords` normalizes them into a `GraphResponse` and enforces a hard 300-node cap (`server/routes/graph/fetch_graph.ts:50`, `server/routes/graph/parse_records.ts`). The single most under-documented behavior is **grouping** — why certain nodes are grouped together and others are not — which lives in `parse_records.ts` and `layout_graph.ts` and has no integration-level test, so it is the thing first-time reviewers most often get wrong.

## Architectural invariants

- **ES|QL JSON must be built through the named helper utilities in `esql_utils.ts`, never via inline string concatenation** — The expert names "DRY concept, maintain coherent esql queries as they are long and tend to be hard to get at first" as the core rule. Hand-rolled JSON building in ES|QL (e.g. `CONCAT("{\"id\":\"", entity.id, "\"...")`) is fragile and was mandated for extraction into one-line helpers (`concatJsonObjectPropertyEsqlExprSafe`, `concatJsonObjectPropertyEsqlExprAsString`, etc.). Violations produce malformed JSON and recurring correctness bugs. (https://github.com/elastic/kibana/pull/251178 · @kfirpeled · `server/routes/graph/fetch_entity_relationships_graph.ts`; https://github.com/elastic/kibana/pull/260174 · @macroscopeapp)
- **Use the AsString helper (not the Safe variant) for mandatory identifier fields** — `entity.id` and `_target_id` are never NULL; `concatJsonObjectPropertyEsqlExprSafe` returns empty string on NULL and produces malformed JSON (`{,"type":...`) when followed by an unconditional separator. Use `concatJsonObjectPropertyEsqlExprAsString` for these. (https://github.com/elastic/kibana/pull/260174 · @macroscopeapp · `server/routes/graph/fetch_entity_relationships_graph.ts`)
- **Target ESQL CASE conditions must check target fields, not source fields** — `targetDocData` blocks must use `_target_name IS NOT NULL`, `_target_type IS NOT NULL`, `_target_sub_type IS NOT NULL`; using source-entity field variables shapes target doc data by source nullability instead of target nullability. (https://github.com/elastic/kibana/pull/260174 · @macroscopeapp · `server/routes/graph/fetch_entity_relationships_graph.ts`)
- **Only the approved active-direction relationship fields are allowed** — Keep only `Accesses_frequently`, `Communicates_with`, `Depends_on`, `Owns`, `Supervises`. Bidirectional variants (e.g. `Owned_by`, `Supervised_by`) were explicitly rejected: "we decided to drop the bi-directional relationships". (https://github.com/elastic/kibana/pull/251178 · @kfirpeled · `common/constants.ts`)
- **The data model must not be coupled to UI labels** — Map each relationship type to a named enum/constant so the data-model value and the displayed text stay decoupled. (https://github.com/elastic/kibana/pull/251178 · @kfirpeled · `server/routes/graph/parse_records.ts`)
- **Both the entities v2 index and the logs index must be available for the graph to populate** — The expert confirms "entities v2 index should be available as well as events in the logs-* index." Entity relationships are read from `.entities.v2.latest.security_*` and events from `logs-*` / `.alerts-security.alerts-{spaceId}`; if either source is missing, the corresponding nodes/edges will not appear. (interview Q4; `server/routes/graph/fetch_entity_relationships_graph.ts:54`, `fetch_events_graph.ts:57`)
- **The 300-node cap must be respected** — `parseRecords` enforces `GRAPH_NODES_LIMIT = 300` and appends `ApiMessageCode.ReachedNodesLimit` to the response when exceeded; this keeps graph rendering optimized. Bypassing it degrades client rendering. (interview Q5; `graph/src/common/constants.ts`, `server/routes/graph/parse_records.ts`)
- **Large fetch logic must be split by responsibility** — Event-fetching and relationship-fetching must not be combined into one oversized file; keep `fetch_graph.ts` (orchestrator), `fetch_events_graph.ts`, and `fetch_entity_relationships_graph.ts` separate. (https://github.com/elastic/kibana/pull/251178 · @kfirpeled · `server/routes/graph/fetch_graph.ts`)

## Common review patterns (learned from real PRs)

- **Fragile ES|QL JSON construction** — The single most recurrent hot spot: at least 6 threads across 2 PRs concern wrong `Safe` vs `AsString` helper choice and missing/extra comma separators when refactoring the JSON helpers. When a helper's comma-prefix behavior changes, all call sites must be updated in the same change. (https://github.com/elastic/kibana/pull/251178, https://github.com/elastic/kibana/pull/260174 · @kfirpeled, @macroscopeapp · `server/routes/graph/fetch_entity_relationships_graph.ts`, `fetch_events_graph.ts`)
- **Origin-entity flag propagation** — An `isInitialEntity`/`isOrigin` flag added to expand-popover logic must also be propagated to `entity_actions_button.tsx`, which controls filter updates from the flyout section, so behavior stays consistent. (https://github.com/elastic/kibana/pull/260174 · @albertoblaz · `graph/src/components/popovers/node_expand/use_entity_node_expand_popover.ts`)
- **Memoize stable empty arrays passed to hooks** — Inline `entityIds ?? []` creates a new reference every render (`[] !== []`), causing `store.setInitialEntityIds` to re-run and `entityIdsForApi` to recalculate, potentially triggering unwanted API re-fetches. Use a `useMemo(() => [], [])` constant. (https://github.com/elastic/kibana/pull/260174 · @macroscopeapp · `graph/src/components/graph_investigation/graph_investigation.tsx`)
- **Scoped ES client for relationship queries** — `fetchEntityRelationships` should run against the user-scoped `IScopedClusterClient`, not an internal/super-user client, so Elasticsearch requests respect the requesting user's permissions. (https://github.com/elastic/kibana/pull/251178 · @kfirpeled · `server/routes/graph/fetch_entity_relationships_graph.ts`)
- **Fail the graph request when the relationships sub-query fails** — Prefer surfacing a clear error over returning partial results, since the UI handles failures better than silent partial graphs. (https://github.com/elastic/kibana/pull/251178 · @kfirpeled · `server/routes/graph/fetch_entity_relationships_graph.ts`)
- **API schema comments stay at the API-contract level** — Do not document how a schema field is used by the current UI; describe what the field means at the API level so comments do not go stale when the UI changes. (https://github.com/elastic/kibana/pull/251178 · @kfirpeled · `common/schema/graph/v1.ts`)
- **Test business outcomes, not the generated ES|QL string** — Relationship-fetch tests should assert observable outcomes ("actors and targets appear as nodes", "stacked connector nodes for same source-target pairs"), not the exact query/DSL, which is an implementation detail. (https://github.com/elastic/kibana/pull/251178 · @albertoblaz · `server/routes/graph/fetch_entity_relationships_graph.test.ts`)

## Security considerations

The expert characterized this area as having "nothing special" with respect to security. The one domain-relevant, non-generic point surfaced in PR review (not raised by the expert) is that entity relationship queries should run with the user-scoped ES client rather than an internal/super-user client, so relationship reads respect the requesting user's authorization (https://github.com/elastic/kibana/pull/251178 · @kfirpeled). _No further domain-specific security constraints were identified by the expert._

## Performance constraints

- **Returned node count is the governing performance constraint** — The expert: "performance constraints are related to the max number of nodes allowed to be returned by the query so the graph rendering remains optimized." This is the `GRAPH_NODES_LIMIT = 300` cap enforced in `parse_records.ts`; exceeding it is signalled via `ApiMessageCode.ReachedNodesLimit`. Changes that materially increase node counts (e.g. frequently-appearing new node types) will degrade `@xyflow/react` rendering and the Dagre layout pass. (interview Q5; `graph/src/common/constants.ts`, `server/routes/graph/parse_records.ts`)
- **ES|QL FORK branch count is a known open limit** — The relationship query can exceed 8 FORK branches due to Elasticsearch memory limitations; a workaround was reverted in PR #251178 and whether this hard-caps the number of supportable relationship types remains unresolved. (https://github.com/elastic/kibana/pull/251178 · @alexreal1314 / @kfirpeled)

## Historical catches

- [PR #243711](https://github.com/elastic/kibana/pull/243711) — Review caught a way to omit fields that do not exist as an empty string, where COALESCE evaluates the empty string to undefined so the field is dropped from the JSON. A generic reviewer would miss this because it depends on ES|QL NULL/empty-string semantics specific to how this area builds JSON in queries. (interview Q7)

## Documentation

Links to existing documentation for this domain (Confluence, wikis, ADRs, READMEs):

- https://codex.elastic.dev/r/security-team/cloud-security-team/cdr/graph-visualization

## Who to contact

- Architecture / data model / graph & grouping questions: @alexreal1314 (domain expert)
- Server routes, ES|QL fetch/parse, API schema, PR scope: @kfirpeled
- Server routes, flyout hooks, data-flow and naming review: @albertoblaz
- Flyout component placement / hook organization (flyout, flyout_v2): @PhilippeOberti
- Owning team: @elastic/contextual-security-apps
