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
import {
  PrebuiltRulesCustomizationDisabledReason,
  type PrebuiltRulesCustomizationStatus,
} from '../../../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';

interface CalculateIsCustomizedArgs {
  baseRule: PrebuiltRuleAsset | undefined;
  nextRule: RuleResponse;
  ruleCustomizationStatus: PrebuiltRulesCustomizationStatus;
}

export function calculateIsCustomized({
  baseRule,
  nextRule,
  ruleCustomizationStatus,
}: CalculateIsCustomizedArgs) {
  if (
    ruleCustomizationStatus.customizationDisabledReason ===
    PrebuiltRulesCustomizationDisabledReason.FeatureFlag
  ) {
    // We don't want to accidentally mark rules as customized when customization is disabled.
    return false;
  }

  if (baseRule == null) {
    // If the base version is missing, we consider the rule to be customized
    return true;
  }

  const baseRuleWithDefaults = convertPrebuiltRuleAssetToRuleResponse(baseRule);

  const fieldsDiff = calculateRuleFieldsDiff({
    base_version: MissingVersion,
    current_version: convertRuleToDiffable(baseRuleWithDefaults),
    target_version: convertRuleToDiffable(nextRule),
  });

  return Object.values(fieldsDiff).some((diff) => diff.has_update);
}
