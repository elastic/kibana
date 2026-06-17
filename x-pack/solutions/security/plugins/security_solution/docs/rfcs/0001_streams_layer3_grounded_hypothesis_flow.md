# 0001 — Streams Layer 3 Grounded Hypothesis Flow

|              |                                                     |
| ------------ | --------------------------------------------------- |
| Status       | Draft — accepting feedback                          |
| Owner        | Threat Intelligence (with Streams team for Layer 3) |
| Updated      | 2026-05-14                                          |
| Type-only contract | `common/threat_intelligence/hub/telemetry_probe.ts` |
| In-tree services | `services/hunt_for_threat.ts`, `services/hunt_behavior.ts`, `services/hunt_orchestrator.ts` |

## 1. Summary

This RFC proposes a generic **telemetry-probe registry** that any
Kibana plugin can register against to contribute "grounded hypothesis"
probes — the building blocks of the three-layer detection model:

* **Layer 1 — Atomic IOC lookup**: point lookups on ECS fields
  (`source.ip`, `dns.question.name`, `file.hash.sha256`, …). Cheap,
  high-specificity. Today implemented by `services/hunt_for_threat.ts`.
* **Layer 2 — Behavioral rule proposal**: LLM-refined ES|QL rules
  derived from report text. Today implemented by
  `services/hunt_behavior.ts`.
* **Layer 3 — Streams KIs**: cross-stream, cross-pipeline behavioral
  probes that operate on Streams' aggregated views (TBD —
  implemented by the Streams team).

Today, all three layers' clients (digest delivery, hit-provenance
backfill, the dashboard's "Top reports" panel) reach into
threat-intel-specific services. The proposed registry generalises that
coupling: any plugin owning a Streams view can publish a probe and
participate in the orchestrated hunt flow without touching threat-intel
internals.

## 2. Motivation

Three forces converge on the need for this contract:

1. **Layer 3 owner is not threat-intel.** Streams owns the
   stream-of-streams aggregate (the natural home for Layer-3 KIs) and
   needs a published surface to plug into. Today threat-intel's
   `huntOrchestrated` service is the canonical caller — it must remain
   the canonical caller after Layer 3 lands, not be displaced.
2. **In-tree probe shape is already converging.** The Tier 1 / Tier 2
   discriminator added in
   [PR #269002](https://github.com/elastic/kibana/pull/269002) on
   `TelemetryProbeTier` and the Tier 1 → Tier 2 chaining inside
   `huntOrchestrated` already implement most of this contract. The
   contract here is the smallest type-only surface that lets the
   Streams-side build start without re-deriving from the in-tree
   implementation.
3. **Independent rollout.** Threat-intel evolves on its own cadence;
   Streams will evolve Layer 3 on its own. A type-level contract lets
   both teams move forward without a per-PR API negotiation.

## 3. Proposed contract

The runtime contract is published as
[`common/threat_intelligence/hub/telemetry_probe.ts`](../../common/threat_intelligence/hub/telemetry_probe.ts):

```ts
interface TelemetryProbeContext {
  esClient: unknown;     // ElasticsearchClient from @kbn/core/server
  logger: unknown;       // Logger from @kbn/core/server
  spaceId: string;       // '*' = all spaces
  model?: unknown;       // ScopedModel — undefined when no GenAI configured
}

interface TelemetryProbeInput {
  report_id?: string;
  iocs?: ReadonlyArray<{ type: IocType; value: string }>;
  techniques?: readonly string[];
  text?: string;
  time_range?: { from: string; to: string };
}

type TelemetryProbeStatus =
  | 'matched'
  | 'no_match'
  | 'no_searchable_input'
  | 'no_inference'
  | 'error';

interface TelemetryProbeResult {
  probe_id: string;
  tier: 1 | 2;
  status: TelemetryProbeStatus;
  matches: TelemetryProbeMatch[];
  aggregates?: Record<string, unknown>;
  proposed_rules?: TelemetryProbeProposedRule[];
  message?: string;
  next_step?: string;
}

interface TelemetryProbe {
  id: string;
  tier: 1 | 2;
  description: string;
  run(context: TelemetryProbeContext, input: TelemetryProbeInput): Promise<TelemetryProbeResult>;
}

interface TelemetryProbeRegistry {
  register(probe: TelemetryProbe): void;
  list(filter?: { tier?: 1 | 2 }): TelemetryProbe[];
  get(id: string): TelemetryProbe | undefined;
}
```

### 3.1 Mapping to in-tree services

| Layer / Tier | Service                                             | Result mapping                                                                                                            |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Tier 1       | [`huntForThreat`](../../server/threat_intelligence/services/hunt_for_threat.ts) | `HuntForThreatResult` ⊆ `TelemetryProbeResult` (with `tier: 1`)                                                            |
| Tier 2       | [`huntBehavior`](../../server/threat_intelligence/services/hunt_behavior.ts)   | `HuntBehaviorResult` ⊆ `TelemetryProbeResult` (with `tier: 2`); `behaviors` → `matches` + `proposed_rules`                  |
| Layer 3 KI   | (Streams-side, planned)                             | Same `TelemetryProbeResult` shape; tier is **1 or 2** depending on whether the probe is an atomic match or a corroborator |

Each in-tree service file carries a TSDoc back-reference to
`telemetry_probe.ts` so any future field added to one side surfaces in
the other's review.

### 3.2 Registry semantics

* **Duplicate id is a hard error.** `register('threat_intel.foo')`
  twice throws. Plugins MAY guard their own `setup` lifecycle but the
  registry MUST also enforce.
* **Tier filter is informational only.** Both tiers share the same
  probe interface; the discriminator lets the orchestrator decide when
  to run a probe (Tier 1 on atomic input; Tier 2 only on "always" or
  after Tier 1 matched — see `huntOrchestrated`).
* **No probe-side configuration.** Today the orchestrator is the only
  caller and it passes one fully-specified input per call. We
  deliberately do not introduce a `configure(options)` step on the
  probe — keeping the contract minimal until a concrete use-case
  forces an extension.

## 4. Orchestration

`huntOrchestrated` (in `services/hunt_orchestrator.ts`) is the canonical
caller and the reference implementation of the orchestration pattern:

1. Run all `tier === 1` probes in parallel.
2. Aggregate Tier 1 outcomes (status, matches, affected assets).
3. Decide whether to run Tier 2: `tier2_when ∈ { on_hits, always, never }`
   (see [`HUNT_TIER2_WHEN_OPTIONS`](../../common/threat_intelligence/hub/constants.ts)).
4. When running Tier 2: pass the Tier 1 affected-asset summary as
   `article_context` so the LLM can refine its proposal against
   observed telemetry, not just report text.
5. Write feedback back to the originating report via
   [`writeHuntFeedbackSafe`](../../server/threat_intelligence/services/write_hunt_feedback.ts)
   so subsequent ranking can prefer corroborated reports.

Streams-side probes plug into step 1 (Tier 1 atomic) and step 4 (Tier 2
LLM-refined) without changing the orchestrator's logic — the
orchestrator is probe-agnostic by construction once the contract
lands.

## 5. Non-goals

* **Cross-cluster execution.** Probes run on the local cluster. CCS
  is left for a follow-up RFC.
* **Probe versioning.** First-cut probes ship without a `version`
  field; we'll introduce one when the first backwards-incompatible
  field change comes up.
* **Probe-internal caching.** Each probe is responsible for its own
  caching (no shared cache primitive in the registry).
* **Aggregating Layer 3 results into the threat-intel data stream.**
  Today Layer-1/-2 hits land in
  [`provenance.environment_hits`](../../server/threat_intelligence/setup/index_templates.ts)
  via the `hit_provenance_backfill` workflow. Layer-3 backfill needs
  its own field in that block (referenced by name in the workflow
  comment); the mapping change lands when the first Streams probe
  is wired in, not as part of this RFC.

## 6. Open questions

1. **Should the registry expose a `runAll(input)` convenience?** The
   orchestrator currently iterates `list({ tier: 1 })` manually. A
   first-class `runAll` would centralise error fan-out — but adds
   policy (parallelism, ordering, fail-fast) that the orchestrator
   today controls explicitly. Defaulting to per-tier `Promise.all`
   for now; can revisit when the Streams team has a second caller.
2. **Should `TelemetryProbeContext` carry a request-scoped
   `Kibana.Request`?** Audit logging downstream of a probe call wants
   it. Holding off until the Streams team confirms how their probes
   will surface request-scoping.
3. **Should `proposed_rules[]` be required for Layer 1 atomic
   probes?** Today the orchestrator computes the atomic ES|QL
   proposals itself (`proposeAtomicEsqlFromIocs`). Moving that into
   the probe is cleaner but couples every Tier 1 probe to the rule
   exporter. Deferring to a follow-up once Streams has a concrete
   Layer-3 atomic probe to compare.

## 7. Adoption plan

| Phase | Owner       | Scope                                                                                       |
| ----- | ----------- | ------------------------------------------------------------------------------------------- |
| 0     | Threat-intel | This RFC + the type contract (already merged with the PR for points 4–7 of this branch).   |
| 1     | Streams      | Implement the registry in `@kbn/streams-server`. No threat-intel changes needed.            |
| 2     | Threat-intel | Migrate `huntForThreat` / `huntBehavior` to also register against the Streams registry.    |
| 3     | Streams      | First Layer-3 KI probe.                                                                     |
| 4     | Both         | Deprecate the in-tree `huntOrchestrated` glue in favour of `registry.runAll(input)`.        |

Phases 0–2 are non-breaking. Phase 4 is breaking and gets its own RFC.
