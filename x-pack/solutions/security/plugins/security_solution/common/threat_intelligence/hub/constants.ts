/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'threatIntelligence' as const;
export const PLUGIN_NAME = 'Threat Intelligence' as const;

/**
 * Kibana feature id and API-privilege names for this plugin. The feature is
 * registered with three privilege tiers that match the PRD's
 * read / write / admin model:
 *
 *   - `read`  (Kibana feature `read`) grants `read` only.
 *     User can search reports, list subscriptions, hunt against the
 *     environment, and view sources.
 *   - `write` (Kibana feature `all` minus `manageSources` sub-feature) grants
 *     `read` + `writeSubscriptions`. User can additionally create / delete
 *     their own subscriptions and ingest analyst-paste reports.
 *   - `admin` (Kibana feature `all`) grants `read` + `writeSubscriptions` +
 *     `manageSources`. User can additionally add / edit / disable feed
 *     sources and tune the catalog.
 *
 * Route handlers thread these through `security.authz.requiredPrivileges`.
 */
export const THREAT_INTELLIGENCE_FEATURE_ID = 'threatIntelligence' as const;
export const THREAT_INTELLIGENCE_API_PRIVILEGES = {
  read: `${THREAT_INTELLIGENCE_FEATURE_ID}_read`,
  writeSubscriptions: `${THREAT_INTELLIGENCE_FEATURE_ID}_write_subscriptions`,
  manageSources: `${THREAT_INTELLIGENCE_FEATURE_ID}_manage_sources`,
} as const;

/**
 * Indices and data stream names owned by this plugin.
 *
 * All names live under the `.kibana-*` family so the `kibana_system` reserved
 * role's existing index privileges cover create / read / write without an
 * Elasticsearch role-descriptor change. See
 * `dev_docs/key_concepts/kibana_system_user.mdx` — non-dot-prefixed (or
 * non-`.kibana*`) patterns are treated as user-defined data indices and
 * `kibana_system` is intentionally denied access to them.
 */
export const THREAT_REPORTS_DATA_STREAM = '.kibana-threat-reports' as const;
/**
 * Index pattern used both by the data-stream index template's `index_patterns`
 * and by all read-side callers (`search_reports`, `coverage_gap`,
 * `dashboard_overview`, `hunt_for_threat`, `ioc_indicator_sync`).
 *
 * No dash before the wildcard: a trailing `-*` requires at least one
 * character after the dash, which means `.kibana-threat-reports-*` does NOT
 * match the bare data-stream name `.kibana-threat-reports`. With that
 * pattern, `createDataStream` 400s with "no matching index template found
 * for data stream", and every read returns zero hits because backing
 * indices are named `.ds-.kibana-threat-reports-…` (and so don't match
 * either). `.kibana-threat-reports*` matches the data-stream name itself
 * and any legacy suffixed indices, without colliding with the sibling
 * `.kibana-threat-intel-*` companion indices.
 */
export const THREAT_REPORTS_INDEX_PATTERN = '.kibana-threat-reports*' as const;
export const THREAT_INTEL_SOURCES_INDEX = '.kibana-threat-intel-sources' as const;
export const THREAT_INTEL_SUBSCRIPTIONS_INDEX = '.kibana-threat-intel-subscriptions' as const;
// Recurring-query recall is intentionally not a plugin-owned capability:
// users re-open the originating conversation via the agent-builder history
// sidebar. Any future scheduled re-run feature must introduce its own
// persistence layer.
export const THREAT_INTEL_DIGESTS_INDEX = '.kibana-threat-intel-digests' as const;
/**
 * Destination index for LLM-synthesised cross-report advisories produced
 * by `services/synthesize_advisory.ts`. One row per advisory; each row
 * carries the rendered narrative, the recommended actions list, and the
 * set of report ids that fed the synthesis so the analyst can drill back
 * into the underlying reports. Persistence is opt-in on the service so
 * ad-hoc invocations from the LLM don't litter the index.
 */
export const THREAT_INTEL_ADVISORIES_INDEX = '.kibana-threat-intel-advisories' as const;
/**
 * Destination index for IOC indicators synced from the threat-reports data
 * stream by the Task Manager job (`server/tasks/ioc_indicator_sync.ts`).
 * Detection Engine's Indicator Match rule can be configured to query this
 * index — the rows are shaped to ECS `threat.indicator.*` so the rule's
 * default field mapping works without further customization.
 *
 * Because this lives under `.kibana-*`, end-user roles do not get read
 * access by default; operators wiring the IOC sync to Indicator Match must
 * grant their detection-rule role read on this exact index.
 */
export const THREAT_INTEL_INDICATORS_INDEX = '.kibana-threat-intel-indicators' as const;
/**
 * Prefix written to `threat.indicator.reference` on every synced indicator
 * so Workflow 4's `hit_provenance_backfill` can join Indicator Match alerts
 * back to the originating threat-reports doc via
 * `threat.enrichments.indicator.reference`.
 */
export const INDICATOR_REFERENCE_PREFIX = 'threat-report:' as const;

/**
 * Tool IDs. Use the `threat_intel.` namespace consistent with the skill name.
 */
export const THREAT_INTEL_TOOL_IDS = {
  searchReports: 'threat_intel.search_reports',
  ingestReport: 'threat_intel.ingest_report',
  huntBehavior: 'threat_intel.hunt_behavior',
  /**
   * Single subscription tool that supersedes the previous
   * `create_subscription` + `list_subscriptions` pair (action: 'create' |
   * 'list' | 'delete'). Merging frees an inline-tool slot under the
   * skill's hard cap of 7 inline tools.
   */
  manageSubscriptions: 'threat_intel.manage_subscriptions',
  coverageGap: 'threat_intel.coverage_gap',
  /**
   * Active per-report forward hunt across the customer's environment
   * indices. Distinct from `hunt_behavior` (which extracts behaviors from
   * report text into proposed DE rules) and from `hit_provenance_backfill`
   * (which attributes alerts back to reports retrospectively).
   */
  huntForThreat: 'threat_intel.hunt_for_threat',
  /**
   * Environment profile read used to tailor feed recommendations. Lives in
   * the registry tool slot (not on the skill's inline tool list) so it
   * doesn't consume one of the 7 inline slots.
   */
  analyseEnvironment: 'threat_intel.analyse_environment',
  extractIocs: 'threat_intel.extract_iocs',
  /**
   * Phase C — closes the brittle-alert → durable-behavioral-rule loop.
   * Reads a sample of alert documents already pulled by `security.alerts`,
   * runs the same behavioral extraction prompt as `hunt_behavior` against
   * the alert payloads, writes a synthetic `source.type: 'telemetry'`
   * row into the threat-reports data stream for provenance, and returns the same
   * validated behaviors + finding-card attachment hints as `hunt_behavior`
   * so the analyst can promote them to a durable Detection Engine rule.
   */
  generalizeFromTelemetry: 'threat_intel.generalize_from_telemetry',
  /**
   * One-call orchestrated hunt that chains the tradecraft-style two-tier
   * model: Tier 1 (`hunt_for_threat`, atomic IOC lookups) → Tier 2
   * (`hunt_behavior`, LLM-refined behavioral rules with the affected-asset
   * context from Tier 1 fed into the prompt). Workflows (digest delivery,
   * hit provenance backfill) call this directly via the internal HTTP
   * route so they get Tier 2 without having to encode the chaining
   * themselves; the granular tools remain available on the registry for
   * power-user / LLM-driven control flows.
   */
  huntOrchestrated: 'threat_intel.hunt_orchestrated',
  /**
   * Cross-report advisory synthesis. Pulls the top-N
   * corroborated-rank reports for a time window (and optional category /
   * region / tag filter), groups by `extracted.threat_actors` /
   * `extracted.categories`, and asks the LLM to produce a narrative
   * theme + a short "recommended actions" list. Optionally persists the
   * resulting advisory into `.kibana-threat-intel-advisories` for
   * dashboard / digest consumption. Registry-only — the skill is at
   * the 7-inline-tool cap.
   */
  synthesizeAdvisory: 'threat_intel.synthesize_advisory',
} as const;

/**
 * Public HTTP routes owned by this plugin.
 *
 * Every domain action exposes a versioned route at
 * `/api/threat_intelligence/<action>`. The Agent Builder skill markdown
 * documents these routes; the orchestrating agent invokes them via
 * `execute_workflow_step` with `kibana-request`. The same routes are
 * callable from ECLI, workflows, MCP clients, and other HTTP integrations.
 * Inline tools are thin portability wrappers that delegate to the shared
 * service modules these routes call.
 */
export const THREAT_INTELLIGENCE_API_BASE = '/api/threat_intelligence' as const;

/**
 * Domain action routes — these are the canonical execution surface of the
 * skill. Each path is consumed by exactly one Express route handler in
 * `server/routes/` and by exactly one shared service module in
 * `server/services/`.
 */
export const SEARCH_REPORTS_API_PATH = `${THREAT_INTELLIGENCE_API_BASE}/search_reports` as const;
export const INGEST_REPORT_API_PATH = `${THREAT_INTELLIGENCE_API_BASE}/ingest_report` as const;
export const HUNT_BEHAVIOR_API_PATH = `${THREAT_INTELLIGENCE_API_BASE}/hunt_behavior` as const;
export const HUNT_FOR_THREAT_API_PATH = `${THREAT_INTELLIGENCE_API_BASE}/hunt_for_threat` as const;
/**
 * Orchestrated Tier 1 → Tier 2 hunt — see {@link THREAT_INTEL_TOOL_IDS.huntOrchestrated}.
 * Workflows that need both tiers in a single call (digest delivery, hit
 * provenance backfill, future advisory synthesis) target this path
 * instead of chaining the two granular routes themselves. Same
 * `requiredPrivileges` as the two underlying actions (read).
 */
export const HUNT_ORCHESTRATED_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/hunt_orchestrated` as const;
/**
 * Cross-report advisory synthesis — see
 * {@link THREAT_INTEL_TOOL_IDS.synthesizeAdvisory}. Same
 * `requiredPrivileges` as `search_reports` (read) when `persist: false`;
 * the persist branch additionally requires write on the advisories
 * companion index, handled inside the route.
 */
export const SYNTHESIZE_ADVISORY_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/synthesize_advisory` as const;
export const COVERAGE_GAP_API_PATH = `${THREAT_INTELLIGENCE_API_BASE}/coverage_gap` as const;
export const GENERALIZE_FROM_TELEMETRY_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/generalize_from_telemetry` as const;
export const EXTRACT_IOCS_API_PATH = `${THREAT_INTELLIGENCE_API_BASE}/extract_iocs` as const;
export const ANALYSE_ENVIRONMENT_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/analyse_environment` as const;

/**
 * Subscription routes. The `submit` path is preserved for backwards
 * compatibility with the interactive subscription-confirmation attachment
 * (the form posts directly to it). The list / delete routes complete the
 * CRUD surface so the agent can call any subscription action through HTTP.
 */
export const SUBMIT_SUBSCRIPTION_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/subscriptions/submit` as const;
export const LIST_SUBSCRIPTIONS_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/subscriptions/list` as const;
export const DELETE_SUBSCRIPTION_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/subscriptions/delete` as const;

/**
 * API path that powers the visual dashboard. Returns the
 * aggregations the UI panels need in a single response — stats ribbon,
 * by-category breakdown, by-region "Affects You" panel, severity timeline,
 * top techniques (radar), recent-article grid, and environment-impact
 * totals. Backed by `_search` aggregations over the threat-reports data stream plus
 * a tiny terms agg on `.alerts-security.alerts-*` for the env-impact pill.
 */
export const DASHBOARD_OVERVIEW_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/dashboard/overview` as const;

/**
 * API path for the saved-view CRUD routes that back the dashboard's
 * "Save view" / "Load view" affordances. The view persists the dashboard
 * filter set (regions, categories, optional time range, dashboard flags) as
 * a saved object so users can share or revisit a curated cut of the data.
 */
export const SAVED_VIEWS_API_PATH = `${THREAT_INTELLIGENCE_API_BASE}/saved_views` as const;

/**
 * API for the document flyout Threat intelligence panel — joins the
 * current alert to `.kibana-threat-reports*` via Layer 1 indicator reference
 * and/or Layer 2 MITRE technique overlap (see RFC 0002).
 */
export const FLYOUT_INSIGHTS_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/flyout_insights` as const;

/**
 * Saved-object type for `threat-intelligence-saved-view`. The
 * `namespaceType: 'multiple-isolated'` setting means a saved view is
 * scoped to the originating space by default but can be shared via the
 * Spaces UI. The id is generated by the saved-objects client.
 */
export const SAVED_VIEW_SO_TYPE = 'threat-intelligence-saved-view' as const;

/**
 * Per-space advanced setting key for the dashboard's location-aware
 * defaults. The dashboard reads this on mount and pre-fills its
 * `regions` filter with the value. Defined here (not in the server-only
 * `ui_settings.ts`) so the browser UI can address the key without
 * duplicating it.
 */
export const DEFAULT_REGIONS_SETTING_KEY =
  'securitySolution:threatIntelligence:defaultRegions' as const;

/**
 * Sentinel value written to `space_id` to denote "visible from every space".
 * Used by the seeded source catalog and by global subscriptions so default
 * content stays usable regardless of which space the request originated
 * from. Routes resolve the current space, then filter
 * `{terms: { space_id: [currentSpace, GLOBAL_SPACE_ID] }}`.
 */
export const GLOBAL_SPACE_ID = '*' as const;

/**
 * Skill ID and name. Must match `^[a-z0-9-_]+$` per Agent Builder skill validation.
 */
export const THREAT_INTELLIGENCE_SKILL_ID = 'threat-intelligence' as const;

/**
 * Source types accepted by the source-agnostic ingestion pipeline.
 *
 * `telemetry` is reserved for Phase C (`threat_intel.generalize_from_telemetry`)
 * which closes the brittle-IOC-alert -> durable-behavioral-rule feedback loop.
 * Reserving the value now keeps Phase C purely additive.
 */
export const SOURCE_TYPES = [
  'rss',
  'stix',
  'taxii',
  'vendor_api',
  'email',
  'manual',
  'telemetry',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const IOC_TYPES = ['hash', 'ip', 'domain', 'url'] as const;
export type IocType = (typeof IOC_TYPES)[number];

/**
 * Closed-set detection actionability classifier emitted by the stage-2
 * enrichment in `nl_extraction_behavioral`. Co-pilots downstream
 * prioritization decisions ("should I bother running a hunt against this
 * report?"). Ordered from least to most actionable so a future numeric
 * mapping is monotonic.
 *
 *   - `informational`  : narrative / opinion / context only; nothing to detect on.
 *   - `iocs_only`      : atomic indicators present (IPs, domains, hashes) but
 *                        no behavior described. Useful for Indicator Match,
 *                        not for behavioral rules.
 *   - `ttps_present`   : behavioral TTPs / ATT&CK techniques described but
 *                        no concrete detection guidance.
 *   - `rule_candidate` : behavioral details concrete enough to derive a
 *                        durable Detection Engine rule from.
 */
export const DETECTION_ACTIONABILITY_LEVELS = [
  'informational',
  'iocs_only',
  'ttps_present',
  'rule_candidate',
] as const;
export type DetectionActionability = (typeof DETECTION_ACTIONABILITY_LEVELS)[number];

/**
 * Sort modes for `threat_intel.search_reports`. The default (`'rank'`) is the
 * tradecraft-style multiplicative `severity.score * extracted.relevance`
 * composite — see the `rank_score` field on the threat-reports data stream.
 * `'severity'` falls back to the legacy single-dimension `severity.score`
 * sort. `'recency'` sorts by `@timestamp desc`. `'relevance'` is the implicit
 * default when `sort_by` is omitted entirely — it preserves the RRF
 * (semantic + BM25) retriever ordering for free-text discovery.
 */
export const REPORT_SORT_OPTIONS = ['rank', 'severity', 'recency', 'relevance'] as const;
export type ReportSortBy = (typeof REPORT_SORT_OPTIONS)[number];

/**
 * Tradecraft-style two-tier telemetry-probe discriminator.
 *
 *   - `1` (atomic)        : point lookups on ECS fields like `source.ip`,
 *                           `dns.question.name`, `file.hash.sha256`.
 *                           Cheap, high-specificity. Backed today by
 *                           `huntForThreat`.
 *   - `2` (corroboration) : behavioral / multi-event queries — typically
 *                           `process.name` + `process.command_line`
 *                           patterns refined per article context. Backed
 *                           today by `huntBehavior`. Only meaningful to
 *                           run when Tier 1 has matched at least once
 *                           (the corroboration semantic), but the
 *                           orchestrator's `tier2_when: 'always'` mode
 *                           also lets callers run Tier 2 standalone to
 *                           propose durable rules from report text alone.
 *
 * Carried on every `huntOrchestrated` result so consumers (digest
 * delivery, hit provenance backfill, dashboard "Tier-2 corroborated"
 * pill) can distinguish the two tiers without inspecting the underlying
 * sub-results. Reserved for the future Streams KI probe registry: a
 * `TelemetryProbe` interface with `tier: TelemetryProbeTier` becomes the
 * cross-team contract once the RFC lands; the current hunt services are
 * the in-tree default implementation.
 */
export const TELEMETRY_PROBE_TIERS = [1, 2] as const;
export type TelemetryProbeTier = (typeof TELEMETRY_PROBE_TIERS)[number];

/**
 * Caller-facing knob on `huntOrchestrated` controlling whether Tier 2
 * runs. Tradecraft's pipeline only runs Tier 2 when Tier 1 has at least
 * one environment hit (the corroboration semantic) — that is the default
 * (`'on_hits'`). `'always'` is useful for "propose rules from this
 * report regardless of current activity" flows (digest, advisory
 * synthesis). `'never'` is a defensive option for callers that only
 * want the atomic IOC lookup result.
 */
export const HUNT_TIER2_WHEN_OPTIONS = ['on_hits', 'always', 'never'] as const;
export type HuntTier2When = (typeof HUNT_TIER2_WHEN_OPTIONS)[number];

/**
 * Customer environment indices searched by `threat_intel.hunt_for_threat`
 * when performing a forward-hunt for a report's IOCs. Mirrors the PRD's
 * named index set so the forward-hunt covers the same surfaces a SOC
 * analyst would search manually:
 *
 *   - `.alerts-security.alerts-*` — pre-existing detections (lookbehind).
 *   - `metrics-endpoint.*`        — Elastic Defend endpoint metrics.
 *   - `logs-vulnerability.*`      — vulnerability scanner output.
 *   - `logs-aws.*`                — AWS service logs (CloudTrail, VPC flow,
 *                                   GuardDuty, etc.).
 *   - `logs-network_traffic.*`    — network traffic integration logs.
 *
 * Each pattern is searched with `ignore_unavailable=true` and
 * `allow_no_indices=true` so environments missing an integration simply
 * return zero hits instead of a runtime error.
 */
export const HUNT_FOR_THREAT_INDEX_PATTERNS = [
  '.alerts-security.alerts-*',
  'metrics-endpoint.*',
  'logs-vulnerability.*',
  'logs-aws.*',
  'logs-network_traffic.*',
] as const;

/**
 * Closed-set threat category taxonomy. Primary values match
 * `elastic/security-ciso-news-aggregator` (`src/types/index.ts`). Legacy
 * PRD slugs remain valid for documents indexed before the alignment.
 */
export const THREAT_CATEGORIES = [
  'ransomware',
  'phishing',
  'malware',
  'data-breach',
  'vulnerability',
  'nation-state',
  'supply-chain',
  'insider-threat',
  'financial',
  'regulatory',
  'cloud-security',
  'iot-ot',
  'zero-day',
  'apt',
  'general',
  'cloud',
  'cybercrime',
  'iot',
  'ot-ics',
  'government-policy',
  'privacy-compliance',
  'research-tools',
] as const;
export type ThreatCategory = (typeof THREAT_CATEGORIES)[number];

/**
 * Closed-set geographic region taxonomy. Matches the UN M49 macro regions
 * the PRD's "Affects You" location-aware view consumes. The LLM enrichment
 * step picks zero or more of these per report (a report can mention multiple
 * regions, e.g. an SE Asia APT targeting NA companies).
 */
export const THREAT_REGIONS = [
  'north-america',
  'south-america',
  'europe',
  'middle-east',
  'africa',
  'south-asia',
  'east-asia',
  'southeast-asia',
  'oceania',
  'global',
] as const;
export type ThreatRegion = (typeof THREAT_REGIONS)[number];
