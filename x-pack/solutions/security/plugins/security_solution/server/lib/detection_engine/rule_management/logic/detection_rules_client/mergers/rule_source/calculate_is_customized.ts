/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExternalRuleCustomizedFields,
  IsExternalRuleCustomized,
  RuleResponse,
} from '../../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../../../prebuilt_rules';
import { calculateRuleFieldsDiff } from '../../../../../prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../converters/convert_prebuilt_rule_asset_to_rule_response';

interface CalculateIsCustomizedArgs {
  baseRule: PrebuiltRuleAsset | undefined;
  nextRule: RuleResponse;
  // Current rule can be undefined in case of importing a prebuilt rule that is not installed
  currentRule: RuleResponse | undefined;
}

interface CalculateIsCustomizedReturn {
  isCustomized: IsExternalRuleCustomized;
  customizedFields: ExternalRuleCustomizedFields;
}

export function calculateIsCustomized({
  baseRule,
  nextRule,
  currentRule,
}: CalculateIsCustomizedArgs): CalculateIsCustomizedReturn {
  if (baseRule) {
    // Base version is available, so we can determine the customization status
    // by comparing the base version with the next version
    const customizedFields = getCustomizedFields(
      convertPrebuiltRuleAssetToRuleResponse(baseRule),
      nextRule
    );
    return {
      isCustomized: customizedFields.length > 0,
      customizedFields,
    };
  }
  // Base version is not available, apply a heuristic to determine the
  // customization status

  if (currentRule == null) {
    // Current rule is not installed and base rule is not available, so we can't
    // determine if the rule is customized. Defaulting to false.
    return {
      isCustomized: false,
      customizedFields: [],
    };
  }

  if (
    currentRule.rule_source.type === 'external' &&
    currentRule.rule_source.is_customized === true
  ) {
    // If the rule was previously customized, there's no way to determine
    // whether the customization remained or was reverted. Keeping it as
    // customized in this case.
    return {
      isCustomized: true,
      customizedFields: [],
    };
  }

  // If the rule has not been customized before, its customization status can be
  // determined by comparing the current version with the next version.
  const customizedFields = getCustomizedFields(currentRule, nextRule);
  return {
    isCustomized: customizedFields.length > 0,
    customizedFields: [], // Don't have base version so these fields are not necessarily the same fields that would be calculated from base_version
  };
}

/**
 * A helper function to retrieve all customized fields between 2 rule versions
 *
 * @param ruleA
 * @param ruleB
 * @returns `ExternalRuleCustomizedFields` type with all fields that are different between the two given rules
 */
function getCustomizedFields(ruleA: RuleResponse, ruleB: RuleResponse) {
  const fieldsDiff = calculateRuleFieldsDiff({ ruleA, ruleB });
  return Object.entries(fieldsDiff)
    .filter(([, diff]) => !diff.is_equal)
    .map(([key]) => ({
      field_name: key,
    }));
}
