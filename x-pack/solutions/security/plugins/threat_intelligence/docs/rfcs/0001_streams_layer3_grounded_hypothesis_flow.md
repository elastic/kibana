# RFC: Grounded hypothesis flow for Streams Query KIs sourced from threat reports <!-- omit from toc -->

**Author(s)**: TBD (`@elastic/security-threat-intelligence`)
**Status**: Draft — awaiting streams team review
**Created**: May 2026
**Reviewers**: `@elastic/streams`, `@elastic/security-threat-intelligence`

## Summary <!-- omit from toc -->

The `threat_intelligence` plugin used to ship a Layer-3 detection path that
produced Streams Query Knowledge Indicators (KIs) from extracted threat-report
behaviors by translating threat-intel-authored ES|QL straight into
`platform.streams.sig_events.ki_query_create` calls. That implementation has
been **removed from the plugin**, for the reasons documented in
[Background & Context](#background--context); Layer 3 is currently a vision in
the plugin's README and nothing else.

This RFC proposes the cross-plugin contract that, once shipped, would let
Layer 3 be re-introduced correctly: threat-intel emits **detection
hypotheses** (durable adversary tradecraft — MITRE technique, evidence quote,
severity, source-report reference) and the streams plugin's KI-identification
pipeline produces **grounded ES|QL** that matches the customer's actual stream
schema and sample data. The bidirectional benefits are made explicit through a
typed `provenance` slot on `StreamQuery` and a per-behavior outcome that
threat-intel persists back onto its own `threat-reports-*` documents.

The proposal asks for three additive changes on the streams side and is
described from the streams team's perspective. The corresponding changes on
the threat-intel side (re-introducing a registry tool, re-introducing a
Workflow 5, re-introducing a Layer-3 step in Workflow 4) are tracked in this
plugin's own backlog and gated on this RFC being accepted.

## Table of contents <!-- omit from toc -->

- [Background \& Context](#background--context)
- [Problem Statement](#problem-statement)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Proposed Contract](#proposed-contract)
  - [SS-1: `ki_identification_start` accepts optional `prior_hypotheses[]`](#ss-1-ki_identification_start-accepts-optional-prior_hypotheses)
  - [SS-2: `StreamQuery` gains an optional typed `provenance` slot](#ss-2-streamquery-gains-an-optional-typed-provenance-slot)
  - [SS-3: A non-throwing `evaluateEsqlQueryForStream` returns a compatibility verdict](#ss-3-a-non-throwing-evaluateesqlqueryforstream-returns-a-compatibility-verdict)
- [Backwards Compatibility](#backwards-compatibility)
- [Phasing](#phasing)
- [Open Questions](#open-questions)
- [Appendix: Reciprocal threat-intel-side changes](#appendix-reciprocal-threat-intel-side-changes)

## Background & Context

**Related code on the streams side** (extension points referenced below):

- `x-pack/platform/plugins/shared/streams/server/agent_builder/tools/ki_identification_start/tool.ts` — proposed extension point for [SS-1](#ss-1-ki_identification_start-accepts-optional-prior_hypotheses).
- `x-pack/platform/plugins/shared/streams/server/agent_builder/tools/create_query_knowledge_indicator/{tool,handler}.ts` — current write path; [SS-2](#ss-2-streamquery-gains-an-optional-typed-provenance-slot) extends its rule-creation tags.
- `x-pack/platform/plugins/shared/streams/server/lib/sig_events/{validate_esql_query,ki_queries_generation_service,generate_significant_events}.ts` — current discovery pipeline; [SS-3](#ss-3-a-non-throwing-evaluateesqlqueryforstream-returns-a-compatibility-verdict) adds a sibling non-throwing evaluator here.
- `x-pack/platform/packages/shared/kbn-streams-schema/src/queries/index.ts` — `StreamQuery` + `upsertStreamQueryRequestSchema`; [SS-2](#ss-2-streamquery-gains-an-optional-typed-provenance-slot) extends both.

**Related code that previously existed on the threat-intel side** (removed
in the same change that introduced this RFC):

- `server/agent_builder/tools/materialize_streams_kis.ts` — translated
  `extracted.behaviors[]` into ES|QL payloads for `ki_query_create`.
- `server/workflows/streams_ki_materialization.yaml` — Workflow 5; scheduled
  bridge between TI and streams.
- The `streamsKiMaterializationEnabled` experimental flag.
- The Layer-3 step in `server/workflows/hit_provenance_backfill.yaml`.
- The `layer_3_streams_ki`, `streams_ki_materialized_at`, and
  `streams_ki_count` mappings on `threat-reports-*`.
- The `streams` entry under `optionalPlugins` in `kibana.jsonc`.

The threat-intel plugin's detection model (see its README) frames Layer 3 as
the durable, behavior-grounded counterpart to Layer 1 (IOC matching) and
Layer 2 (Detection Engine behavioral rules). The intent of Layer 3 is **not**
to duplicate streams' autonomous KI discovery; it is to feed streams a
curated supply of detection hypotheses grounded in current adversary
tradecraft so that streams can produce KIs that might never have surfaced
from anomaly-driven discovery alone.

The removed implementation authored ES|QL at extraction time (via
`hunt_behavior`'s LLM call), without ever consulting the target stream's
schema or sample data, then passed those strings through to
`ki_query_create`. Two structural defects made the integration ineffective
in production:

1. The proposed ES|QL was unlikely to satisfy
   `validateEsqlQueryForStreamOrThrow`, because the FROM clause and field
   names were guessed against ECS in general, not against the customer's
   actual stream definition. In production this manifested as a steady
   stream of validation rejections on Workflow 5, with `on-failure:
   continue: true` masking the symptom.
2. The Layer-3 back-channel — the rule tag
   `threat_intel:streams_ki:<report_id>` that Workflow 4 joined on — was
   not carried through. `upsertStreamQueryRequestSchema` had no `tags`
   field, and `toCreateRuleParams` in `QueryClient` hard-coded
   `['streams', definition.name]`. The tag was dropped at the streams
   boundary, so the Workflow 4 join against `kibana.alert.rule.tags`
   could not match anything.

Fixing these in place (add a `tags` passthrough; loosen validation) would
have patched the symptoms but not the architectural mismatch: ES|QL authored
without seeing the target stream cannot be reliably grounded in that stream.
The implementation was therefore removed pending the contract proposed
below.

## Problem Statement

There is currently no Layer-3 integration between the two plugins; the prior
storage-boundary implementation was removed. The straightforward integration
shape — threat intel emits a fully formed `StreamQuery` and streams persists
it — is structurally fragile (see Background above) and under-uses the
capabilities both sides already have:

- The streams side already runs an LLM-driven KI identification pipeline
  (`ki_identification_start` → `generateKIQueries` →
  `generateSignificantEventDefinitions`) that consults the actual stream
  schema, sample documents, and existing KIs. This pipeline is the natural
  place to *ground* a detection hypothesis in real data.
- The threat-intel side already extracts and stores rich behavioral
  hypotheses (MITRE technique, tactics, evidence quotes, severity, confidence)
  for each ingested report. This data is precisely the kind of curated prior
  that the autonomous discovery pipeline cannot synthesize on its own.

The streams discovery pipeline has no way to consume external priors today,
and the threat-intel side has no way to ask streams "would this hypothesis
detect anything against my actual data?" Bridging those two capabilities is
what this RFC specifies.

## Goals

- Move ES|QL generation for threat-intel-sourced KIs **across the boundary**
  into the streams discovery pipeline, so that proposed queries are grounded
  in the target stream's schema and sample data.
- Give each side a typed contract for round-tripping identity and outcome:
  threat intel supplies a hypothesis identifier; streams returns a viability
  verdict and the resulting query reference.
- Make the integration **mutually beneficial** rather than mechanical:
  - Streams' KI discovery gains an optional supply of labelled detection
    hypotheses grounded in current adversary reporting.
  - Threat-intel reports gain an empirical viability signal per behavior on
    the customer's deployment — including the high-value
    "no compatible telemetry" outcome.
- Preserve full backwards compatibility for the existing autonomous KI
  discovery flow and for analyst-authored Query KIs.

## Non-Goals

- This RFC does not propose changes to KI execution semantics, to the
  significant-events alerting type, or to any UI surface.
- This RFC does not propose mandating provenance on `StreamQuery`. The new
  fields are optional in both schema and behavior.
- This RFC does not propose replacing or modifying the existing
  `ki_query_create` registry tool. It remains the supported write path for
  analyst-authored Query KIs and for any other consumer that already has a
  validated ES|QL string in hand.

## Proposed Contract

Three additive changes on the streams side, each independently useful.

### SS-1: `ki_identification_start` accepts optional `prior_hypotheses[]`

Extend the tool's input schema:

```ts
const onboardingStartSchema = z.object({
  stream_name: z.string()...,
  steps: z.array(z.enum(OnboardingStep)).optional()...,
  connectors: z.object({...}).optional(),
  prior_hypotheses: z
    .array(z.object({
      report_id: z.string(),
      behavior_id: z.string(),
      technique_id: z.string().optional(),
      technique_name: z.string().optional(),
      technique_tactics: z.array(z.string()).optional(),
      evidence_quote: z.string().optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      confidence: z.number().min(0).max(1),
      source_report: z.object({
        id: z.string(),
        title: z.string().optional(),
        url: z.string().optional(),
        provider: z.string().optional(),
      }).optional(),
    }))
    .max(25)
    .optional()
    .describe(
      'External detection hypotheses to seed the QueriesGeneration step. ' +
      'Each entry is advisory; the LLM may use, refine, or reject any prior.'
    ),
});
```

Thread `prior_hypotheses` through `OnboardingTaskParams` → the
`QueriesGeneration` step → `SignificantEventsQueriesGenerationTaskParams` →
`GenerateKIQueriesParams` → `generateSignificantEventDefinitions`, where it
joins the existing `existingQueries` array as a system-prompt context section.
The LLM is asked to:

1. For each hypothesis, propose ES|QL grounded in the target stream's schema
   and sample documents.
2. If the hypothesis cannot be expressed against this stream's available
   fields, emit a `no_compat` verdict (see [SS-2](#ss-2)) with
   `missing_fields[]` populated.
3. If existing KIs already cover the same hypothesis, prefer reuse over
   duplication and reference the prior on the existing query's provenance.

The hard cap of 25 hypotheses per call protects prompt budget; threat-intel
selects by descending `(severity, confidence)` if a report has more candidates.

### SS-2: `StreamQuery` gains an optional typed `provenance` slot

Add to `streamQuerySchema` and `upsertStreamQueryRequestSchema`:

```ts
const queryProvenanceSchema = z.object({
  reference: z
    .object({
      kind: z.enum(['threat_intel', 'manual', 'ki_discovery']).or(z.string()),
      report_id: z.string().optional(),
      behavior_id: z.string().optional(),
      technique_id: z.string().optional(),
      source_url: z.string().optional(),
    })
    .optional(),
  outcome: z.enum(['viable', 'partial', 'no_compat']).optional(),
  outcome_reason: z.string().optional(),
  missing_fields: z.array(z.string()).optional(),
}).optional();
```

Storage shape on `StoredQueryLink`: a single `flattened` field
(`experimental.query.provenance`, mirroring how `evidence` is stored today) to
keep mapping churn low.

`toCreateRuleParams` in `QueryClient` adds a derived rule tag when
`provenance.reference.kind === 'threat_intel'` and `report_id` is present:

```ts
tags: [
  'streams',
  definition.name,
  ...(query.provenance?.reference?.kind === 'threat_intel' &&
   query.provenance.reference.report_id
    ? [`threat_intel:streams_ki:${query.provenance.reference.report_id}`]
    : []),
],
```

Synthesizing the legacy tag string at rule-creation time preserves the
rule-tag-as-backlink pattern, which the threat-intel side will need when the
Layer-3 step is reinstated in `server/workflows/hit_provenance_backfill.yaml`
as part of P2. Future consumers can prefer the typed slot directly; the tag
is a wire-level fallback only.

### SS-3: A non-throwing `evaluateEsqlQueryForStream` returns a compatibility verdict

Today, `validateEsqlQueryForStreamOrThrow` (`x-pack/platform/plugins/shared/streams/server/lib/sig_events/validate_esql_query.ts`) is a binary gate.
Introduce a sibling function:

```ts
export interface EsqlStreamCompatibility {
  outcome: 'viable' | 'partial' | 'no_compat';
  reason?: string;
  missing_fields?: string[];
}

export function evaluateEsqlQueryForStream(args: {
  esqlQuery: string;
  stream: Streams.all.Definition;
}): EsqlStreamCompatibility;
```

Semantics:

- `viable` — FROM clause matches the stream's index pattern and every
  referenced field exists on the stream definition.
- `partial` — FROM clause matches, but one or more referenced fields are
  missing; `missing_fields[]` enumerates them. The query is still persisted
  but `rule_backed: false`, so it surfaces in the streams UI as a
  not-yet-installable detection.
- `no_compat` — FROM clause does not match this stream's index pattern, or
  the query cannot be parsed. Persisted as a record-only entry with no
  backing rule.

`validateEsqlQueryForStreamOrThrow` keeps its existing throwing behavior to
avoid touching its many existing call sites; the new function is opt-in.

The `QueriesGeneration` step invokes `evaluateEsqlQueryForStream` immediately
after the LLM emits a query and populates `provenance.outcome` on the result
before persistence. This benefit accrues to every KI the streams side
generates, not just threat-intel-seeded ones — analysts get an explicit
"this generated query needs field X" surface they don't have today.

## Backwards Compatibility

All three changes are additive on the streams side:

- **[SS-1]** `prior_hypotheses[]` is optional. Existing callers of
  `ki_identification_start` see no behavior change.
- **[SS-2]** `provenance` is optional on `StreamQuery` and on the wire
  schema. Existing stored queries decode normally. The synthesized
  `threat_intel:streams_ki:<report_id>` rule tag is only emitted when
  `provenance.reference.kind === 'threat_intel'`, so no consumer of
  `kibana.alert.rule.tags` sees new strings unless the threat-intel-side
  P2 work lands and starts producing them.
- **[SS-3]** The new `evaluateEsqlQueryForStream` lives alongside
  `validateEsqlQueryForStreamOrThrow`. No existing call site has to
  migrate.

On the threat-intel side this is **greenfield**: the prior
`materialize_streams_kis` tool and Workflow 5 have been removed, so P2 below
is an addition, not a modification. The reciprocal data-stream mappings
(`provenance.environment_hits.layer_3_streams_ki` etc.) will be re-added to
the `threat-reports-*` index template as part of P2.

## Phasing

1. **P1 — Streams team PR** lands [SS-1], [SS-2], [SS-3]. Independent of
   anything in the threat-intel plugin; each delta is independently useful
   even for streams' autonomous KI discovery (especially [SS-3]).
2. **P2 — Threat-intel plugin PR** introduces (re-introduces, after the
   demolition in this RFC's companion change):
   - a new `threat_intel.materialize_streams_kis` registry tool that emits
     `BehaviorHypothesis[]` instead of ES|QL;
   - a Workflow 5 (`streams_ki_materialization`) that calls
     `ki_identification_start` with priors and polls
     `ki_identification_status` for results;
   - the `extracted.behaviors[i].streams_outcome` sibling field on the
     `threat-reports-*` data stream;
   - the Layer-3 step in `hit_provenance_backfill.yaml` plus the
     `provenance.environment_hits.layer_3_streams_ki` mapping;
   - the `streamsKiMaterializationEnabled` experimental flag and the
     `streams` entry under `optionalPlugins` in `kibana.jsonc`.
   The plugin must degrade gracefully against streams plugin versions that
   pre-date P1 (no `prior_hypotheses` accepted; no `provenance` slot) by
   refusing to start Workflow 5 and emitting a single info log on plugin
   start.
3. **P3 — UI follow-up** in the threat-intel plugin renders
   `streams_outcome` as a "Streams coverage" column on the
   `threat-intel-report-table` attachment.

## Open Questions

These are flagged for the streams team's input before P1 lands.

1. **Prompt integration point.** Should priors be passed as a system-prompt
   context section alongside `existingQueries` in
   `generateSignificantEventDefinitions`, or as a tool the LLM calls
   explicitly when it wants to consult the prior list?
2. **Throwing vs returning verdict.** Is the proposed split
   (`validateEsqlQueryForStreamOrThrow` stays;
   `evaluateEsqlQueryForStream` is new) the right factoring, or would
   streams prefer a single function with a `mode: 'throw' | 'verdict'`
   parameter?
3. **Hypothesis back-pressure.** A `max: 25` cap on `prior_hypotheses[]` is
   proposed to protect prompt budget. Is that the right number? Should
   triage (severity + confidence ranking) happen server-side or be the
   caller's responsibility?
4. **Storage shape for `provenance`.** Flattened (proposed, low churn) vs
   fully-mapped sub-fields (better queryability). The threat-intel side
   doesn't need to filter by `provenance.reference.report_id` from streams'
   storage today — the round trip is via the rule tag plus the in-memory
   `StreamQuery` response from `ki_identification_status`.
5. **Status tool surface.** `ki_identification_status` currently returns a
   Kibana path. To complete the round-trip, threat-intel's Workflow 5 needs
   the resulting `StreamQuery[]` (with `provenance`) to write
   `streams_outcome` back. Should we extend the status response, add a
   sibling `ki_identification_result` lookup tool, or expect the caller to
   read from `ki_search`?

## Appendix: Reciprocal threat-intel-side changes

For context only — these land in the `threat_intelligence` plugin under P2
and are not part of this RFC's ask:

- **TI-1** — Introduce a `threat_intel.materialize_streams_kis` registry
  tool that emits `BehaviorHypothesis[]` (no ES|QL, no per-stream rendering).
- **TI-2** — Introduce a Workflow 5 (`streams_ki_materialization`) that
  calls `ki_identification_start` per (report, target_stream) with
  `prior_hypotheses` populated, polls `ki_identification_status`, and
  writes the resulting `provenance` + outcome back onto
  `extracted.behaviors[i].streams_outcome`.
- **TI-3** — Re-introduce the `provenance.environment_hits.layer_3_streams_ki`
  mapping and the Layer-3 step in
  `server/workflows/hit_provenance_backfill.yaml`, joining on the
  synthesized `threat_intel:streams_ki:<report_id>` rule tag from [SS-2].
- **TI-4** — README + skill prompt updates to describe the
  hypothesis ↔ grounding contract and to surface "Streams coverage" in the
  `threat-intel-report-table` attachment (covered by P3).
