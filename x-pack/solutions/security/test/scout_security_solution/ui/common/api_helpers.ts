/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomQueryRule } from '@kbn/scout-security/src/playwright/constants/detection_rules';
import {
  CUSTOM_QUERY_RULE,
  DEFAULT_SECURITY_SOLUTION_INDEXES,
} from '@kbn/scout-security/src/playwright/constants/detection_rules';
import type { SecurityApiServicesFixture } from '@kbn/scout-security';

/**
 * Create a detection rule via API.
 */
export async function createRule(
  apiServices: SecurityApiServicesFixture,
  overrides: Partial<CustomQueryRule> = {}
): Promise<void> {
  const timestamp = Date.now();
  const rule: CustomQueryRule = {
    ...CUSTOM_QUERY_RULE,
    index: DEFAULT_SECURITY_SOLUTION_INDEXES,
    name: `New Rule Test ${timestamp}`,
    rule_id: `rule-${timestamp}`,
    ...overrides,
  };
  await apiServices.detectionRule.createCustomQueryRule(rule);
}

/**
 * Delete all detection rules and alerts.
 */
export async function deleteAlertsAndRules(
  apiServices: SecurityApiServicesFixture
): Promise<void> {
  try {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionAlerts.deleteAll();
  } catch {
    // Cleanup best-effort; ignore errors
  }
}
