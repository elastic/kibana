/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { pickBy } from 'lodash';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type {
  ReviewRuleUpgradeResponseBody,
  RuleUpgradeInfoForReview,
  RuleUpgradeStatsForReview,
  ThreeWayDiff,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { ThreeWayDiffOutcome } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { invariant } from '../../../../../../common/utils/invariant';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import type { CalculateRuleDiffResult } from '../../logic/diff/calculate_rule_diff';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../logic/rule_versions/fetch_rule_versions_triad';
import { getRuleGroups } from '../../model/rule_groups/get_rule_groups';

export const reviewRuleUpgradeHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['core', 'alerting']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

    const ruleVersionsMap = await fetchRuleVersionsTriad({
      ruleAssetsClient,
      ruleObjectsClient,
    });
    const { upgradeableRules } = getRuleGroups(ruleVersionsMap);

    const ruleDiffCalculationResults = upgradeableRules.map(({ current }) => {
      const ruleVersions = ruleVersionsMap.get(current.rule_id);
      invariant(ruleVersions != null, 'ruleVersions not found');
      return calculateRuleDiff(ruleVersions);
    });

    const body: ReviewRuleUpgradeResponseBody = {
      stats: calculateRuleStats(ruleDiffCalculationResults),
      rules: calculateRuleInfos(ruleDiffCalculationResults),
    };

    return response.ok({ body });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
const calculateRuleStats = (results: CalculateRuleDiffResult[]): RuleUpgradeStatsForReview => {
  const allTags = new Set<string>();

  const stats = results.reduce(
    (acc, result) => {
      acc.num_rules_to_upgrade_total += 1;

      if (result.ruleDiff.num_fields_with_conflicts > 0) {
        acc.num_rules_with_conflicts += 1;
      }

      if (result.ruleDiff.num_fields_with_non_solvable_conflicts > 0) {
        acc.num_rules_with_non_solvable_conflicts += 1;
      }

      result.ruleVersions.input.current?.tags.forEach((tag) => allTags.add(tag));

      return acc;
    },
    {
      num_rules_to_upgrade_total: 0,
      num_rules_with_conflicts: 0,
      num_rules_with_non_solvable_conflicts: 0,
    }
  );

  return {
    ...stats,
    tags: Array.from(allTags),
  };
};
const calculateRuleInfos = (results: CalculateRuleDiffResult[]): RuleUpgradeInfoForReview[] => {
  return results.map((result) => {
    const { ruleDiff, ruleVersions } = result;
    const installedCurrentVersion = ruleVersions.input.current;
    const targetVersion = ruleVersions.input.target;
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
      current_rule: installedCurrentVersion,
      target_rule: targetRule,
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
