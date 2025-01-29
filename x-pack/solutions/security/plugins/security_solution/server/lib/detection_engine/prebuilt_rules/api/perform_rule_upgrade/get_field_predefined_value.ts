/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIELDS_TO_UPGRADE_TO_CURRENT_VERSION,
  FIELDS_TO_UPGRADE_TO_TARGET_VERSION,
} from '../../../../../../common/api/detection_engine';
import { type PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';

type GetFieldPredefinedValueReturnType =
  | {
      type: 'PREDEFINED_VALUE';
      value: unknown;
    }
  | { type: 'CUSTOMIZABLE_VALUE' };

/**
 * Determines whether a field can be upgraded via API (i.e. whether it should take
 * a predefined value or is customizable), and returns the value if it is predefined.
 *
 * This function checks whether a field can be upgraded via API contract and how it should
 * be handled during the rule upgrade process. It uses the `FIELDS_TO_UPGRADE_TO_TARGET_VERSION` and
 * `FIELDS_TO_UPGRADE_TO_CURRENT_VERSION` constants to make this determination.
 *
 * `FIELDS_TO_UPGRADE_TO_TARGET_VERSION` includes fields that are not upgradeable: 'type', 'rule_id',
 * 'version', 'author', and 'license', and are always upgraded to the target version.
 *
 * `FIELDS_TO_UPGRADE_TO_CURRENT_VERSION` includes fields that should be updated to their
 * current version, such as 'enabled', 'alert_suppression', 'actions', 'throttle',
 * 'response_actions', 'meta', 'output_index', 'namespace', 'alias_purpose',
 * 'alias_target_id', 'outcome', 'concurrent_searches', and 'items_per_search'.
 *
 * @param {keyof PrebuiltRuleAsset} fieldName - The field name to check for upgrade status.
 * @param {RuleTriad} upgradeableRule - The rule object containing current and target versions.
 *
 * @returns {GetFieldPredefinedValueReturnType} An object indicating whether the field
 * is upgradeable and its value to upgrade to if it's not upgradeable via API.
 */
export const getFieldPredefinedValue = (
  fieldName: keyof PrebuiltRuleAsset,
  upgradeableRule: RuleTriad
): GetFieldPredefinedValueReturnType => {
  if (
    FIELDS_TO_UPGRADE_TO_TARGET_VERSION.includes(
      fieldName as (typeof FIELDS_TO_UPGRADE_TO_TARGET_VERSION)[number]
    )
  ) {
    return {
      type: 'PREDEFINED_VALUE',
      value: upgradeableRule.target[fieldName],
    };
  }

  if (
    FIELDS_TO_UPGRADE_TO_CURRENT_VERSION.includes(
      fieldName as (typeof FIELDS_TO_UPGRADE_TO_CURRENT_VERSION)[number]
    )
  ) {
    return {
      type: 'PREDEFINED_VALUE',
      value: upgradeableRule.current[fieldName],
    };
  }

  return {
    type: 'CUSTOMIZABLE_VALUE',
  };
};
