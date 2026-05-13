/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public surface for the threat-intelligence "Intelligence Hub" common
 * shared types. Originated in the standalone threat-intelligence plugin's
 * `common/index.ts` and moved here when that plugin was folded into
 * `security_solution`. Experimental-feature flags previously re-exported
 * from this barrel live in
 * `x-pack/solutions/security/plugins/security_solution/common/experimental_features.ts`
 * — consume them from there.
 */
export type { SourceType, SeverityLevel, IocType, ThreatCategory, ThreatRegion } from './constants';
export {
  PLUGIN_ID,
  PLUGIN_NAME,
  THREAT_INTELLIGENCE_FEATURE_ID,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  GLOBAL_SPACE_ID,
  THREAT_REPORTS_DATA_STREAM,
  THREAT_REPORTS_INDEX_PATTERN,
  THREAT_INTEL_SOURCES_INDEX,
  THREAT_INTEL_SUBSCRIPTIONS_INDEX,
  THREAT_INTEL_DIGESTS_INDEX,
  THREAT_INTEL_INDICATORS_INDEX,
  INDICATOR_REFERENCE_PREFIX,
  THREAT_INTEL_TOOL_IDS,
  THREAT_INTELLIGENCE_SKILL_ID,
  SOURCE_TYPES,
  SEVERITY_LEVELS,
  IOC_TYPES,
  THREAT_CATEGORIES,
  THREAT_REGIONS,
  HUNT_FOR_THREAT_INDEX_PATTERNS,
  THREAT_INTELLIGENCE_API_BASE,
  SEARCH_REPORTS_API_PATH,
  INGEST_REPORT_API_PATH,
  HUNT_BEHAVIOR_API_PATH,
  HUNT_FOR_THREAT_API_PATH,
  COVERAGE_GAP_API_PATH,
  GENERALIZE_FROM_TELEMETRY_API_PATH,
  EXTRACT_IOCS_API_PATH,
  ANALYSE_ENVIRONMENT_API_PATH,
  SUBMIT_SUBSCRIPTION_API_PATH,
  LIST_SUBSCRIPTIONS_API_PATH,
  DELETE_SUBSCRIPTION_API_PATH,
  DASHBOARD_OVERVIEW_API_PATH,
  SAVED_VIEWS_API_PATH,
  SAVED_VIEW_SO_TYPE,
  DEFAULT_REGIONS_SETTING_KEY,
} from './constants';
export type { SubscriptionTemplate, SubscriptionTemplateId } from './subscription_templates';
export {
  SUBSCRIPTION_TEMPLATES,
  SUBSCRIPTION_TEMPLATE_IDS,
  getSubscriptionTemplate,
} from './subscription_templates';
export type { BehaviorExport } from './rule_export';
export {
  proposedEsqlRule,
  sanitizeRuleName,
  severityToRiskScore,
  severityFromConfidence,
} from './rule_export';
export type { DashboardOverviewResponse } from './dashboard_types';
export type { SavedViewAttributes, SavedViewSummary } from './saved_views';
export type {
  MitreHeatmapPayload,
  ReportTablePayload,
  SeverityTimelinePayload,
  SubscriptionConfirmationPayload,
  FindingCardPayload,
} from './attachment_payloads';
