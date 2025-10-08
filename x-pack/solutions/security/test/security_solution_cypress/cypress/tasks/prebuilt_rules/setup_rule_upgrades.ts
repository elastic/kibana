/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleResponse,
  RuleSignatureId,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { patchRule } from '../api_calls/rules';
import type { SAMPLE_PREBUILT_RULE } from '../api_calls/prebuilt_rules';
import {
  installPrebuiltRuleAssets,
  installSpecificPrebuiltRulesRequest,
} from '../api_calls/prebuilt_rules';
import { deletePrebuiltRulesAssets } from '../api_calls/common';

interface SetUpRulesParams {
  currentRuleAssets: Array<typeof SAMPLE_PREBUILT_RULE>;
  newRuleAssets: Array<typeof SAMPLE_PREBUILT_RULE>;
  rulePatches: Array<{ rule_id: RuleSignatureId } & Partial<RuleResponse>>;
  cleanUpCurrentRuleAssets?: boolean;
}

export function setUpRuleUpgrades({
  currentRuleAssets,
  newRuleAssets,
  rulePatches,
  cleanUpCurrentRuleAssets,
}: SetUpRulesParams): void {
  installPrebuiltRuleAssets(currentRuleAssets);
  installSpecificPrebuiltRulesRequest(currentRuleAssets);

  for (const rule of rulePatches) {
    const { rule_id: ruleId, ...update } = rule;
    patchRule(ruleId, update);
  }

  if (cleanUpCurrentRuleAssets) {
    deletePrebuiltRulesAssets();
  }

  /* Create a second version of the prebuilt rules, making them available for an upgrade */
  installPrebuiltRuleAssets(newRuleAssets);
}
