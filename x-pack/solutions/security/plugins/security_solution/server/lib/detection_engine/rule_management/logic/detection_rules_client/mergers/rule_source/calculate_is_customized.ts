/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../../../common/api/detection_engine';
import { MissingVersion } from '../../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../../../prebuilt_rules';
import { calculateRuleFieldsDiff } from '../../../../../prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
import { convertRuleToDiffable } from '../../../../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../converters/convert_prebuilt_rule_asset_to_rule_response';

interface CalculateIsCustomizedArgs {
  baseRule: PrebuiltRuleAsset | undefined;
  nextRule: RuleResponse;
  // Current rule can be undefined in case of importing a prebuilt rule that is not installed
  currentRule: RuleResponse | undefined;
}

export function calculateIsCustomized({
  baseRule,
  nextRule,
  currentRule,
}: CalculateIsCustomizedArgs) {
  if (baseRule) {
    // Base version is available, so we can determine the customization status
    // by comparing the base version with the next version
    return areRulesEqual(convertPrebuiltRuleAssetToRuleResponse(baseRule), nextRule) === false;
  }
  // Base version is not available, apply a heuristic to determine the
  // customization status

  if (currentRule == null) {
    // Current rule is not installed and base rule is not available, so we can't
    // determine if the rule is customized. Defaulting to false.
    return false;
  }

  if (
    currentRule.rule_source.type === 'external' &&
    currentRule.rule_source.is_customized === true
  ) {
    // If the rule was previously customized, there's no way to determine
    // whether the customization remained or was reverted. Keeping it as
    // customized in this case.
    return true;
  }

  // If the rule has not been customized before, its customization status can be
  // determined by comparing the current version with the next version.
  return areRulesEqual(currentRule, nextRule) === false;
}

/**
 * A helper function to determine if two rules are equal
 *
 * @param ruleA
 * @param ruleB
 * @returns true if all rule fields are equal, false otherwise
 */
function areRulesEqual(ruleA: RuleResponse, ruleB: RuleResponse) {
  const fieldsDiff = calculateRuleFieldsDiff({
    base_version: MissingVersion,
    current_version: convertRuleToDiffable(ruleA),
    target_version: convertRuleToDiffable(ruleB),
  });

  return Object.values(fieldsDiff).every((diff) => diff.has_update === false);
}
