/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pickBy } from 'lodash';
import { isRuleCustomized } from '../../../../../common/detection_engine/rule_management/utils';
import { withSecuritySpanSync } from '../../../../utils/with_security_span';
import type { PromisePoolError } from '../../../../utils/promise_pool';
import {
  type PickVersionValues,
  type AllThreeWayFieldsDiff,
  MissingVersion,
} from '../../../../../common/api/detection_engine';
import type {
  UpgradeConflictResolutionStrategy,
  RuleUpgradeSpecifier,
} from '../../../../../common/api/detection_engine/prebuilt_rules';
import { UpgradeConflictResolutionStrategyEnum } from '../../../../../common/api/detection_engine/prebuilt_rules';
import { convertRuleToDiffable } from '../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';
import type { PrebuiltRuleAsset } from '../model/rule_assets/prebuilt_rule_asset';
import { assertPickVersionIsTarget } from '../api/perform_rule_upgrade/assert_pick_version_is_target';
import { FIELD_NAMES_BY_RULE_TYPE_MAP } from '../api/perform_rule_upgrade/create_props_to_rule_type_map';
import { calculateThreeWayRuleFieldsDiff } from './diff/calculation/calculate_three_way_rule_fields_diff';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import type { RuleTriad } from '../model/rule_groups/get_rule_groups';
import { getValueForField } from '../api/perform_rule_upgrade/get_value_for_field';
import type { RuleUpgradeContext } from '../api/perform_rule_upgrade/update_rule_telemetry';

export interface CreateModifiedPrebuiltRuleAssetsArgs {
  upgradeableRules: RuleTriad[];
  globalPickVersion: PickVersionValues;
  conflictResolutionStrategy?: UpgradeConflictResolutionStrategy;
  upgradeSpecifiers?: Map<string, RuleUpgradeSpecifier>;
}

interface ProcessedRules {
  modifiedPrebuiltRuleAssets: PrebuiltRuleAsset[];
  processingErrors: Array<PromisePoolError<{ rule_id: string }>>;
  ruleUpgradeContexts: RuleUpgradeContext[];
}

export const createModifiedPrebuiltRuleAssets = ({
  upgradeableRules,
  globalPickVersion,
  conflictResolutionStrategy,
  upgradeSpecifiers,
}: CreateModifiedPrebuiltRuleAssetsArgs) => {
  return withSecuritySpanSync(createModifiedPrebuiltRuleAssets.name, () => {
    const { modifiedPrebuiltRuleAssets, processingErrors, ruleUpgradeContexts } =
      upgradeableRules.reduce<ProcessedRules>(
        (processedRules, upgradeableRule) => {
          const targetRuleType = upgradeableRule.target.type;
          const ruleId = upgradeableRule.target.rule_id;
          const fieldNames = FIELD_NAMES_BY_RULE_TYPE_MAP.get(targetRuleType);

          try {
            if (fieldNames === undefined) {
              throw new Error(`Unexpected rule type: ${targetRuleType}`);
            }

            const { current, target } = upgradeableRule;
            if (current.type !== target.type) {
              assertPickVersionIsTarget({
                ruleId,
                globalPickVersion,
                ruleUpgradeSpecifier: upgradeSpecifiers?.get(ruleId),
              });
            }

            const isCustomized = isRuleCustomized(current);

            const calculatedRuleDiff = calculateThreeWayRuleFieldsDiff(
              {
                base_version: upgradeableRule.base
                  ? convertRuleToDiffable(
                      convertPrebuiltRuleAssetToRuleResponse(upgradeableRule.base)
                    )
                  : MissingVersion,
                current_version: convertRuleToDiffable(upgradeableRule.current),
                target_version: convertRuleToDiffable(
                  convertPrebuiltRuleAssetToRuleResponse(upgradeableRule.target)
                ),
              },
              isCustomized
            ) as AllThreeWayFieldsDiff;

            // For ALL_RULES mode with MERGED pick version, check for unresolvable conflicts
            if (upgradeSpecifiers === undefined && globalPickVersion === 'MERGED') {
              const fieldsWithConflicts = Object.keys(
                getFieldsDiffConflicts(calculatedRuleDiff, conflictResolutionStrategy)
              );
              if (fieldsWithConflicts.length > 0) {
                throw new Error(
                  `Merge conflicts found in rule '${ruleId}' for fields: ${fieldsWithConflicts.join(
                    ', '
                  )}. Please resolve the conflict manually or choose another value for 'pick_version'`
                );
              }
            }

            const modifiedPrebuiltRuleAsset = createModifiedPrebuiltRuleAsset({
              upgradeableRule,
              fieldNames,
              globalPickVersion,
              upgradeSpecifier: upgradeSpecifiers?.get(ruleId),
              conflictResolutionStrategy,
              calculatedRuleDiff,
            });

            processedRules.modifiedPrebuiltRuleAssets.push(modifiedPrebuiltRuleAsset);

            processedRules.ruleUpgradeContexts.push({
              ruleId,
              ruleName: upgradeableRule.target.name,
              hasBaseVersion: !!upgradeableRule.base,
              isCustomized,
              fieldsDiff: calculatedRuleDiff,
            });

            return processedRules;
          } catch (err) {
            processedRules.processingErrors.push({
              error: err,
              item: { rule_id: ruleId },
            });
            return processedRules;
          }
        },
        {
          modifiedPrebuiltRuleAssets: [],
          processingErrors: [],
          ruleUpgradeContexts: [],
        }
      );

    return {
      modifiedPrebuiltRuleAssets,
      processingErrors,
      ruleUpgradeContexts,
    };
  });
};

interface CreateModifiedPrebuiltRuleAssetParams {
  upgradeableRule: RuleTriad;
  fieldNames: Array<keyof PrebuiltRuleAsset>;
  globalPickVersion: PickVersionValues;
  upgradeSpecifier?: RuleUpgradeSpecifier;
  conflictResolutionStrategy?: UpgradeConflictResolutionStrategy;
  calculatedRuleDiff: AllThreeWayFieldsDiff;
}

function createModifiedPrebuiltRuleAsset({
  upgradeableRule,
  fieldNames,
  globalPickVersion,
  upgradeSpecifier,
  conflictResolutionStrategy,
  calculatedRuleDiff,
}: CreateModifiedPrebuiltRuleAssetParams): PrebuiltRuleAsset {
  const modifiedPrebuiltRuleAsset = {} as Record<string, unknown>;

  for (const fieldName of fieldNames) {
    modifiedPrebuiltRuleAsset[fieldName] = getValueForField({
      fieldName,
      upgradeableRule,
      globalPickVersion,
      upgradeSpecifier,
      conflictResolutionStrategy,
      ruleFieldsDiff: calculatedRuleDiff,
    });
  }

  return modifiedPrebuiltRuleAsset as PrebuiltRuleAsset;
}

const getFieldsDiffConflicts = (
  ruleFieldsDiff: Partial<AllThreeWayFieldsDiff>,
  conflictResolutionStrategy?: UpgradeConflictResolutionStrategy
) =>
  pickBy(ruleFieldsDiff, (diff) =>
    conflictResolutionStrategy === UpgradeConflictResolutionStrategyEnum.UPGRADE_SOLVABLE
      ? diff.conflict !== 'NONE' && diff.conflict !== 'SOLVABLE'
      : diff.conflict !== 'NONE'
  );
