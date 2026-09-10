/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Capabilities } from '@kbn/core/public';
import { ALERTS_UI_READ, RULES_UI_READ } from '@kbn/security-solution-features/constants';
import {
  SECURITY_FEATURE_ID,
  CASES_FEATURE_ID,
  RULES_FEATURE_ID,
  ALERTS_FEATURE_ID,
} from '../common/constants';

export function hasAccessToSecuritySolution(capabilities: Capabilities): boolean {
  return Boolean(
    capabilities[SECURITY_FEATURE_ID]?.show ||
      capabilities.securitySolutionAttackDiscovery?.['attack-discovery'] ||
      hasAccessToRules(capabilities) ||
      hasAccessToAlerts(capabilities)
  );
}

/** Attack Discovery requires Alerts read; used for route-level availability. */
export function hasAccessToAttackDiscovery(capabilities: Capabilities): boolean {
  return hasAccessToSecuritySolution(capabilities) && hasAccessToAlerts(capabilities) === true;
}
export function hasAccessToRules(capabilities: Capabilities): boolean {
  return Boolean(capabilities[RULES_FEATURE_ID]?.[RULES_UI_READ]);
}

export function hasAccessToAlerts(capabilities: Capabilities): boolean {
  return Boolean(capabilities[ALERTS_FEATURE_ID]?.[ALERTS_UI_READ]);
}

export function hasAccessToCases(capabilities: Capabilities): boolean {
  return Boolean(capabilities[CASES_FEATURE_ID]?.read_cases);
}

export function isSecuritySolutionAccessible(capabilities: Capabilities) {
  return hasAccessToSecuritySolution(capabilities) || hasAccessToCases(capabilities);
}
