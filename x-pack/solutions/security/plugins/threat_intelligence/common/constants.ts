/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'threatIntelligence' as const;
export const PLUGIN_NAME = 'Threat Intelligence' as const;

/**
 * Indices and data stream names owned by this plugin.
 */
export const THREAT_REPORTS_DATA_STREAM = 'threat-reports' as const;
export const THREAT_REPORTS_INDEX_PATTERN = 'threat-reports-*' as const;
export const THREAT_INTEL_SOURCES_INDEX = '.threat-intel-sources' as const;
export const THREAT_INTEL_SUBSCRIPTIONS_INDEX = '.threat-intel-subscriptions' as const;
// Recurring-query recall is intentionally not a plugin-owned capability:
// users re-open the originating conversation via the agent-builder history
// sidebar. Any future scheduled re-run feature must introduce its own
// persistence layer.
export const THREAT_INTEL_DIGESTS_INDEX = '.threat-intel-digests' as const;
/**
 * Destination index for IOC indicators synced from `threat-reports-*` by the
 * Task Manager job (`server/tasks/ioc_indicator_sync.ts`). Detection Engine's
 * Indicator Match rule can be configured to query this index — the rows are
 * shaped to ECS `threat.indicator.*` so the rule's default field mapping
 * works without further customization.
 */
export const THREAT_INTEL_INDICATORS_INDEX = '.threat-intel-indicators' as const;
/**
 * Prefix written to `threat.indicator.reference` on every synced indicator
 * so Workflow 4's `hit_provenance_backfill` can join Indicator Match alerts
 * back to the originating `threat-reports-*` doc by exact term match.
 */
export const INDICATOR_REFERENCE_PREFIX = 'threat-report:' as const;

/**
 * Tool IDs. Use the `threat_intel.` namespace consistent with the skill name.
 */
export const THREAT_INTEL_TOOL_IDS = {
  searchReports: 'threat_intel.search_reports',
  ingestReport: 'threat_intel.ingest_report',
  huntBehavior: 'threat_intel.hunt_behavior',
  createSubscription: 'threat_intel.create_subscription',
  listSubscriptions: 'threat_intel.list_subscriptions',
  coverageGap: 'threat_intel.coverage_gap',
  extractIocs: 'threat_intel.extract_iocs',
} as const;

/**
 * Internal HTTP routes owned by this plugin.
 *
 * The interactive subscription form posts directly here from the browser
 * renderer instead of waiting on a second agent round-trip. This is the
 * "JSON-RPC back into create_subscription" path that replaces the Phase A
 * read-only confirmation card.
 */
export const SUBMIT_SUBSCRIPTION_API_PATH =
  '/internal/threat_intelligence/subscriptions/submit' as const;

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
