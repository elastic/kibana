/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { KbnClient } from '@kbn/scout';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_RULES_BULK_ACTION = '/api/detection_engine/rules/_bulk_action';
const DETECTION_ENGINE_RULES_URL_FIND = '/api/detection_engine/rules/_find';

export interface CreateRuleResponse {
  id: string;
  rule_id: string;
}

/**
 * Create a detection rule via kbnClient (full RuleCreateProps support).
 * Returns the created rule id and rule_id.
 */
export async function createRuleFromParams(
  kbnClient: KbnClient,
  rule: RuleCreateProps
): Promise<CreateRuleResponse> {
  const response = await kbnClient.request<CreateRuleResponse>({
    method: 'POST',
    path: DETECTION_ENGINE_RULES_URL,
    body: rule,
    retries: 0,
  });
  return response as CreateRuleResponse;
}

/**
 * Delete all detection rules via bulk action.
 */
export async function deleteAllRules(kbnClient: KbnClient): Promise<void> {
  try {
    await kbnClient.request({
      method: 'POST',
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      body: { query: '', action: 'delete' },
    });
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Reset rules table UI state (session storage) before navigation.
 */
export async function resetRulesTableState(page: {
  evaluate: (fn: () => void) => Promise<void>;
}): Promise<void> {
  await page.evaluate(() => {
    window.sessionStorage.clear();
  });
}
