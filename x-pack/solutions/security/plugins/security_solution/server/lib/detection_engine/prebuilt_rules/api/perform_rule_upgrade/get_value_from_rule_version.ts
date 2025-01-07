/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleFieldsToUpgrade,
  AllFieldsDiff,
} from '../../../../../../common/api/detection_engine';
import { RULE_DEFAULTS } from '../../../rule_management/logic/detection_rules_client/mergers/apply_rule_defaults';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';
import {
  mapRuleFieldToDiffableRuleField,
  mapDiffableRuleFieldValueToRuleSchemaFormat,
} from './diffable_rule_fields_mappings';

const RULE_DEFAULTS_FIELDS_SET = new Set(Object.keys(RULE_DEFAULTS));

export const getValueFromMergedVersion = ({
  fieldName,
  upgradeableRule,
  fieldUpgradeSpecifier,
  ruleFieldsDiff,
}: {
  fieldName: keyof PrebuiltRuleAsset;
  upgradeableRule: RuleTriad;
  fieldUpgradeSpecifier: NonNullable<RuleFieldsToUpgrade[keyof RuleFieldsToUpgrade]>;
  ruleFieldsDiff: AllFieldsDiff;
}) => {
  const ruleId = upgradeableRule.target.rule_id;
  const diffableRuleFieldName = mapRuleFieldToDiffableRuleField({
    ruleType: upgradeableRule.target.type,
    fieldName,
  });

  if (fieldUpgradeSpecifier.pick_version === 'MERGED') {
    const ruleFieldDiff = ruleFieldsDiff[diffableRuleFieldName];

    if (ruleFieldDiff && ruleFieldDiff.conflict !== 'NONE') {
      throw new Error(
        `Automatic merge calculation for field '${diffableRuleFieldName}' in rule of rule_id ${ruleId} resulted in a conflict. Please resolve the conflict manually or choose another value for 'pick_version'.`
      );
    }

    const mergedVersion = ruleFieldDiff.merged_version;

    return mapDiffableRuleFieldValueToRuleSchemaFormat(fieldName, mergedVersion);
  }
};

export const getValueFromRuleTriad = ({
  fieldName,
  upgradeableRule,
  fieldUpgradeSpecifier,
}: {
  fieldName: keyof PrebuiltRuleAsset;
  upgradeableRule: RuleTriad;
  fieldUpgradeSpecifier: NonNullable<RuleFieldsToUpgrade[keyof RuleFieldsToUpgrade]>;
}) => {
  const ruleId = upgradeableRule.target.rule_id;
  const diffableRuleFieldName = mapRuleFieldToDiffableRuleField({
    ruleType: upgradeableRule.target.type,
    fieldName,
  });

  const pickVersion = fieldUpgradeSpecifier.pick_version.toLowerCase() as keyof RuleTriad;

  // By this point, can be only 'base', 'current' or 'target'
  const ruleVersion = upgradeableRule[pickVersion];

  if (!ruleVersion) {
    // Current and target versions should always be present
    // but base version might not; throw if version is missing.
    throw new Error(
      `Missing '${pickVersion}' version for field '${diffableRuleFieldName}' in rule ${ruleId}`
    );
  }

  // No need for conversions in the field names here since the rule versions in
  // UpgradableRule have the values in the 'non-grouped' PrebuiltRuleAsset schema format.
  const nonResolvedValue = ruleVersion[fieldName];

  // If there's no value for the field in the rule versions, check if the field
  // requires a default value for it. If it does, return the default value.
  if (nonResolvedValue === undefined && RULE_DEFAULTS_FIELDS_SET.has(fieldName)) {
    return RULE_DEFAULTS[fieldName as keyof typeof RULE_DEFAULTS];
  }

  // Otherwise, return the non-resolved value, which might be undefined.
  return nonResolvedValue;
};
