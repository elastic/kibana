/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { ExceptionListOsType } from '@kbn/securitysolution-exceptions-common/api';

export const familyValues = [
  'trusted_apps',
  'event_filters',
  'blocklist',
  'host_isolation_exceptions',
  'trusted_devices',
  'endpoint_exceptions',
] as const;

export const familySchema = lazySchema(() => z.enum(familyValues));
export type Family = z.infer<typeof familySchema>;

export const LIST_ID_BY_FAMILY = {
  trusted_apps: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
  event_filters: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
  blocklist: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
  host_isolation_exceptions: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
  trusted_devices: ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
  endpoint_exceptions: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
} as const satisfies Record<Family, string>;

export const FAMILY_BY_LIST_ID = {
  [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: 'trusted_apps',
  [ENDPOINT_ARTIFACT_LISTS.eventFilters.id]: 'event_filters',
  [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: 'blocklist',
  [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id]: 'host_isolation_exceptions',
  [ENDPOINT_ARTIFACT_LISTS.trustedDevices.id]: 'trusted_devices',
  [ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id]: 'endpoint_exceptions',
} as const;

export type ArtifactListId = keyof typeof FAMILY_BY_LIST_ID;

export const osValues = ExceptionListOsType.options;
export const osSchema = ExceptionListOsType;
export type OS = z.infer<typeof osSchema>;

export const sourceValues = [
  'structural',
  'estimated_from_events',
  'estimated_from_alerts',
  'endpoint_reported',
  'unavailable',
] as const;
export const sourceSchema = lazySchema(() => z.enum(sourceValues));
export type Source = z.infer<typeof sourceSchema>;

export const severityValues = ['info', 'low', 'medium', 'high'] as const;
export const severitySchema = lazySchema(() => z.enum(severityValues));
export type Severity = z.infer<typeof severitySchema>;

export const findingKindValues = [
  'blocklist_trusted_app_conflict',
  'over_broad_wildcard',
  'invalid_proposed_entry',
  'signer_without_trust_check',
  'rule_impact',
  'duplicate',
  'no_os_type',
  'empty_entries',
  'unassigned_policy_scope',
  'path_only_trusted_app',
  'field_not_in_stream',
  'condition_tightenable',
  'scope_narrowable',
  'overlapping_entries',
  'scope_widenable',
  'trusts_process_descendants',
  'os_without_hosts',
  'no_recent_activity',
  'policy_not_visible_in_space',
  'disabled',
  'missing_justification',
] as const;

export const findingKindSchema = lazySchema(() => z.enum(findingKindValues));
export type FindingKind = z.infer<typeof findingKindSchema>;

export const findingCaveatTokens = [
  'cross_space_scope',
  'single_signer_entry_limit',
  'signer_not_supported_for_os',
  'multiple_signer_entries',
  'no_version',
  'item_disabled',
  'empty_entries',
  'policies_truncated',
  'unassigned_scope',
  'descendants_not_estimated',
  'no_os_type',
  'family_stream_unverified',
  'family_not_supported_for_activity',
  'suppression_estimate',
  'index_unauthorized',
  'multi_os_case_rule',
  'rules_unauthorized',
] as const;

export type FindingCaveatToken = (typeof findingCaveatTokens)[number];

export const FINDING_CAVEAT_PREFIXES = ['unsupported_entry_type:'] as const;

export const findingCaveatSchema = lazySchema(() =>
  z
    .string()
    .refine(
      (value) =>
        (findingCaveatTokens as readonly string[]).includes(value) ||
        FINDING_CAVEAT_PREFIXES.some(
          (prefix) => value.startsWith(prefix) && value.length > prefix.length
        ),
      { message: 'unknown finding caveat' }
    )
);

export const workflowCaveatPrefixes = [
  'families_unauthorized:',
  'context_unavailable:',
  'fetch_unstable:',
  'items_truncated:',
  'item_not_found:',
  'family_disabled:',
] as const;

export const workflowCaveatTokens = [
  'conflict_check_unavailable',
  'coverage_incomplete',
  'rules_unauthorized',
  'index_unauthorized',
  'knowledge_unavailable',
  'output_budget',
] as const;

export const workflowCaveatSchema = lazySchema(() =>
  z
    .string()
    .refine(
      (value) =>
        (workflowCaveatTokens as readonly string[]).includes(value) ||
        workflowCaveatPrefixes.some(
          (prefix) => value.startsWith(prefix) && value.length > prefix.length
        ),
      { message: 'unknown workflow caveat' }
    )
);
