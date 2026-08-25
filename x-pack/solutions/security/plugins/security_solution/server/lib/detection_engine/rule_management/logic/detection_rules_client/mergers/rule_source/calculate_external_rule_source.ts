/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExternalRuleSource,
  RuleResponse,
} from '../../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../../../prebuilt_rules';
import { calculateRuleFieldsDiff } from '../../../../../prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../converters/convert_prebuilt_rule_asset_to_rule_response';

interface CalculateExternalRuleSourceArgs {
  baseRule: PrebuiltRuleAsset | undefined;
  nextRule: RuleResponse;
  // Current rule can be undefined in case of importing a prebuilt rule that is not installed
  currentRule: RuleResponse | undefined;
}

export function calculateExternalRuleSource({
  baseRule,
  nextRule,
  currentRule,
}: CalculateExternalRuleSourceArgs): ExternalRuleSource {
  if (baseRule) {
    // Base version is available, so we can determine the customization status
    // by comparing the base version with the next version
    const customizedFields = getCustomizedFields(
      convertPrebuiltRuleAssetToRuleResponse(baseRule),
      nextRule
    );
    return {
      type: 'external',
      is_customized: customizedFields.length > 0,
      customized_fields: customizedFields,
      has_base_version: true,
    };
  }
  // Base version is not available, apply a heuristic to determine the
  // customization status

  if (currentRule == null) {
    // Current rule is not installed and base rule is not available, so we can't
    // determine if the rule is customized. Defaulting to false.
    return {
      type: 'external',
      is_customized: false,
      customized_fields: [],
      has_base_version: false,
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
      type: 'external',
      is_customized: true,
      customized_fields: [],
      has_base_version: false,
    };
  }

  // If the rule has not been customized before, its customization status can be
  // determined by comparing the current version with the next version. But as a
  // base version cannot be found, we don't list the customized fields in the object
  // as we cannot guarantee the correctness of these fields if the rule was
  // customized again.
  const customizedFields = getCustomizedFields(currentRule, nextRule);
  return {
    type: 'external',
    is_customized: customizedFields.length > 0,
    customized_fields: [],
    has_base_version: false,
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
