/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeCheck } from '@kbn/alerting-v2-plugin/public';
import type { Capabilities } from '@kbn/core/public';
import {
  OBSERVABILITY_ALERTS_FEATURE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
  AlertConsumers,
} from '@kbn/rule-data-utils';

const ALERTING_V2_FEATURE_IDS: Record<string, string> = {
  rules: 'alerting_v2_rules',
  alerts: 'alerting_v2_alerts',
  actionPolicies: 'alerting_v2_action_policies',
  executionHistory: 'alerting_v2_execution_history',
};

const V1_ALERTING_FEATURE_IDS: readonly string[] = [
  OBSERVABILITY_ALERTS_FEATURE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
  AlertConsumers.LOGS,
];

/**
 * United privilege gate: v1 `show`/`write` or v2 `read`/`all` on every
 * requested alerting v2 feature.
 */
export const hasObservabilityAlertingPrivilege = (
  capabilities: Capabilities,
  features: Parameters<PrivilegeCheck>[0],
  capability: Parameters<PrivilegeCheck>[1]
): boolean => {
  const v1CapKey = capability === 'all' ? 'write' : 'show';
  const hasV1 = V1_ALERTING_FEATURE_IDS.some(
    (featureId) => capabilities[featureId]?.[v1CapKey] === true
  );

  const v2CapKey = capability === 'all' ? 'all' : 'read';
  const hasV2 = features.every(
    (f) => capabilities[ALERTING_V2_FEATURE_IDS[f]]?.[v2CapKey] === true
  );

  return hasV1 || hasV2;
};
