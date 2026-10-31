/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { endpointPartValues } from '../../hosts';

export const namedCaveatValues = [
  'target_not_found',
  'target_ambiguous',
  'host_unenrolled',
] as const;
export type NamedCaveat = (typeof namedCaveatValues)[number];

export const caveatPrefixValues = ['unauthorized:', 'unavailable:'] as const;
export type CaveatPrefix = (typeof caveatPrefixValues)[number];

export const AT_CAVEATS_MAX =
  namedCaveatValues.length + caveatPrefixValues.length * endpointPartValues.length;

export const healthReasonValues = [
  'policy_response_failure',
  'policy_response_warning',
  'policy_response_unsupported',
  'policy_action_not_success',
  'policy_action_unsupported',
  'agent_offline',
  'agent_unhealthy',
  'agent_inactive',
  'host_updating',
  'component_unhealthy',
  'unit_unhealthy',
  'component_transitional',
  'endpoint_unenrolled',
  'policy_response_missing',
  'policy_response_unread',
  'agent_components_unread',
] as const;
export type HealthReason = (typeof healthReasonValues)[number];

export const healthStateValues = [
  'policy_failure',
  'non_policy_failure',
  'undetermined',
  'healthy',
] as const;
export type HealthState = (typeof healthStateValues)[number];
