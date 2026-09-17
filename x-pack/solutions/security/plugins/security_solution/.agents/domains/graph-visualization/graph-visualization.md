# Domain: Graph Visualization

## What every reviewer must know

Graph data flows from Security Solution flyout wrappers through `@kbn/cloud-security-posture-graph` (`GraphInvestigation` → `useFetchGraphData` POST to `/internal/cloud_security_posture/graph`) into ReactFlow rendering, while the CSP server validates requests, runs parallel ES|QL fetches (events, entity relationships, enrichment), and builds the response via a fetch-then-parse pipeline (`fetchGraph` → `parseRecords`). The DTO returned to the frontend must stay decoupled from the raw underlying data (logs-\* and entity latest index) — always transform raw fields into the neutral shape the graph package expects; leaking index-specific field names or entity-store schema details into the DTO breaks the backend's ability to evolve independently. ES|QL grouping (`STATS … BY`) must be maintained at the query level for correctness: pre-aggregation is the authoritative source for node counts and graph shape; TypeScript grouping is only acceptable for the final type/sub-type merge that requires post-enrichment data. Reviewers must treat client payload size, ES|QL grouping/pinning correctness, and space-aware index resolution as first-class constraints — graphs can be massive and incorrect grouping or partial failure handling degrades investigation UX. Server-side label resolution and enrichment under `documentData` are intentional; do not reintroduce client-side label logic or expand the graph schema with per-node asset fields. A second correctness surface sits on the client: `search_filters.ts` translates EUID namespace DSL into filter-bar chips, and that translator must agree exactly with its own translatability gate — an unmodeled clause shape silently produces an over-matching filter rather than a visible error.

The graph visualization feature is owned by **@elastic/contextual-security-apps** (the `kbn-cloud-security-posture/graph` package, the `cloud_security_posture` graph routes, and the CPS common schema/types). The Security Solution flyout files that embed the graph are thin consumers owned by other teams per CODEOWNERS (`flyout_v2` → @elastic/security-threat-hunting; `flyout/entity_details` → @elastic/security-entity-analytics), and are not the domain's maintainers.

## Architectural invariants

- **DTO must stay decoupled from the raw data sources** — The shape returned to the frontend must be neutral to the underlying data (logs-\* indices, entity latest index). Do not leak raw Elasticsearch field names, index-specific structures, or entity-store schema details into the graph DTO; always transform them into the shape the `@kbn/cloud-security-posture-graph` package expects. This decoupling lets the backend data model evolve (e.g. ENRICH → LOOKUP JOIN, entity-store v1 → v2) without breaking the frontend contract.

- **ES|QL grouping must be maintained at the query level** — Pre-aggregation (`STATS … BY`) must stay in ES|QL rather than being deferred to TypeScript, at least to the extent CPS limitations allow. Readable, explicit ES|QL grouping (actor, target, relationship type) is the authoritative source of correctness for node counts and graph shape; TypeScript grouping is only acceptable for the final type/sub-type merge that depends on post-enrichment data. Removing ES|QL grouping degrades both readability and correctness (TypeScript then groups over LIMIT-truncated raw rows).

- **The translatability gate and the translator must agree exactly on representable shapes** — `isFullyTranslatable` and `euidDslClauseToFilters` must model the same set of clause shapes. Any divergence produces a silently weakened filter rather than a visible error. Two consequences follow:
  - **Handle both single-value and array clause shapes.** Elasticsearch DSL allows bool clauses (`must_not`, `must`, `should`, `filter`) to be either a single object or an array. Normalize to an array before iterating; a `?? []` default only covers `undefined`, not the single-object shape.
  - **Fail closed on unmodeled shapes.** Do not fall through to `return []` for clause types the translator does not know (`match`, `terms`, `wildcard`, `range`). Return `undefined` or throw and catch in `buildEntityDslFilter` so `getEntityFilterSpec` falls back to the `fields` path — the broad-but-honest behavior. A silent fall-through contributes nothing to the surrounding AND and just weakens it, collapsing the filter to a single chip (`user.email: alice@example.com`) that matches `alice@aws`, `alice@okta` and `alice@entra_id` alike.

  ([PR #289467](https://github.com/elastic/kibana/pull/289467) · @niros1 · `x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/filters/search_filters.ts`)

- **Client payload must stay minimal** — The graph schema must pass only fields needed for the current use case (e.g. `entity.name`), not all entity/asset fields; violating this inflates responses for large graphs and risks client performance degradation. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/packages/kbn-cloud-security-posture/common/schema/graph/v1.ts`)

- **Per-node enrichment must use `documentData`** — New top-level schema fields for per-node asset/expansion data must not be added; enrichment data must go under the existing `documentData` placeholder; otherwise schema sprawl and inconsistent consumers result. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/packages/kbn-cloud-security-posture/common/schema/graph/v1.ts`)

- **Index names must be space-aware** — Entity/asset index resolution must not hard-code a `_default` suffix; fixed suffixes can query the wrong space's data. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_entity_data.ts`, `x-pack/solutions/security/packages/kbn-cloud-security-posture/common/utils/helpers.ts`)

- **Origin IDs must not appear in logs** — Origin IDs (which may contain PII such as IP addresses) must be omitted from server logs unless there is a concrete use case; otherwise PII may reach Kibana operational logs. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/route.ts`)

- **Backend modules must have single responsibility** — Large mixed-responsibility modules (fetch + parse + enrich in one file) must be split into dedicated files with dedicated tests (e.g. `parse_records`, `fetch_graph`, `fetch_events_graph`); monolithic files hinder navigation and test coverage. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/v1.ts`; [PR #275276](https://github.com/elastic/kibana/pull/275276) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_events_graph.ts`)

- **Fetch-then-parse pipeline must be preserved** — Entity enrichment must not be interleaved inside `parseRecords` loops with scattered fetch params; all relevant data (graph records + entity metadata) must be fetched first, then passed to `parseRecords`; interleaving degrades efficiency when parsing many records. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/v1.ts`)

- **System-status queries must use `asInternal`** — Internal system-status queries must use `asInternal`, not `asCurrentUser`; user-scoped permissions can block operations the user lacks access to even when the query is about system state. User-scoped permissions remain for data queries. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_graph.ts`)

- **TypeScript errors must not be suppressed** — `@ts-ignore` and `@ts-expect-error` must not be used; fix the root cause or update upstream types. ([PR #269755](https://github.com/elastic/kibana/pull/269755) · @niros1 · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_entity_enrichment.ts`)

- **ES|QL must pre-aggregate with `STATS … BY` (never return raw rows)** — The events and relationships queries must run a `STATS … BY` pre-aggregation over the dimensions available *without* entity-store enrichment, instead of returning one raw row per document/triple. Removing ES|QL grouping (as happened when the unsupported `LOOKUP JOIN` was dropped for CPS support) degrades the graph: grouping logic then runs in TypeScript over ungrouped — and `LIMIT`-truncated — records, producing fewer/incorrect results (wrong grouped nodes and counts). The final merge by entity type/sub-type still happens in TypeScript (`regroupEvents` / `regroupRelationships`) because type/sub-type are only known after the follow-up enrichment query, but ES|QL grouping must remain a **strict refinement** of the TS group key so the rendered graph is unchanged — just computed over far fewer rows. ([PR #275276](https://github.com/elastic/kibana/pull/275276) · @alexreal1314, @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_events_graph.ts`, `fetch_entity_relationships_graph.ts`, `parse_records.ts`)

- **Actor→target pairing must be preserved in ES|QL** — ES|QL must not group results by `actorEntityId` and `targetEntityId` separately; use `targetIds = VALUES(targetId)` (not bare `targetId`) to preserve pairing; separate grouping breaks graph data presentation. ([PR #275276](https://github.com/elastic/kibana/pull/275276) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_events_graph.ts`, `fetch_entity_relationships_graph.ts`)

- **Pinned relationships must stay in ES|QL** — Pinned-relationship splitting must not move to TypeScript runtime grouping; split pinned relationships in the ES|QL query (group/sort by pinned first), consistent with `fetch_events_graph`; runtime splitting breaks pinning logic. ([PR #272452](https://github.com/elastic/kibana/pull/272452) · @kfirpeled, @albertoblaz · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_entity_relationships_graph.ts`)

- **Relationship queries must be bidirectional** — Queries must cover both `entity.id equals to` and `entity.relations.* equals to` (reverse direction); one-direction queries miss relationships visible in the entity store. ([PR #251178](https://github.com/elastic/kibana/pull/251178) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_graph.ts`)

- **Relationship query failures must fail the request** — Partial graph results must not be returned when the relationships query fails; the graph request must fail so the UI can surface the error (the UI handles failures better than partial results). ([PR #251178](https://github.com/elastic/kibana/pull/251178) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_entity_relationships_graph.ts`)

- **Only approved relationship fields are supported** — Bidirectional support must be limited to approved fields: Accesses_frequently, Communicates_with, Depends_on, Owns, Supervises; supporting all entity-store relationship fields was explicitly dropped. ([PR #251178](https://github.com/elastic/kibana/pull/251178) · @kfirpeled · `x-pack/solutions/security/packages/kbn-cloud-security-posture/common/constants.ts`)

- **Node label logic must stay server-side** — Label/display resolution must not move to the client; server-side logic keeps behavior consistent across consumers and reduces client CPU on re-render. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/utils.ts`)

- **Missing enrich policy must not error** — When asset-inventory FF is on but enrich policy is not yet created, the handler must detect the missing policy and return 200 with graph data (skip enrichment); otherwise interrupted user workflows break the graph. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/test/cloud_security_posture_api/routes/graph.ts`)

- **Empty entity names must fall back to ID** — Whitespace-only or empty entity names must not render as blank labels; fall back to entity ID. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/entity_data_to_node_props.mapper.ts`)

- **Entity-type constants must stay readable (PascalCase)** — Constants must not be stored all-lowercase; normalize casing at comparison time to avoid easy-to-miss comparison bugs. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/entity_type_constants.ts`)

- **Entity query deduplication must use ES|QL STATS** — When deduplication is known to be needed, duplicate rows must be deduplicated in the query via STATS, not returned to the client/parser. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_entity_data.ts`)

- **Pinned entities must check target side** — Pinned-entity resolution must not only check the actor side; when pinned, target relationships must be checked too (entities can be grouped by target or actor). ([PR #272452](https://github.com/elastic/kibana/pull/272452) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_entity_relationships_graph.ts`)

- **FORK branch limit must be documented when adding relationship fields** — New relationship fields must document the 8-FORK-branch ES|QL limit when approaching it; undocumented additions risk query failure at the ES|QL layer. ([PR #251178](https://github.com/elastic/kibana/pull/251178) · @kfirpeled · `x-pack/solutions/security/packages/kbn-cloud-security-posture/common/constants.ts`)

- **Avoid premature meta-mapping generalization** — Generic meta-mapping utilities must not be built before the use case is proven; use simple hard-coded field assignments (e.g. `entity.name` → label, `entity.type` → icon) visible in code. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/fetch_entity_data.ts`)

- **Graph PRs must not include out-of-scope API changes** — Unrelated OpenAPI/API diffs must not ship in graph PRs; cross-API changes slow review and blur scope. ([PR #269755](https://github.com/elastic/kibana/pull/269755) · @kfirpeled · `oas_docs/output/kibana.serverless.yaml`)

- **Unused schema types must be removed** — Schema types that existing schemas do not reuse must not be added or left in place. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @albertoblaz · `x-pack/solutions/security/packages/kbn-cloud-security-posture/common/schema/graph/v1.ts`)

- **Graph filters and actions always expand, never narrow** — `addEntityFilter` intentionally wraps graph-generated chips in OR. This is by design: filters and actions performed on the graph always add to and expand the graph view. Intersecting all filters with AND would narrow the results too much and hide valuable investigative information. Do not change this to an AND relationship. (@alexreal1314, [PR #289467](https://github.com/elastic/kibana/pull/289467))

## Common review patterns (learned from real PRs)

- **Count naming encodes what is counted** — `count` is the combined total (`uniqueEventsCount + uniqueAlertsCount`); use `uniqueEventsCount` and `uniqueAlertsCount` for the sub-aggregates. This is the intended convention across the entire graph API — schema, parser, and integration tests — not just test files. (@JordanSh, [PR #285449](https://github.com/elastic/kibana/pull/285449) · `x-pack/solutions/security/test/cloud_security_posture_api/routes/graph.ts`)

- **EUID filter translation bugs are caught by unit/integration/FTR coverage, not archive fixtures** — The bugs in [PR #289467](https://github.com/elastic/kibana/pull/289467) were not caught because no fixture exercised condition-based namespaces (`local`, asset-discovery). Adding condition-based-namespace fixtures to the graph test archives is not a standing requirement — sufficient unit test, API integration, and FTR coverage is the team's standard. (@niros1, [PR #289467](https://github.com/elastic/kibana/pull/289467) · `search_filters.ts`)

- **ESQL readability vs extraction** — Reviewers push back on over-extracting ES|QL into many variables or leaving entirely inline blobs; agreed balance is minimal splitting without large duplicated chunks. (@kfirpeled, @albertoblaz, [PR #227784](https://github.com/elastic/kibana/pull/227784) · `fetch_graph.ts`)

- **Exported types belong in `types.ts`** — Exported types that risk cyclic imports should live in `types.ts`, not co-located in implementation files; internal-only types may stay co-located. (@kfirpeled, [PR #227784](https://github.com/elastic/kibana/pull/227784) · `entity_type_constants.ts`)

- **Node shape from `entity.type`** — Prefer entity-store `entity.type` → shape mapping over legacy host/user/ip heuristics; `tag` remains optional when type is missing. (@kfirpeled, [PR #227784](https://github.com/elastic/kibana/pull/227784) · `parse_records.ts`)

- **Connector terminology** — Use `ConnectorEdges` / connector terminology aligned across frontend and backend, not `LabelEdges` / confusing label naming. (@alexreal1314, [PR #251178](https://github.com/elastic/kibana/pull/251178) · `parse_records.ts`)

- **Deduplication default off** — Do not add deduplication without a proven production use case; over-deduplication is considered less harmful than missing data initially. (@kfirpeled, [PR #258435](https://github.com/elastic/kibana/pull/258435) · `parse_records.ts`)

- **Retry helpers in common** — Reusable retry helpers should live under common and align with existing Kibana retry utilities, not ad-hoc helpers inside route files. (@kfirpeled, [PR #269755](https://github.com/elastic/kibana/pull/269755) · `fetch_entity_enrichment.ts`)

- **Enrichment page size** — Very small pagination (e.g. 100) for parallel entity enrichment fetches is flagged as too small; reviewers suggested 5k, authors settled on 1k. (@kfirpeled, [PR #269755](https://github.com/elastic/kibana/pull/269755) · `fetch_entity_enrichment.ts`)

- **Test business requirements, not ESQL construction** — Tests should assert behavior (e.g. query works for both actors and targets), not internal ESQL string construction details. (@albertoblaz, [PR #251178](https://github.com/elastic/kibana/pull/251178) · `fetch_entity_relationships_graph.test.ts`)

- **Fetch missing event fields in relationship graph** — `fetch_entity_relationships_graph.ts` must fetch the same host/IP fields as the events graph when creating entity nodes not found in `nodesMap`. (@albertoblaz, [PR #251178](https://github.com/elastic/kibana/pull/251178) · `types.ts`)

- **Non-interactive nodes must not respond to clicks** — When `interactive={false}`, mouse click/hover effects must be disabled across node types. (@kfirpeled, [PR #249479](https://github.com/elastic/kibana/pull/249479) · `relationship_node.stories.tsx`)

- **Stacked relationship nodes pending design** — Stacked relationship groups were left supported intentionally while design confirmation is pending; do not assume stacking is permanently rejected. (@kfirpeled, [PR #249479](https://github.com/elastic/kibana/pull/249479) · `common/schema/graph/v1.ts`)

- **No FF gating for expand popover option** — Entity expand popover option should not be gated behind entityStoreV2 FF; graph gating on entity store is expected later. (@kfirpeled, [PR #252803](https://github.com/elastic/kibana/pull/252803) · `use_entity_node_expand_popover.ts`)

## Security considerations

- **Silently weakened EUID filters are an authorization-adjacent correctness risk** — A filter that falls through to `return []` for an unmodeled clause shape does not fail visibly; it renders a chip that matches a broader entity population than the user's namespace intends (`user.email: alice@example.com` matching `alice@aws`, `alice@okta`, `alice@entra_id`). Reviewers must treat the fail-closed rule as a data-scoping guarantee, not a cosmetic filter-bar concern. An over-matching filter should not reach the user in practice — it can appear only briefly before the EUID API loads. ([PR #289467](https://github.com/elastic/kibana/pull/289467) · @niros1 · `search_filters.ts`)

- **Origin IDs must not be logged** — Server route logging must omit origin IDs that may contain PII (e.g. IP addresses); operational logs can propagate PII into Kibana observability paths. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `cloud_security_posture/server/routes/graph/route.ts`)

- **Index resolution must be space-aware** — Hard-coded `_default` suffixes for entity/asset indices can cause cross-space data access or wrong-space queries in multi-space deployments. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `fetch_entity_data.ts`, `common/utils/helpers.ts`)

- **User vs internal ES client scope** — Data queries must use user permissions (`asCurrentUser`); internal system-status queries must use `asInternal` so permission gaps do not block legitimate system checks or leak unintended access patterns. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `fetch_graph.ts`)

- **Platinum license gate is applied only on the main graph route** — `server/routes/graph/route.ts:63` checks `license.hasAtLeast('platinum')` before serving data. The `graph_events` and `graph_entities` detail routes gate on the `securitySolution` privilege only and have no license check. Reviewers adding new graph endpoints should apply the Platinum gate explicitly rather than assuming it is inherited. **Open question for the team:** whether the detail routes should enforce the gate independently, or whether reachability-only-after-the-main-route is considered sufficient. (`server/routes/graph/route.ts:63`, `server/routes/graph_events/route.ts:24`, `server/routes/graph_entities/route.ts`)

- **Client payload minimization** — Passing full entity/asset field sets to the browser expands the attack surface for data exfiltration via large graph responses and increases exposure of fields not needed for visualization. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `common/schema/graph/v1.ts`)

- **Full error messages and stacks must not reach the client** — `use_fetch_graph_data` deliberately withholds the full error message and stack from the browser; richer client-side error detail is not acceptable even for authorized internal API callers. Server logs are the place for diagnostic detail. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `graph/src/hooks/use_fetch_graph_data.ts`)

## Performance constraints

- **Minimize client payload** — Graph responses can be massive; only pass fields required for the current visualization use case. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `common/schema/graph/v1.ts`)

- **Fetch-then-parse for large record sets** — All fetches (graph records + entity metadata) must complete before `parseRecords`; interleaved enrichment in parse loops is inefficient at scale. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `v1.ts`)

- **ES|QL grouping and pairing must stay in-query** — Actor→target pairing and pinned-relationship splitting belong in ES|QL; moving them to TypeScript risks record-limit trade-offs and breaks pinning/grouping correctness. ([PR #275276](https://github.com/elastic/kibana/pull/275276) · @kfirpeled; [PR #272452](https://github.com/elastic/kibana/pull/272452) · @kfirpeled, @albertoblaz)

- **8-FORK-branch ES|QL limit** — Relationship field additions approach an 8-branch FORK limit documented in constants; exceeding it breaks ES|QL query execution. ([PR #251178](https://github.com/elastic/kibana/pull/251178) · @kfirpeled · `common/constants.ts`)

- **Enrichment pagination page size** — Parallel entity enrichment fetches should not use very small page sizes (e.g. 100); team settled on 1k after reviewer suggested 5k. Entity enrichment is chunked at 1,000 IDs per query. ([PR #269755](https://github.com/elastic/kibana/pull/269755) · @kfirpeled · `fetch_entity_enrichment.ts`; chunk size referenced at `server/routes/graph/fetch_graph.ts:169`)

- **ES|QL STATS for deduplication** — Prefer STATS in the query for known duplicate rows rather than shipping duplicates to the parser/client. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `fetch_entity_data.ts`)

- **Server-side label resolution** — Label logic on the server reduces client CPU during ReactFlow re-renders for large graphs. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `graph/src/components/utils.ts`)

- **`nodesLimit` truncates the graph and emits a message** — `parseRecords` applies `nodesLimit` and emits `REACHED_NODES_LIMIT` when triggered; changes that increase node production per record push graphs into truncation sooner. ([code-architecture.md] · `server/routes/graph/parse_records.ts:74`)

- **ES|QL `STATS … BY` pre-aggregation is mandatory; only the type/sub-type merge belongs in TypeScript** — Resolved by [PR #275276](https://github.com/elastic/kibana/pull/275276): the events and relationships queries must pre-aggregate in ES|QL (`STATS … BY` over pre-enrichment dimensions) so grouping runs before the `LIMIT`. Do not move grouping into TypeScript over raw rows. The only grouping allowed in TypeScript is the final merge by entity type/sub-type (`regroupEvents` / `regroupRelationships`), which is unavoidable because type/sub-type are only known after the follow-up enrichment query — and it must be a strict refinement of the ES|QL group key.

## Historical catches

- [PR #289467](https://github.com/elastic/kibana/pull/289467) — Reviewer caught that `must_not` was destructured with an `= []` default and mapped directly, crashing with `TypeError: mustNot.map is not a function` when a node's namespace came from a condition-based `whenClause` (most commonly a local user) because `conditionToQueryDsl` emits `must_not` as a single object. A generic reviewer would read `must_not ?? []` as safe and would not know which upstream namespace resolution path produces the non-array shape. (@niros1 · `search_filters.ts`)

- [PR #289467](https://github.com/elastic/kibana/pull/289467) — Reviewer caught that the DSL-to-filter translator fell through to `return []` for `match`/`terms`/`wildcard`/`range`, silently weakening the AND and re-introducing the exact entity over-matching (`alice@aws` / `alice@okta` / `alice@entra_id`) the PR set out to fix, for asset-discovery-namespaced entities. A generic reviewer would see an empty-array default as a harmless no-op rather than a silent scope expansion. (@niros1 · `search_filters.ts`)

- [PR #275276](https://github.com/elastic/kibana/pull/275276) — All ES|QL `STATS … BY` grouping for the events and entities/relationships queries had been removed by mistake when the unsupported `LOOKUP JOIN` was dropped for CPS support. Without pre-aggregation the queries returned one raw row per document/triple, and grouping then ran in TypeScript over ungrouped (and `LIMIT`-truncated) records — degrading graph capability by producing fewer results and incorrect grouped nodes/counts. Fixed by restoring the `STATS … BY` clauses in ES|QL, keeping the TS type/sub-type merge as a strict refinement of the ES|QL group key. A generic reviewer would treat grouping location as a performance detail and miss that dropping ES|QL pre-aggregation changes the *correctness* of the rendered graph. (@alexreal1314 · `fetch_events_graph.ts`, `fetch_entity_relationships_graph.ts`, `parse_records.ts`)

- [PR #275276](https://github.com/elastic/kibana/pull/275276) — Reviewer caught that grouping `actorEntityId` and `targetEntityId` separately breaks actor→target pairing; fix requires `VALUES(targetId)` in ES|QL — a generic reviewer would not know separate GROUP BY columns collapse paired event semantics. (@kfirpeled · `fetch_events_graph.ts`, `fetch_entity_relationships_graph.ts`)

- [PR #272452](https://github.com/elastic/kibana/pull/272452) — Pinning logic must stay in ES|QL and check both actor and target sides when resolving pinned entities — runtime TypeScript splitting was rejected because it breaks pinning behavior invisible in UI-only review. (@kfirpeled, @albertoblaz · `fetch_entity_relationships_graph.ts`)

## Documentation

_(none provided)_

## Who to contact

- **Graph filter-bar semantics / EUID DSL translation:** @niros1 — `search_filters.ts` translator correctness, fail-closed design, `must_not` polymorphism, `@ts-ignore` policy, ES|QL row limits ([PR #289467](https://github.com/elastic/kibana/pull/289467), [PR #269755](https://github.com/elastic/kibana/pull/269755))

- **Filter AND/OR semantics, enrichment data flow, API test assertions:** @JordanSh — `addEntityFilter` OR-wrapping behavior, conditional vs unconditional enrichment calls, count naming in integration tests ([PR #289467](https://github.com/elastic/kibana/pull/289467), [PR #285449](https://github.com/elastic/kibana/pull/285449))

- **Architecture / data model / ES|QL grouping & pinning:** @kfirpeled — Graph API architecture, fetch→parse pipeline, payload size, CPS constraints, test strategy ([PR #227784](https://github.com/elastic/kibana/pull/227784), [PR #275276](https://github.com/elastic/kibana/pull/275276), [PR #272452](https://github.com/elastic/kibana/pull/272452))

- **Schema consistency / frontend-backend alignment / test scope:** @albertoblaz — Schema reuse, entity flyout integration, business-requirement tests ([PR #227784](https://github.com/elastic/kibana/pull/227784), [PR #251178](https://github.com/elastic/kibana/pull/251178))

- **Entity identification & enrichment evolution / integration tests:** @alexreal1314 — ECS entity-namespace alignment, Entity Store v1→v2 migration, LOOKUP JOIN → follow-up enrichment, connector terminology (`ConnectorEdges`), flaky-test stabilization ([PR #243711](https://github.com/elastic/kibana/pull/243711), [PR #251178](https://github.com/elastic/kibana/pull/251178), [PR #258435](https://github.com/elastic/kibana/pull/258435), [PR #269755](https://github.com/elastic/kibana/pull/269755))

- **Team ownership (CODEOWNERS):** @elastic/contextual-security-apps owns and maintains the graph visualization feature — `kbn-cloud-security-posture/graph`, `cloud_security_posture` graph routes, and CPS common schema/types. Flyout embedding files are consumer-owned: @elastic/security-threat-hunting (`flyout_v2` graph wrappers) and @elastic/security-entity-analytics (`flyout/entity_details` graph preview).
