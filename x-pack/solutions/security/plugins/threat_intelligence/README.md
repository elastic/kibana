# Threat Intelligence

Source-agnostic threat intelligence skill for Agent Builder. Surfaces external
threat-intel feeds, ad-hoc analyst pastes, and behavioral detection-rule
proposals through the **`threat-intelligence`** Agent Builder skill.

## What ships in v1 (Phase A + Phase C)

- A `.kibana-threat-reports-*` data stream (`semantic_text` + BM25 mirror fields, RRF
  hybrid retriever, content-fingerprinted dedup, `extracted.ioc_set_hash` and
  `provenance.related_reports[]` slots for cross-report correlation).
- An Agent Builder skill **`threat-intelligence`** with seven inline tools
  (the skill cap):
  - `threat_intel.search_reports` — semantic + BM25 hybrid search. Supports
    `categories[]` and `regions[]` filters backed by the v5 schema
    additions.
  - `threat_intel.ingest_report` — analyst-paste / ad-hoc URL ingestion.
  - `threat_intel.hunt_behavior` — LLM-then-catalog-validate behavioral
    extraction. Returns each surviving behavior with a `proposed_esql_rule`
    body ready for handoff to `security.create_detection_rule`. Validates
    against the canonical MITRE ATT&CK catalog in
    `@kbn/securitysolution-mitre-catalog` (the same source
    `security.create_detection_rule` uses).
  - `threat_intel.coverage_gap` — joins in-the-wild ATT&CK techniques (from
    `.kibana-threat-reports-*`) against enabled Detection Engine rules and returns
    uncovered techniques. Renders through the existing
    `threat-intel-mitre-heatmap` attachment with `mode: "coverage"`.
  - `threat_intel.hunt_for_threat` — active forward hunt across the
    customer's environment indices (`.alerts-security.alerts-*`,
    `metrics-endpoint.*`, `logs-vulnerability.*`, `logs-aws.*`,
    `logs-network_traffic.*`) for a report's IOCs and ATT&CK technique IDs.
    Returns top matching documents AND an `affected_assets` aggregation
    (unique hosts + users currently matched).
  - `threat_intel.manage_subscriptions` — single tool with three actions:
    `create` / `list` / `delete`. Replaces the prior
    `create_subscription` + `list_subscriptions` pair so adding
    `hunt_for_threat` did not blow the seven-inline-tool skill cap.
    `create` accepts `template_id` to bootstrap from a pre-staged preset
    (`daily-threat-debrief`, `weekly-ciso-digest`, `ransomware-watch`) and
    `delivery_connector_id` to nominate which configured actions connector
    to dispatch through.
  - `threat_intel.generalize_from_telemetry` — **Phase C**. Closes the
    brittle-alert → durable-behavioral-rule feedback loop. Caller (the
    agent) hands in a pre-fetched set of `.alerts-security.alerts-*`
    samples; the tool runs the same behavioral extraction prompt as
    `hunt_behavior` against the alert summaries, validates candidates
    against the ATT&CK catalog, and persists a synthetic
    `source.type: "telemetry"` row to `.kibana-threat-reports-*` so the same
    finding appears in `coverage_gap` / `search_reports` / the
    dashboard. Returns the same `behaviors` + `attachment_hints` shape
    as `hunt_behavior` so the downstream rendering and Detection
    Engine handoff are unchanged.
- Registry tools:
  - `threat_intel.extract_iocs` — used by Workflow 2.
  - `threat_intel.analyse_environment` — coarse environment profile
    (active data streams + OS family mix + cloud provider mix) so feed
    recommendations can be tailored. Lives in the registry tool list so it
    does not consume one of the skill's seven inline slots.
- Five custom attachment types under the `threat-intel-` prefix (see below).
  The subscription-confirmation card is an editable form that submits
  directly to a plugin-internal route — no second agent round-trip required.
  The new `threat-intel-finding-card` carries three action buttons
  (Deploy / Dismiss / Investigate) so a behavioral finding becomes an
  analyst-ready artifact in chat, and the `threat-intel-report-table`
  exposes batch **Investigate** (opens a pre-populated Case) and
  **Dismiss** header actions.
- Four bundled workflow YAMLs:
  - `source_ingestion` (every 4h) — pull adapters, fingerprint, write.
  - `nl_extraction_behavioral` (every 4h, offset ~30m) — extract IOCs +
    behaviors. Persists `extracted.ioc_set_hash` and
    `provenance.related_reports[]`, surfaced as a "shares · N" badge.
  - `digest_delivery` (hourly fan-out) — render and ship subscription
    digests through the configured actions connector
    (`delivery.connector_id` on the subscription doc → `connector-id` on
    the workflow's `email` / `slack` step).
  - `hit_provenance_backfill` (hourly) — walk back from
    `.alerts-security.alerts-*` to the originating `.kibana-threat-reports-*` doc
    and populate `provenance.environment_hits[]` /
    `provenance.environment_hits_total` (the "Env. hits" column on the
    report-table attachment). Joins on two keys, one per implemented
    detection layer: the IOC `threat.indicator.reference` (Layer 1) and
    the alert's `kibana.alert.rule.threat.technique[].id` overlap
    (Layer 2). A Layer-3 join is held out pending the cross-team contract
    in `docs/rfcs/0001_streams_layer3_grounded_hypothesis_flow.md`.
- One Task Manager task — `threat_intelligence:ioc_indicator_sync` —
  that mirrors `extracted.iocs` from `.kibana-threat-reports-*` into the
  `.kibana-threat-intel-indicators` companion index every 15 min so Detection
  Engine **Indicator Match rules** can match them against alert/event
  data without a parallel matcher in this plugin. Each row carries
  `threat.indicator.reference = "threat-report:<report_id>"` so
  `hit_provenance_backfill` can attribute Layer-1 hits exactly. The
  runner pages through reports via `search_after` over
  `provenance.extracted_at`, threads `abortController.signal` through
  every ES call, classifies failures with `throwRetryableError` /
  `throwUnrecoverableError`, and persists a `lastSyncedAt` cursor under
  `stateSchemaByVersion[1]`. Gated on the `iocIndicatorSyncEnabled`
  experimental flag and the optional `taskManager` plugin.
- A curated **vetted catalog** of ~50 default sources seeded on a fresh
  install: first-party vendor research blogs (Mandiant, Unit 42, Talos,
  CrowdStrike, Microsoft, Google TAG, Trend Micro, Wiz, Volexity, ESET,
  Malwarebytes, Datadog Security Labs, ...), government / CERT advisories
  (CISA, NCSC, ACSC, NVD, CCCS, ENISA, JPCERT, BSI), reputable
  independent / investigative outlets (KrebsOnSecurity, BleepingComputer,
  DarkReading, The Hacker News, SecurityWeek, The Record), ransomware
  watch feeds (RansomLook, Ransomware.live), cloud / SaaS (AWS, GCP,
  Datadog), supply-chain (ReversingLabs, Snyk, GitHub advisories),
  breach trackers (HIBP, DataBreaches.net), insider-threat (CERT-CMU,
  FBI IC3), privacy (IAPP, EDPS), OT/ICS (Claroty Team82, Dragos,
  Nozomi), and research tools (SANS ISC). A
  `verifyCategoryCoverage` assertion in `seed_default_sources.ts`
  fails plugin start if any of the 15 PRD categories drops below two
  feeds, so the catalog can't regress silently. We do not bundle the
  upstream 214-feed list verbatim — the long tail is operator-extended
  via the `manage_sources` flow.
- A **Kibana app** at `Security > Intelligence Hub` (`app/threatIntelligence`)
  that renders a visual overview dashboard — stats ribbon (total /
  critical / high / affects-you), category breakdown, geographic
  region breakdown (with the **Affects you** badge), top ATT&CK
  techniques, an activity-by-severity timeline, an environment-impact
  panel (Layer 1 + Layer 2 hits, sample affected hosts), and a
  recent-advisories list with per-row environment-hit badges. Backed by
  a single internal aggregation endpoint
  (`GET /internal/threat_intelligence/dashboard/overview`) gated by
  the `threatIntelligence_read` privilege.
  - A **filter bar** with `regions[]` and `categories[]` multi-select plus
    a saved-view selector.
  - **Saved views** — CRUD over the `threat-intelligence-saved-view`
    saved-object type via `/internal/threat_intelligence/saved_views`.
    Persists the filter set so users can name + share dashboard cuts.
  - **Location-aware defaults** — the per-space advanced setting
    `securitySolution:threatIntelligence:defaultRegions` pre-fills the
    `regions` filter on first load (operator-tuned per tenant).
  - **Export to PDF** — uses the browser's native print-to-PDF dialog.
    Intentionally no hard dependency on the Reporting plugin; the
    fallback satisfies the PRD requirement and is easy to swap to
    `share.url.locators` later.

## Phased scope

- **Phase A (v1)** — external feeds + analyst paste + behavioral hunting
  (this release).
- **Phase B (deps)** — replaces the `threat-intel-subscription-confirmation`
  card with an `interactive_form` attachment once that platform primitive
  lands, and replaces the **Deploy** button's clipboard-then-navigate hop on
  `threat-intel-finding-card` with a structured prefill payload sent
  directly to the Detection Engine rule create page (the current handoff
  works but loses one click). Owned by the platform team.
- **Phase C (in this release)** — `threat_intel.generalize_from_telemetry`.
  Reads pre-fetched alert documents (via the existing `security.alerts`
  registry tool the agent calls first), runs the same behavioral
  extraction prompt as `hunt_behavior` against alert summaries, writes a
  synthetic `source.type: 'telemetry'` entry into `.kibana-threat-reports-*`, and
  returns proposals shaped for the same finding-card rendering and
  `security.create_detection_rule` handoff as `hunt_behavior`. The
  `source.type` enum value `telemetry` and the
  `provenance.source_doc_ref` schema slot were reserved in earlier
  index-template versions so this tool is purely additive.

## Detection model

Two implemented layers, plus a third architected as a future cross-plugin
contract (see RFC reference below):

1. **IOC matching (Layer 1)** — brittle; adversaries rotate identifiers cheaply.
   Used for retro correlation only.
2. **Behavioral Detection Engine rules (Layer 2)** — durable; constrained by
   the OS, not the adversary. The primary output of `hunt_behavior` →
   `security.create_detection_rule`.
3. **Streams Query KIs (Layer 3, proposed — not in this release)** —
   long-running ES|QL behavioral detection on streams data via the
   `streams` plugin's Query Knowledge Indicators. The cross-team contract
   for this layer — in which threat intel supplies *hypotheses* and the
   streams discovery pipeline produces ES|QL *grounded in the customer's
   actual stream schema and sample data* — is specified in
   `docs/rfcs/0001_streams_layer3_grounded_hypothesis_flow.md`. The
   previous in-tree implementation that piped pre-authored ES|QL straight
   into `platform.streams.sig_events.ki_query_create` has been removed
   from this release; nothing on this layer ships until the RFC lands.

The headline claim: **IOC matching is brittle because adversaries rotate
identifiers; behavior is durable because it's constrained by the OS.**

## Prerequisites

| Prerequisite | Required for | Notes |
|---|---|---|
| Elasticsearch 8.15+ | `semantic_text` mappings | The `.kibana-threat-reports-*` data stream uses `semantic_text` for `content.title` and `content.body_text`. `hunt_behavior` does not depend on inference — it validates against the vendored ATT&CK catalog. |
| Cluster-default `text_embedding` inference endpoint | `threat_intel.search_reports` semantic path only | The plugin **omits `inference_id`** from `semantic_text` mappings so ES inherits the cluster default. The current default-priority list (per `@kbn/index-management-plugin/use_compatible_inference_endpoints`) is: Jina v5 on EIS → ELSER-on-EIS → ELSER → multilingual-e5. **No customer ML node is required** when the cluster is on EIS or uses an external Jina/OpenAI endpoint. ML node is only required for self-hosted ELSER/E5. If inference is unavailable, `search_reports` falls back to its BM25 sibling fields via the RRF retriever. |
| `aiRuleCreationEnabled` experimental flag | `security.create_detection_rule` | When off, `hunt_behavior` degrades gracefully — the skill emits proposed rule definitions as copy-paste markdown blocks instead of failing silently. |
| `xpack.agentBuilder.enabled: true` | The skill itself | Agent Builder is the host for skills, tools, and attachment types. |
| `workflowsManagement.enabled: true` (optional) | Bundled workflows | Without it, the YAMLs in `server/workflows/*.yaml` can be POSTed manually to `/api/workflowManagement/workflows`. |
| Enterprise license | Inference + Detection Engine + Workflows | All upstream gates apply. |

> **Stale "Jina v3" reference correction**: the original
> `security-ciso-news-aggregator` repo referenced "Jina v3 semantic_text".
> Jina v3 was a 2024 default and is no longer canonical. The plugin omits
> `inference_id` so the cluster default applies — currently `Jina v5 small`
> on EIS deployments. This affects only `search_reports`; `hunt_behavior` is
> inference-free.

### Phase C will additionally require

- Read access to `.alerts-security.alerts-*` (already covered by the existing
  `security.alerts` tool's RBAC).
- The `siem` feature privilege for telemetry ingestion writes.

## Enabling

The skill itself is gated behind an experimental flag so v1 is opt-in. The
IOC indicator-sync feature has its own flag so it can be turned on
independently:

```yaml
# kibana.yml
xpack.threatIntelligence.enableExperimental:
  - "threatIntelligenceSkillEnabled"
  # Optional: mirror extracted IOCs to .kibana-threat-intel-indicators for
  # Detection Engine Indicator Match rules (Workflow 4 attributes the
  # resulting alerts back to the originating report). To use the resulting
  # rows from an Indicator Match rule, the rule's owning role must also have
  # `read` on `.kibana-threat-intel-indicators` — end-user roles do not get
  # `.kibana-*` reads by default.
  - "iocIndicatorSyncEnabled"
```

Once enabled, the skill becomes discoverable to the default Elastic AI Agent
under any of these phrasings:

- "threat intel on Volt Typhoon"
- "CISO News digest"
- "what vendor advisories cover the XZ backdoor"
- "this Mandiant blog describes a new technique — build a detection"
- "incident postmortem to durable rule"
- "hunt for the behavior class behind these IOCs"

## Attachment types

| ID | Purpose |
|---|---|
| `threat-intel-mitre-heatmap` | ATT&CK technique heatmap. Two modes: `reports` (sized by report count, colored by severity) and `coverage` (covered cells render green, uncovered cells render red — used by `coverage_gap`). |
| `threat-intel-report-table` | Tabular view of threat reports with embedded IOCs and a "shares · N" badge linking related reports via the IOC-set hash. Header actions: **Investigate** (opens a pre-populated Case in Security) and **Dismiss** (client-side hide). |
| `threat-intel-severity-timeline` | Severity rollup over time for a digest window. |
| `threat-intel-subscription-confirmation` | Editable subscription form. The agent proposes initial values (optionally seeded from a `template_id`); the user can edit tags, severity, schedule, and delivery before clicking Submit. Submit posts directly to `/internal/threat_intelligence/subscriptions/submit` — no second agent round-trip required. |
| `threat-intel-finding-card` | Single analyst-ready behavioral finding from `hunt_behavior`. Carries the MITRE technique, evidence quote, severity/confidence, and a deploy-ready ES|QL rule body. Three action buttons: **Deploy** (copies the ES|QL body to clipboard and opens the Detection Engine rule create page), **Dismiss** (client-side hide; no server state changed), and **Investigate** (opens a pre-populated Case for tracking). |

## Indices owned by this plugin

All plugin-owned indices live under the `.kibana-threat-*` prefix so the
`kibana_system` reserved role's existing `.kibana*` privileges cover create
/ read / write without an Elasticsearch role-descriptor change. See
[Kibana System User](../../../../../dev_docs/key_concepts/kibana_system_user.mdx)
for why non-`.kibana*` patterns are intentionally denied to `kibana_system`.

| Index / data stream | Purpose | Schema notes |
|---|---|---|
| `.kibana-threat-reports-*` (data stream) | All ingested threat-intel reports | `semantic_text` + BM25 mirrors via `copy_to`; `content_fingerprint` for dedup; `provenance.duplicate_of` and `provenance.source_doc_ref` reserved for Phase C. `provenance.environment_hits.*` + `provenance.environment_hits_total` are written by Workflow 4 (Layers 1 + 2 only; Layer 3 fields will be added when the RFC contract ships). |
| `.kibana-threat-intel-sources` | Source catalog (RSS, STIX, TAXII, vendor APIs, email) | Adapter type drives Workflow 1's `switch` dispatch. |
| `.kibana-threat-intel-subscriptions` | Per-user digest subscriptions | RRULE schedule + delivery channel. |
| `.kibana-threat-intel-digests` | Archived rendered digests | |
| `.kibana-threat-intel-indicators` | IOC indicator mirror for Detection Engine Indicator Match rules | ECS-aligned `threat.indicator.*` shape. `threat.indicator.reference = "threat-report:<report_id>"` is the join key the `hit_provenance_backfill` workflow uses to attribute Layer-1 hits back to the originating report. Maintained by the `threat_intelligence:ioc_indicator_sync` Task Manager job. Note: because this lives under `.kibana-*`, end-user roles must be explicitly granted `read` to use it from an Indicator Match rule. |

> **MITRE ATT&CK catalog.** The plugin does **not** own a MITRE index. `hunt_behavior` validates LLM-extracted technique IDs against the canonical, slim catalog exported by `@kbn/securitysolution-mitre-catalog`. That package's data is autogenerated from the official ATT&CK STIX bundle by `security_solution`'s `extract_tactics_techniques_mitre.js` (run via `yarn extract-mitre-attacks`), which writes both the labeled SIEM-side TS catalog and this package's slim JSON in the same invocation, so the rule-creation pipeline and `hunt_behavior` cannot disagree about which technique IDs exist.
>
> **Trade-off accepted.** We lose the original plan's "semantic downgrade" (T1059 → T1059.001 based on description-vs-evidence similarity); in practice the dominant correctness improvement was the existence check, which the static catalog provides for free.

## RBAC

The plugin registers a single Kibana feature, `threatIntelligence`, with the
PRD's three-tier privilege model:

| Tier | Kibana privilege | Grants |
|------|------------------|--------|
| `read` | feature `read` | Search reports, view subscriptions, hunt against the environment, view sources, read saved views. |
| `write` | feature `all` minus the `manageSources` sub-feature | `read` plus create / delete subscriptions, ingest analyst-paste reports, manage saved views. |
| `admin` | feature `all` | `write` plus manage feed sources (add / edit / disable). |

Routes thread these through `security.authz.requiredPrivileges`. Granular
sub-feature toggling is exposed in Role Management.

License: the feature registers with `minimumLicense: 'platinum'` (PRD baseline).
Some downstream capabilities still gate higher at runtime — Agent Builder and
the bundled Workflows are Enterprise-only — so on a Platinum cluster the
dashboard, source catalog, search, saved views, and subscription routes are
usable, but the ingestion workflows and the skill itself require Enterprise.
This is intentional: a CISO on Platinum can consume threat intel an Enterprise
neighbour aggregated for them, even before their org upgrades the workflow tier.

### Per-space isolation

Implemented as a **logical** tag, not separate per-space indices. Every
plugin-owned document carries a `space_id` keyword:

- **Reads** filter by `{ terms: { space_id: [currentSpace, '*'] } }` so each
  space sees only its own rows plus the `'*'`-tagged built-ins.
- **Writes** from HTTP routes resolve `request.getSpaceId()` via the optional
  `spaces` plugin (falls back to `'default'` when the plugin is missing).
- **Workflows** propagate `space_id` from the originating source row to each
  ingested report, and from the originating subscription to each delivered
  digest, so single global workflow schedules continue to work without
  per-space deployment.
- **Seeded sources** are tagged `space_id: '*'` so the bundled catalog is
  visible from every space.

This is a deliberate departure from the PRD's `.cisonews-*-{space}` pattern.
Operationally simpler (one set of indices, one workflow deployment) and
covers the same isolation surface for the dashboard + agent reads.

## Trade-offs accepted

- **Workflow YAML registration is a follow-up** — the plugin ships the YAMLs as
  static assets; wiring `workflowsManagement.createWorkflow()` into plugin
  start needs a scoped request and is captured for a separate PR. Until then
  the YAMLs are POST-able manually.
- **Connector delivery is now wired** — Workflow 3's email/slack delivery
  steps call the actions plugin's `email` / `slack` connector through the
  workflow engine. The connector id is liquid-rendered from
  `item._source.delivery.connector_id` on the subscription doc. Subscriptions
  created without a `connector_id` skip delivery with an explicit warning
  instead of failing the workflow.
- **`proposed_esql_rule` is a starting point** — the generated query is
  intentionally generic; a detection engineer should review the FROM clause
  and WHERE predicates against the customer's index pattern + ECS field
  schema before enabling. Multi-platform export (Sigma / KQL) is intentionally
  out of scope: this plugin's value-add is the Elastic-native handoff to
  `security.create_detection_rule`, not cross-SIEM rule generation.
- **Coverage-gap rule walk is bounded** — `coverage_gap` walks at most 2,000
  enabled SIEM rules via the saved-objects API. That's well above realistic
  deployments, but a follow-up PR can add a paged streaming version if
  customers exceed it.
- **Hard cap of 7 inline tools** — six are in use; the remaining slot is
  reserved for Phase C's `generalize_from_telemetry`. The previous
  `create_subscription` + `list_subscriptions` pair has been merged into
  `manage_subscriptions` (action: `create` | `list` | `delete`) so adding
  `hunt_for_threat` did not blow the cap. Further additions must either
  merge tools further or split the skill in two.
- **Layer 3 (Streams Query KIs) is RFC-only in this release** — the prior
  in-tree implementation that piped threat-intel-authored ES|QL straight
  into `platform.streams.sig_events.ki_query_create` was removed. It had
  two structural defects that made the integration ineffective in
  production: (1) the streams-side `upsertStreamQueryRequestSchema` had
  no `tags` slot and `QueryClient.toCreateRuleParams` hard-coded the rule
  tag list to `['streams', definition.name]`, so the
  `threat_intel:streams_ki:<report_id>` back-channel tag never reached
  `kibana.alert.rule.tags` and the layer-3 attribution was always zero;
  (2) the ES|QL was authored at extraction time without consulting the
  target stream's schema, so most proposals failed
  `validateEsqlQueryForStreamOrThrow` at persistence. Both defects
  pointed at a deeper design issue, not a small fix — see
  `docs/rfcs/0001_streams_layer3_grounded_hypothesis_flow.md` for the
  proposed cross-team contract (threat intel emits hypotheses; streams
  produces grounded ES|QL via its discovery pipeline; a typed
  `provenance` slot on `StreamQuery` replaces the rule-tag convention).
  Until that contract ships, the skill does not offer a Layer-3 path and
  agent responses for "materialize this as a Streams KI" point the user
  at the RFC.
