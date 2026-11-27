/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const POLICY_TRUNCATION_REASONS = [
  'string_truncated',
  'array_truncated',
  'object_truncated',
  'depth_truncated',
] as const;

export type TruncationReason = (typeof POLICY_TRUNCATION_REASONS)[number];

export const SET_FIELD_VALUE_TYPES = {
  enum: 'enum',
  boolean: 'boolean',
  manifest_version: 'manifest_version',
  string: 'string',
  number: 'number',
} as const;

export const SET_FIELD_MANIFEST_KEYWORDS = ['latest'] as const;

export type SetFieldValueDomain =
  | { readonly type: typeof SET_FIELD_VALUE_TYPES.enum; readonly values: readonly string[] }
  | { readonly type: typeof SET_FIELD_VALUE_TYPES.boolean }
  | {
      readonly type: typeof SET_FIELD_VALUE_TYPES.manifest_version;
      readonly keywords: typeof SET_FIELD_MANIFEST_KEYWORDS;
      readonly earliest: string;
      readonly latest: string;
    }
  | { readonly type: typeof SET_FIELD_VALUE_TYPES.string }
  | { readonly type: typeof SET_FIELD_VALUE_TYPES.number };

export const FIELD_REFERENCE_MATCH_MODES = {
  exact: 'exact',
  protection_key_path: 'protection_key_path',
  os_less_remainder: 'os_less_remainder',
  none: 'none',
  search: 'search',
} as const;

export const POLICY_ASSESSMENT_ADVISORY_CODES = {
  protection_weakened: 'protection_weakened',
  protection_setting_weakened: 'protection_setting_weakened',
  global_manifest_version_stale: 'global_manifest_version_stale',
} as const;

export const POLICY_CHANGE_ORIGIN_KINDS = ['direct', 'coupled'] as const;

export type PolicyChangeOriginKind = (typeof POLICY_CHANGE_ORIGIN_KINDS)[number];

export const POLICY_USAGE_CLASSIFICATIONS = ['used', 'unused', 'undetermined'] as const;

export const LIST_USAGE_UNAVAILABLE = 'requires_endpoint_list_read' as const;

export const ENDPOINT_COUNT_SOURCES = [
  'fleet_status_aggregation',
  'no_agent_policy_assignments',
] as const;

export const ENDPOINT_COUNT_POPULATION = 'enrolled_agents' as const;

export const ENDPOINT_POLICY_LIST_POPULATION = 'endpoint_package_policies' as const;

export const FIELD_REFERENCE_DOCUMENTATION_AVAILABILITY = ['absent', 'present'] as const;

export const FIELD_REFERENCE_LONG_FORM_GUIDANCE = 'not_retrieved_by_this_tool' as const;

export const FIELD_REFERENCE_UNKNOWN_PATH_REASON = 'unknown_path' as const;

export const POLICY_CHANGE_SIDE_EFFECT_REASON = 'derived_field_update' as const;

export const POLICY_COMPARISON_ABSENT_SIDES = ['from', 'to'] as const;

export const POLICY_BASELINE_UNRESOLVED_TELEMETRY = 'unresolved' as const;

export const POLICY_WRITE_OBSERVATION_AVAILABILITY = ['available', 'unavailable'] as const;

export const ROLLOUT_COVERAGE_SOURCES = [
  'united_metadata_tuple_aggregation',
  'no_agent_policy_assignments',
  'united_index_missing',
] as const;

export const ROLLOUT_RESPONSE_SOURCES = [
  'policy_response_latest_per_agent',
  'policy_response_index_missing',
  'no_agent_policy_assignments',
  'united_index_missing',
  'united_agent_id_set_empty',
] as const;

export const ROLLOUT_COVERAGE_POPULATION =
  'readable_united_endpoint_hosts_canonical_assignment_matches_target_agent_policy_ids' as const;

export const ROLLOUT_RESPONSE_POPULATION =
  'latest_policy_responses_for_assignment_matched_agents_at_current_package_revision' as const;
