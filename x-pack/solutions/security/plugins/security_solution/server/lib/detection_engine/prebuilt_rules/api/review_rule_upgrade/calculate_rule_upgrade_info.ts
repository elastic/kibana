/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy } from 'lodash';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type {
  RuleUpgradeInfoForReview,
  ThreeWayDiff,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { ThreeWayDiffOutcome } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { invariant } from '../../../../../../common/utils/invariant';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import type { CalculateRuleDiffResult } from '../../logic/diff/calculate_rule_diff';

export const calculateRuleUpgradeInfo = (
  results: CalculateRuleDiffResult[]
): RuleUpgradeInfoForReview[] => {
  return results.map((result) => {
    const { ruleDiff, ruleVersions } = result;
    const installedCurrentVersion = ruleVersions.input.current;
    const targetVersion = ruleVersions.input.target;
    const baseVersion = ruleVersions.input.base;
    invariant(installedCurrentVersion != null, 'installedCurrentVersion not found');
    invariant(targetVersion != null, 'targetVersion not found');

    const targetRule: RuleResponse = {
      ...convertPrebuiltRuleAssetToRuleResponse(targetVersion),
      id: installedCurrentVersion.id,
      revision: installedCurrentVersion.revision + 1,
      created_at: installedCurrentVersion.created_at,
      created_by: installedCurrentVersion.created_by,
      updated_at: new Date().toISOString(),
      updated_by: installedCurrentVersion.updated_by,
    };

    return {
      id: installedCurrentVersion.id,
      rule_id: installedCurrentVersion.rule_id,
      revision: installedCurrentVersion.revision,
      version: installedCurrentVersion.version,
      current_rule: installedCurrentVersion,
      target_rule: targetRule,
      has_base_version: baseVersion !== undefined,
      diff: {
        fields: pickBy<ThreeWayDiff<unknown>>(
          ruleDiff.fields,
          (fieldDiff) =>
            fieldDiff.diff_outcome !== ThreeWayDiffOutcome.StockValueNoUpdate &&
            fieldDiff.diff_outcome !== ThreeWayDiffOutcome.MissingBaseNoUpdate
        ),
        num_fields_with_updates: ruleDiff.num_fields_with_updates,
        num_fields_with_conflicts: ruleDiff.num_fields_with_conflicts,
        num_fields_with_non_solvable_conflicts: ruleDiff.num_fields_with_non_solvable_conflicts,
      },
    };
  });
};
