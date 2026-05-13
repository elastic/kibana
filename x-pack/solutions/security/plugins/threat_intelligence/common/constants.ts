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
export const THREAT_REPORTS_INDEX_PATTERN = '.kibana-threat-reports-*' as const;
export const THREAT_INTEL_SOURCES_INDEX = '.kibana-threat-intel-sources' as const;
export const THREAT_INTEL_SUBSCRIPTIONS_INDEX = '.kibana-threat-intel-subscriptions' as const;
// Recurring-query recall is intentionally not a plugin-owned capability:
// users re-open the originating conversation via the agent-builder history
// sidebar. Any future scheduled re-run feature must introduce its own
// persistence layer.
export const THREAT_INTEL_DIGESTS_INDEX = '.kibana-threat-intel-digests' as const;
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
 * back to the originating threat-reports doc by exact term match.
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
} as const;

/**
 * Internal HTTP routes owned by this plugin.
 *
 * Per the Agent Builder architecture guidance, every domain action exposes
 * an internal HTTP route at `/internal/threat_intelligence/<action>`. The
 * Agent Builder skill markdown documents these routes and the orchestrating
 * agent invokes them via `execute_workflow_step` with `kibana-request`. The
 * same routes are also callable from ECLI, workflows, and 3rd party agents
 * without rework. Inline tools survive as thin portability wrappers (for
 * Claude / Cursor) that delegate to the shared service modules these routes
 * call.
 */
export const THREAT_INTELLIGENCE_API_BASE = '/internal/threat_intelligence' as const;

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
 * Internal API path that powers the visual dashboard. Returns the
 * aggregations the UI panels need in a single response — stats ribbon,
 * by-category breakdown, by-region "Affects You" panel, severity timeline,
 * top techniques (radar), recent-article grid, and environment-impact
 * totals. Backed by `_search` aggregations over the threat-reports data stream plus
 * a tiny terms agg on `.alerts-security.alerts-*` for the env-impact pill.
 */
export const DASHBOARD_OVERVIEW_API_PATH =
  `${THREAT_INTELLIGENCE_API_BASE}/dashboard/overview` as const;

/**
 * Internal API path for the saved-view CRUD routes that back the dashboard's
 * "Save view" / "Load view" affordances. The view persists the dashboard
 * filter set (regions, categories, optional time range, dashboard flags) as
 * a saved object so users can share or revisit a curated cut of the data.
 */
export const SAVED_VIEWS_API_PATH = `${THREAT_INTELLIGENCE_API_BASE}/saved_views` as const;

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
 * Closed-set threat category taxonomy. Tracks the PRD's 15-category list so
 * the visual dashboard's category-breakdown panel + the
 * `threat_intel.search_reports` `categories[]` filter can both rely on the
 * same enum. The LLM enrichment step in `nl_extraction_behavioral` is
 * constrained to this enum so dashboards don't have to handle long-tail
 * free-text labels.
 */
export const THREAT_CATEGORIES = [
  'apt',
  'malware',
  'ransomware',
  'vulnerability',
  'data-breach',
  'phishing',
  'cloud',
  'supply-chain',
  'cybercrime',
  'insider-threat',
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
