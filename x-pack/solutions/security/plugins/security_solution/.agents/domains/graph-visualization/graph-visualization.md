# Domain: Graph Visualization

## What every reviewer must know

Graph data flows from Security Solution flyout wrappers through `@kbn/cloud-security-posture-graph` (`GraphInvestigation` → `useFetchGraphData` POST to `/internal/cloud_security_posture/graph`) into ReactFlow rendering, while the CSP server validates requests, runs parallel ES|QL fetches (events, entity relationships, enrichment), and builds the response via a fetch-then-parse pipeline (`fetchGraph` → `parseRecords`). Reviewers must treat client payload size, ES|QL grouping/pinning correctness, and space-aware index resolution as first-class constraints — graphs can be massive and incorrect grouping or partial failure handling degrades investigation UX. Server-side label resolution and enrichment under `documentData` are intentional; do not reintroduce client-side label logic or expand the graph schema with per-node asset fields.

The graph visualization feature is owned by **@elastic/contextual-security-apps** (the `kbn-cloud-security-posture/graph` package, the `cloud_security_posture` graph routes, and the CPS common schema/types). The Security Solution flyout files that embed the graph are thin consumers owned by other teams per CODEOWNERS (`flyout_v2` → @elastic/security-threat-hunting; `flyout/entity_details` → @elastic/security-entity-analytics), and are not the domain's maintainers.

## Architectural invariants

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

## Common review patterns (learned from real PRs)

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

- **Origin IDs must not be logged** — Server route logging must omit origin IDs that may contain PII (e.g. IP addresses); operational logs can propagate PII into Kibana observability paths. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `cloud_security_posture/server/routes/graph/route.ts`)

- **Index resolution must be space-aware** — Hard-coded `_default` suffixes for entity/asset indices can cause cross-space data access or wrong-space queries in multi-space deployments. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `fetch_entity_data.ts`, `common/utils/helpers.ts`)

- **User vs internal ES client scope** — Data queries must use user permissions (`asCurrentUser`); internal system-status queries must use `asInternal` so permission gaps do not block legitimate system checks or leak unintended access patterns. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `fetch_graph.ts`)

- **Client payload minimization** — Passing full entity/asset field sets to the browser expands the attack surface for data exfiltration via large graph responses and increases exposure of fields not needed for visualization. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `common/schema/graph/v1.ts`)

> **[VERIFY]:** Should `use_fetch_graph_data` continue hiding full error message/stack from the client for security, or is richer client-side error detail acceptable for authorized internal API callers? ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled)

## Performance constraints

- **Minimize client payload** — Graph responses can be massive; only pass fields required for the current visualization use case. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `common/schema/graph/v1.ts`)

- **Fetch-then-parse for large record sets** — All fetches (graph records + entity metadata) must complete before `parseRecords`; interleaved enrichment in parse loops is inefficient at scale. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `v1.ts`)

- **ES|QL grouping and pairing must stay in-query** — Actor→target pairing and pinned-relationship splitting belong in ES|QL; moving them to TypeScript risks record-limit trade-offs and breaks pinning/grouping correctness. ([PR #275276](https://github.com/elastic/kibana/pull/275276) · @kfirpeled; [PR #272452](https://github.com/elastic/kibana/pull/272452) · @kfirpeled, @albertoblaz)

- **8-FORK-branch ES|QL limit** — Relationship field additions approach an 8-branch FORK limit documented in constants; exceeding it breaks ES|QL query execution. ([PR #251178](https://github.com/elastic/kibana/pull/251178) · @kfirpeled · `common/constants.ts`)

- **Enrichment pagination page size** — Parallel entity enrichment fetches should not use very small page sizes (e.g. 100); team settled on 1k after reviewer suggested 5k. ([PR #269755](https://github.com/elastic/kibana/pull/269755) · @kfirpeled · `fetch_entity_enrichment.ts`)

- **ES|QL STATS for deduplication** — Prefer STATS in the query for known duplicate rows rather than shipping duplicates to the parser/client. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `fetch_entity_data.ts`)

- **Server-side label resolution** — Label logic on the server reduces client CPU during ReactFlow re-renders for large graphs. ([PR #227784](https://github.com/elastic/kibana/pull/227784) · @kfirpeled · `graph/src/components/utils.ts`)

> **[VERIFY]:** Raising ES|QL LIMIT to 50k for entity-ID-level grouping needs documented rationale and truncation handling given ES default max 10k rows. ([PR #269755](https://github.com/elastic/kibana/pull/269755) · @niros1)

- **ES|QL `STATS … BY` pre-aggregation is mandatory; only the type/sub-type merge belongs in TypeScript** — Resolved by [PR #275276](https://github.com/elastic/kibana/pull/275276): the events and relationships queries must pre-aggregate in ES|QL (`STATS … BY` over pre-enrichment dimensions) so grouping runs before the `LIMIT`. Do not move grouping into TypeScript over raw rows. The only grouping allowed in TypeScript is the final merge by entity type/sub-type (`regroupEvents` / `regroupRelationships`), which is unavoidable because type/sub-type are only known after the follow-up enrichment query — and it must be a strict refinement of the ES|QL group key.

## Historical catches

- [PR #243711](https://github.com/elastic/kibana/pull/243711) → [PR #258435](https://github.com/elastic/kibana/pull/258435) → [PR #269755](https://github.com/elastic/kibana/pull/269755) — Entity identification/enrichment evolved from ECS entity-namespace fields with Entity Store v1 `ENRICH`, to v2 (removing v1 `ENRICH`), to follow-up two-phase enrichment (fetch graph records, then fetch entity metadata by ID) replacing `LOOKUP JOIN` for CPS/project routing; a generic reviewer might reintroduce v1 `ENRICH` or `LOOKUP JOIN` patterns already superseded. (@alexreal1314, @kfirpeled)

- [PR #275276](https://github.com/elastic/kibana/pull/275276) — All ES|QL `STATS … BY` grouping for the events and entities/relationships queries had been removed by mistake when the unsupported `LOOKUP JOIN` was dropped for CPS support. Without pre-aggregation the queries returned one raw row per document/triple, and grouping then ran in TypeScript over ungrouped (and `LIMIT`-truncated) records — degrading graph capability by producing fewer results and incorrect grouped nodes/counts. Fixed by restoring the `STATS … BY` clauses in ES|QL, keeping the TS type/sub-type merge as a strict refinement of the ES|QL group key. A generic reviewer would treat grouping location as a performance detail and miss that dropping ES|QL pre-aggregation changes the *correctness* of the rendered graph. (@alexreal1314 · `fetch_events_graph.ts`, `fetch_entity_relationships_graph.ts`, `parse_records.ts`)

- [PR #275276](https://github.com/elastic/kibana/pull/275276) — Reviewer caught that grouping `actorEntityId` and `targetEntityId` separately breaks actor→target pairing; fix requires `VALUES(targetId)` in ES|QL — a generic reviewer would not know separate GROUP BY columns collapse paired event semantics. (@kfirpeled · `fetch_events_graph.ts`, `fetch_entity_relationships_graph.ts`)

- [PR #272452](https://github.com/elastic/kibana/pull/272452) — Pinning logic must stay in ES|QL and check both actor and target sides when resolving pinned entities — runtime TypeScript splitting was rejected because it breaks pinning behavior invisible in UI-only review. (@kfirpeled, @albertoblaz · `fetch_entity_relationships_graph.ts`)

- [PR #251178](https://github.com/elastic/kibana/pull/251178) — Relationship query failures must fail the whole graph request (not return partial results), and only five approved relationship fields are supported with an 8-FORK ES|QL branch limit — generic reviewers may treat partial data as acceptable degradation or add unapproved bidirectional fields. (@kfirpeled, @alexreal1314 · `fetch_entity_relationships_graph.ts`, `common/constants.ts`)

- [PR #227784](https://github.com/elastic/kibana/pull/227784) — Client payload, `documentData` enrichment placement, space-aware indices, and PII-in-logs constraints were established together in the foundational graph API PR — changes touching schema, logging, or index helpers without these constraints regress core domain guarantees. (@kfirpeled · `common/schema/graph/v1.ts`, `route.ts`, `fetch_entity_data.ts`)

## Documentation

_(none provided)_

## Who to contact

- **Architecture / data model / ES|QL grouping & pinning:** @kfirpeled — Graph API architecture, fetch→parse pipeline, payload size, CPS constraints, test strategy ([PR #227784](https://github.com/elastic/kibana/pull/227784), [PR #275276](https://github.com/elastic/kibana/pull/275276), [PR #272452](https://github.com/elastic/kibana/pull/272452))

- **Schema consistency / frontend-backend alignment / test scope:** @albertoblaz — Schema reuse, entity flyout integration, business-requirement tests ([PR #227784](https://github.com/elastic/kibana/pull/227784), [PR #251178](https://github.com/elastic/kibana/pull/251178))

- **Entity identification & enrichment evolution / integration tests:** @alexreal1314 — ECS entity-namespace alignment, Entity Store v1→v2 migration, LOOKUP JOIN → follow-up enrichment, connector terminology (`ConnectorEdges`), flaky-test stabilization ([PR #243711](https://github.com/elastic/kibana/pull/243711), [PR #251178](https://github.com/elastic/kibana/pull/251178), [PR #258435](https://github.com/elastic/kibana/pull/258435), [PR #269755](https://github.com/elastic/kibana/pull/269755))

- **Type safety / ES query limits:** @niros1 — `@ts-ignore` policy, ES|QL row limits, LOOKUP JOIN migration completeness ([PR #269755](https://github.com/elastic/kibana/pull/269755))

- **Team ownership (CODEOWNERS):** @elastic/contextual-security-apps owns and maintains the graph visualization feature — `kbn-cloud-security-posture/graph`, `cloud_security_posture` graph routes, and CPS common schema/types. Flyout embedding files are consumer-owned: @elastic/security-threat-hunting (`flyout_v2` graph wrappers) and @elastic/security-entity-analytics (`flyout/entity_details` graph preview).
