/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { assertDiffableFieldsMatchRuleType } from './assert_diffable_fields_match_rule_type';
import {
  type UpgradeSpecificRulesRequest,
  type RuleFieldsToUpgrade,
  type DiffableRuleTypes,
  type FieldUpgradeSpecifier,
  type PickVersionValues,
} from '../../../../../../common/api/detection_engine';
import { type PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { mapRuleFieldToDiffableRuleField } from './diffable_rule_fields_mappings';

interface CreateFieldUpgradeSpecifierArgs {
  fieldName: keyof PrebuiltRuleAsset;
  ruleUpgradeSpecifier: UpgradeSpecificRulesRequest['rules'][number];
  targetRuleType: DiffableRuleTypes;
  globalPickVersion: PickVersionValues;
}

/**
 * Creates a field upgrade specifier for a given field in PrebuiltRuleAsset.
 *
 * This function determines how a specific field should be upgraded based on the
 * upgrade request body and the pick_version at global, rule and field-levels,
 * when the mode is SPECIFIC_RULES.
 */
export const createFieldUpgradeSpecifier = ({
  fieldName,
  ruleUpgradeSpecifier,
  targetRuleType,
  globalPickVersion,
}: CreateFieldUpgradeSpecifierArgs): FieldUpgradeSpecifier<unknown> => {
  if (!ruleUpgradeSpecifier.fields || Object.keys(ruleUpgradeSpecifier.fields).length === 0) {
    return {
      pick_version: ruleUpgradeSpecifier.pick_version ?? globalPickVersion,
    };
  }

  assertDiffableFieldsMatchRuleType(Object.keys(ruleUpgradeSpecifier.fields), targetRuleType);

  const fieldsToUpgradePayload = ruleUpgradeSpecifier.fields as Record<
    string,
    RuleFieldsToUpgrade[keyof RuleFieldsToUpgrade]
  >;

  const fieldGroup = mapRuleFieldToDiffableRuleField({
    ruleType: targetRuleType,
    fieldName,
  });

  const fieldUpgradeSpecifier = fieldsToUpgradePayload[fieldGroup];

  if (fieldUpgradeSpecifier?.pick_version === 'RESOLVED') {
    return {
      pick_version: 'RESOLVED',
      resolved_value: fieldUpgradeSpecifier.resolved_value,
    };
  }

  return {
    pick_version:
      // If there's no matching specific field upgrade specifier in the payload,
      // we fallback to a rule level pick_version. Since this is also optional,
      // we default to the global pick_version.
      fieldUpgradeSpecifier?.pick_version ?? ruleUpgradeSpecifier.pick_version ?? globalPickVersion,
  };
};
