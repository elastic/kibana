---
name: Entity Maintainer
slug: entity-maintainer
owner: niros1
kibana_paths:
  - x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/maintainers/**
  - x-pack/solutions/security/plugins/entity_store/server/tasks/entity_maintainers/**
  - x-pack/solutions/security/plugins/entity_store/server/domain/entity_maintainers/**
  - x-pack/solutions/security/plugins/entity_store/server/routes/apis/entity_maintainers/**
  - x-pack/solutions/security/plugins/entity_store/common/entity_maintainers.ts
  - x-pack/solutions/security/plugins/security_solution/test/scout_cps_local/api/tests/maintainers/**
last_updated: 2026-05-28
source_prs:
  - https://github.com/elastic/kibana/pull/266159
---

# Domain: Entity Maintainer

## What every reviewer must know

The entity maintainer domain has two distinct layers that reviewers commonly confuse. The **relationship engine** (`security_solution/maintainers/engine/`) is a generic, config-driven pipeline that runs a two-step query (Step 1: composite aggregation to discover actors; Step 2: ES|QL per-actor targets) and writes results to the entity store. The **task framework** (`entity_store/tasks/entity_maintainers/`) wraps this engine in Kibana Task Manager and provides the scheduling, lifecycle (`setup`/`run`), license enforcement, and abort propagation that any maintainer — relationship or otherwise — uses.

The core invariant reviewers miss most: **Step 1 and Step 2 must always be gated and filtered using the same config fields and the same code path.** The two steps are a single logical pass split across two ES operations. Any filter applied in Step 1 that is not mirrored in Step 2 (or vice versa) produces silent data loss or wasted work — no error is thrown, no warning is logged unless you add one explicitly.

A second invisible rule: **the engine must carry no integration-specific data logic.** All event filtering (action types, outcome values, field existence checks) belongs in the config object's `compositeAggAdditionalFilters`, `esqlWhereClause`, and `requireTargetEntityIdExists` fields. If adding a new relationship type requires editing any engine file, the abstraction has been broken.

Actor entity type is currently hardcoded to `user` across four engine files (follow-up tracked in #266748). This is a known limitation, not a design choice — do not add more `'user'` hardcodes; thread the type through if needed.

## Architectural invariants

- **Step 1 and Step 2 actor-presence gates must derive from the same source fields.** When `customActor.fields` is set, both `build_actor_discovery_query.ts` (DSL composite-agg base filter) and `build_targets_per_actor_query.ts` (ES|QL `AND (...)` clause) must derive the actor-presence gate from `customActor.fields`. Using different fields in the two steps causes Step 1 to return zero buckets for custom-actor integrations (e.g. Azure, whose documents lack ECS `user.*` fields) — Step 2 never runs — silent zero output for the entire integration's run. Confirmed real data-loss bug for `azure_auditlogs` before PR #266159 merged.

- **Step 1 and Step 2 narrowing gates must apply the same expression via the same config flag.** If you gate a filter in Step 1 using condition X and the semantically-equivalent filter in Step 2 using condition Y, the intersection they filter is not the same unless X ≡ Y. The canonical failure: gating in Step 1 on `config.enableFrequencyClassification` (only `accesses` configs) and in Step 2 on `config.targetEntityType === 'host'` (all host-targeted configs). For Jamf Pro and AWS CloudTrail — `targetEntityType: 'host'`, no frequency classification — Step 2 enforces the host-EUID filter but Step 1 does not, so Step 1 surfaces actors who are all filtered out in Step 2, wasting `MAX_ITERATIONS` budget with no records produced. Introduce an explicit named flag (`requireTargetEntityIdExists`) and apply it in both steps.

- **The engine must bake no data semantics.** Integration-level filtering — `event.outcome == "success"`, field-existence checks, action type filters — must live entirely in config fields (`compositeAggAdditionalFilters`, `esqlWhereClause`). Engine code must contain no integration-specific knowledge (no `if (kind === 'accesses')`, no implicit `event.outcome` injection, no closed relationship-type enum). Adding a new relationship type must be a pure `configs.ts` change. If an engine file must change to support a new config, the abstraction has regressed.

- **Override configs must honour the column-name contract.** A `kind: 'override'` ES|QL query must emit exactly `actorUserId` (actor EUID) and a column named after `relationshipKey`. Wrong column names produce silent empty results — the parser receives columns it doesn't recognise and drops rows without error. This contract must be documented on `esqlQueryOverride`'s JSDoc, and `parseTargetsPerActorRows` must emit `logger.warn` when expected columns are absent.

- **Abort errors from both Step 1 and Step 2 must be handled gracefully.** An abort signal fired during an ES client call must result in a `logger.info` + graceful stop (return `null`), not a re-thrown error. Abort is not a failure; partial records collected before the abort are best-effort useful data and must be written before the run exits. Asymmetric handling (graceful in Step 2, re-throw in Step 1) produces misleading error metrics and discards already-collected records.

- **Override configs must NOT include `SET unmapped_fields=...`.** The engine prepends `ESQL_ENGINE_PREAMBLE` (`SET unmapped_fields="nullify"`) verbatim to every query, including `kind: 'override'` queries. A second `SET` in the override body would be redundant and confusing. Override functions receive the preamble automatically.

- **The ES|QL page filter is an OR-of-terms superset, not an exact tuple match.** `buildActorPageFilter` emits `field IN [values] OR field2 IN [values2]` rather than reconstructing composite-agg tuples. This is intentional and safe *only* because the EUID collapse invariant holds: each document's `actorUserId` is a function of a single identity field chosen by deterministic precedence. If a future custom `actorFields` were to derive EUID from a *combination* of fields, this query would corrupt actor-to-target attribution. Do not add composite actor field designs without re-evaluating this invariant.

## Common review patterns (learned from real PRs)

**Purpose-based naming for engine symbols** — Name engine functions after their conceptual role in the pipeline, not after the ES technology they use. `buildCompositeAgg` and `buildEsqlQuery` leak implementation; `buildActorDiscoveryQuery` and `buildTargetsPerActorQuery` communicate the pipeline's intent. Same applies to step result processors: `postprocessEsqlResults` → `parseTargetsPerActorRows`. All public engine symbols were renamed from technology-names to purpose-names in PR #266159 following @niros1's review. · PR #266159 · @niros1

**Constant naming: integration vs. engine** — Config arrays should be named `<RELATIONSHIP>_INTEGRATION_RELATIONSHIP_CONFIGS`, not `ENGINE_CONFIGS` or similar. `ENGINE_CONFIGS` reads as configuration *for the engine itself* (like `constants.ts`), not as the set of integrations feeding a relationship type. This caused @JordanSh to misread the callsite during review. · PR #266159 · @JordanSh

## Security considerations

- **Namespace injection guard at engine boundary.** Namespace flows raw into every `config.indexPattern(namespace)` callback (eight in the shipped configs) and into Azure's `esqlQueryOverride` function. `assertValidNamespace(namespace)` is called once at the top of `runRelationshipMaintainer` as defense-in-depth. Do not remove this guard or move it inside individual integration paths — one guard at the engine boundary is cheaper and stronger than trusting all callers.

- **ES|QL identifier quoting.** User-supplied ES|QL fragments (`esqlWhereClause`, `targetEvalOverride`, `customActor.evalOverride`, override function bodies) are interpolated directly into the generated query. ES|QL requires backtick-quoting for any field identifier whose dotted segments contain numeric parts or reserved words (e.g. `` `azure.auditlogs.properties.target_resources.0.type` `` — the `.0.` numeric segment). Missing backticks surface as ES|QL `Unknown column` or `expecting identifier` errors at *runtime*, not compile time. The convention is documented in `engine/types.ts`'s file-level comment. Config authors working with non-standard field paths must read it.

## Performance constraints

- **`MAX_ITERATIONS = 1000` is a hard budget, not a soft limit.** The composite aggregation paginates in pages of `COMPOSITE_PAGE_SIZE = 3500` buckets. If actors in the namespace exceed 3,500,000 (1000 × 3500) — currently theoretical — records beyond that ceiling are silently dropped without warning. The engine logs a `warn` at the threshold. If you see `Reached MAX_ITERATIONS` in logs for a production namespace, it is a data completeness issue, not just a performance one.

- **Memory is bounded to one integration's record set at a time.** The engine streams per-integration: it writes each integration's records to the entity store before moving to the next. Do not accumulate records across integrations in memory. The old pattern (collect `allRecords` across all integrations × all pages before a single write) had a theoretical max of ~14M records in memory. The current per-integration flush keeps it to `COMPOSITE_PAGE_SIZE × MAX_ITERATIONS` per integration.

- **Step 1 and Step 2 must filter consistently to avoid wasted iterations.** If Step 1 surfaces actors who will all be filtered out by Step 2, every page of those actors burns one iteration against `MAX_ITERATIONS` with zero record output. The `requireTargetEntityIdExists` flag exists precisely to prevent this — it applies the same existence gate in both steps so Step 1 only surfaces actors that Step 2 will actually process.

- **`LOOKBACK_WINDOW = 'now-30d'` is a fixed constant.** The engine always queries the last 30 days. There is no per-integration or per-namespace override; changing this constant affects all integrations simultaneously.

- **Cross-project (CPS) client selection.** On serverless, reads use a separate `cpsEsClient` (cross-project routing) while writes always use the origin `esClient`. The engine receives `cpsEsClient` as an optional param; when absent it falls back to `esClient`. Do not pass `cpsEsClient` to the `crudClient` (write path) — writes must always target the origin project.

## Historical catches

- **PR #266159 — Azure auditlogs silent zero output (customActor data-loss bug).** @macroscopeapp flagged that `build_actor_discovery_query.ts` was using `euid.dsl.getEuidDocumentsContainsIdFilter('user')` as the Step 1 actor-presence gate even when `customActor.fields` was set. Azure auditlogs documents lack ECS `user.*` fields entirely, so Step 1 returned zero buckets and the override Step 2 never ran — the entire `azure_auditlogs communicates_with` maintainer wrote nothing, with no error. A generic reviewer would have missed this because the composite-agg filter looks correct for the default (ECS) case; the flaw only appears when tracing the full Step 1 → Step 2 pipeline for a custom-actor integration. Fixed in commit `a92b55e` before merge.

- **PR #266159 — Step 1/Step 2 gate inconsistency (wasted MAX_ITERATIONS budget).** @niros1 caught in Round 2 review that the host-EUID-exists filter was gated on `enableFrequencyClassification` in Step 1 but on `targetEntityType === 'host'` in Step 2. For Jamf Pro and AWS CloudTrail (`targetEntityType: 'host'`, no frequency classification), Step 1 surfaced actors who were all filtered out in Step 2 — burning iterations with no output. The inconsistency was invisible from either file in isolation; only visible when reading both query builders side-by-side and tracing the same config through both. Fixed by introducing `requireTargetEntityIdExists` applied identically in both steps.

- **PR #266159 — Engine baked implicit `event.outcome == "success"` semantics.** The original engine auto-injected an `event.outcome == "success"` filter based on `enableFrequencyClassification`. @niros1 flagged this across two review rounds: a flag named "frequency classification" should not control whether outcome filtering is applied — that's integration-level data logic. A new accesses integration that didn't need the outcome filter (or needed a different one) could not opt out without editing engine code. Resolved by moving the filter into `compositeAggAdditionalFilters` + `esqlWhereClause` in each `accesses` config.

## Documentation

_No external documentation links were provided for this domain._

## Who to contact

- Architecture / data model questions: @niros1
- Performance / ES query questions: @seanrathier
- Security questions: @niros1
