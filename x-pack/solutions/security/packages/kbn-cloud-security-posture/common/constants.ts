/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VulnSeverity } from './types/vulnerabilities';
import type { MisconfigurationEvaluationStatus } from './types/misconfigurations';

export const KSPM_POLICY_TEMPLATE = 'kspm';
export const CSPM_POLICY_TEMPLATE = 'cspm';
export const CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS =
  'security_solution-cloud_security_posture.misconfiguration_latest';

export const DEPRECATED_CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN =
  'logs-cloud_security_posture.findings_latest-default';

export const CDR_LATEST_THIRD_PARTY_MISCONFIGURATIONS_INDEX_PATTERN =
  'security_solution-*.misconfiguration_latest';
export const CDR_MISCONFIGURATIONS_INDEX_PATTERN =
  CDR_LATEST_THIRD_PARTY_MISCONFIGURATIONS_INDEX_PATTERN;

export const CDR_MISCONFIGURATIONS_DATA_VIEW_NAME = 'Latest Cloud Security Misconfigurations';
export const LATEST_FINDINGS_RETENTION_POLICY = '26h';
export const MAX_FINDINGS_TO_LOAD = 500;
export const CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH =
  '/internal/cloud_security_posture/rules/_get_states';
export const CSP_GET_BENCHMARK_RULES_STATE_API_CURRENT_VERSION = '1';
export const STATUS_ROUTE_PATH = '/internal/cloud_security_posture/status';
export const STATUS_API_CURRENT_VERSION = '1';

/** The base path for all cloud security posture pages. */
export const CLOUD_SECURITY_POSTURE_BASE_PATH = '/cloud_security_posture';

// Array of legacy data view IDs for migration purposes
export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS = [
  'cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe', // legacy version 8.x version (logs-cloud_security_posture.findings_latest-*)
  'cloud_security_posture-9129a080-7f48-11ec-8249-431333f83c5f', // legacy version 8.x version (logs-cloud_security_posture.findings-*)
];
// Array of old data view IDs for migration purposes
// Add new deprecated versions here when updating to a new version
export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS = [
  'security_solution_cdr_latest_misconfigurations', // v1
];

// Current data view ID - increment version when making breaking changes
export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX =
  'security_solution_cdr_latest_misconfigurations_v2';

export const SECURITY_DEFAULT_DATA_VIEW_ID = 'security-solution-default';

export const CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN =
  'logs-cloud_security_posture.vulnerabilities_latest-default';
export const CDR_LATEST_THIRD_PARTY_VULNERABILITIES_INDEX_PATTERN =
  'security_solution-*.vulnerability_latest';
export const CDR_VULNERABILITIES_INDEX_PATTERN = `${CDR_LATEST_THIRD_PARTY_VULNERABILITIES_INDEX_PATTERN},${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN}`;
export const LATEST_VULNERABILITIES_RETENTION_POLICY = '3d';

export const CDR_VULNERABILITIES_DATA_VIEW_NAME = 'Latest Cloud Security Vulnerabilities';

// Array of legacy vulnerabilities data view IDs for migration purposes
export const CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS = [
  'cloud_security_posture-c406d945-a359-4c04-9a6a-65d66de8706b', // legacy 8.x version (logs-cloud_security_posture.vulnerabilities-*)
  'cloud_security_posture-07a5e6d6-982d-4c7c-a845-5f2be43279c9', // legacy 8.x version (logs-cloud_security_posture.vulnerabilities_latest-*)
];
// Array of old vulnerabilities data view IDs for migration purposes
// Add new deprecated versions here when updating to a new version
export const CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS = [
  'security_solution_cdr_latest_vulnerabilities', // v1
];

// Current vulnerabilities data view ID - increment version when making breaking changes
export const CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX =
  'security_solution_cdr_latest_vulnerabilities_v2';

// meant as a temp workaround to get good enough posture view for 3rd party integrations, see https://github.com/elastic/security-team/issues/10683 and https://github.com/elastic/security-team/issues/10801
export const CDR_EXTENDED_VULN_RETENTION_POLICY = '90d';

export const CSP_MISCONFIGURATIONS_DATASET = 'cloud_security_posture.findings';

export const VULNERABILITIES_SEVERITY: Record<VulnSeverity, VulnSeverity> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
  UNKNOWN: 'UNKNOWN',
};

export const MISCONFIGURATION_STATUS: Record<string, MisconfigurationEvaluationStatus> = {
  PASSED: 'passed',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
};

export const CSP_MOMENT_FORMAT = 'MMMM D, YYYY @ HH:mm:ss.SSS';

// A mapping of in-development features to their status. These features should be hidden from users but can be easily
// activated via a simple code change in a single location.
export const INTERNAL_FEATURE_FLAGS = {
  showManageRulesMock: false,
  showFindingFlyoutEvidence: true,
} as const;

export const DETECTION_RULE_RULES_API_CURRENT_VERSION = '2023-10-31';

export const FINDINGS_INDEX_PATTERN = 'logs-cloud_security_posture.findings-default*';

// space plachoder - to be replaced by the specific kibana space
export const GENERIC_ENTITY_INDEX_ENRICH_POLICY =
  'entity_store_field_retention_generic_<space>_v1.0.0';

export const CLOUD_SECURITY_PLUGIN_VERSION = '1.9.0';

/**
 * Entity store latest index pattern for LOOKUP JOIN queries.
 * The <space> placeholder should be replaced with the actual space ID.
 */
export const ENTITIES_LATEST_INDEX = '.entities.v2.latest.security_<space>';

/**
 * Relationship fields available in the generic entities index.
 * These represent static/configuration-based relationships between entities.
 *
 * WARNING: ES|QL FORK supports a maximum of 8 branches. If more than 8 fields are added here,
 * the relationship fetching logic in fetch_entity_relationships_graph.ts will need to be updated
 * to batch the FORK queries.
 */
export const ENTITY_RELATIONSHIP_FIELDS = [
  'Accesses_frequently',
  'Communicates_with',
  'Depends_on',
  'Owns',
  'Supervises',
] as const;

// Keys must match ENTITY_RELATIONSHIP_FIELDS values which use Entity Store naming convention
/* eslint-disable @typescript-eslint/naming-convention */
export const ENTITY_RELATIONSHIP_LABELS: Record<
  (typeof ENTITY_RELATIONSHIP_FIELDS)[number],
  string
> = {
  Accesses_frequently: 'Accesses frequently',
  Communicates_with: 'Communicates with',
  Depends_on: 'Depends on',
  Owns: 'Owns',
  Supervises: 'Supervises',
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * ECS entity actor fields used for graph visualization.
 * NOTE: The order has meaning - it represents the fallback mechanism for detecting the actor field.
 */
export const GRAPH_ACTOR_ENTITY_FIELDS = [
  'user.entity.id',
  'host.entity.id',
  'service.entity.id',
  'entity.id',
] as const;

/**
 * ECS entity target fields used for graph visualization.
 * NOTE: The order does NOT have meaning - all target fields are captured and aggregated together.
 */
export const GRAPH_TARGET_ENTITY_FIELDS = [
  'user.target.entity.id',
  'host.target.entity.id',
  'service.target.entity.id',
  'entity.target.id',
] as const;
