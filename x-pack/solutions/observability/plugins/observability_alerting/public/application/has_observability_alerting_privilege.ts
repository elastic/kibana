/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';

const ALERTING_V2_FEATURE_IDS: Record<string, string> = {
  rules: 'alerting_v2_rules',
  alerts: 'alerting_v2_alerts',
  actionPolicies: 'alerting_v2_action_policies',
  executionHistory: 'alerting_v2_execution_history',
};

/** Nav visibility gate per alerting feature (v1 capabilities or v2 read). */
export const hasObservabilityAlertingCapabilities = (
  capabilities: Capabilities,
  feature: string
): { v1: boolean; v2: boolean } => {
  let v1: boolean;
  switch (feature) {
    case 'alerts':
      v1 = hasObservabilityAlertsV1Capability(capabilities);
      break;
    case 'rules':
      v1 = hasObservabilityRulesV1Capability(capabilities);
      break;
    default:
      v1 = false;
  }

  const v2 = capabilities[ALERTING_V2_FEATURE_IDS[feature]]?.read === true;

  return { v1, v2 };
};

/** Capability-based check: does the user have any observability alerting access? */
export const hasObservabilityAlertsV1Capability = (capabilities: Capabilities): boolean =>
  hasObservabilityRulesV1Capability(capabilities) ||
  capabilities.observabilityAlerts?.show === true;

/** Capability-based check: does the user have any observability rules access? */
export const hasObservabilityRulesV1Capability = (capabilities: Capabilities): boolean => {
  const { apm, metrics, uptime, synthetics, slo } = capabilities.navLinks;
  const logs = capabilities.logs?.show;

  return Object.values({ apm, logs, metrics, uptime, synthetics, slo }).some(Boolean);
};
