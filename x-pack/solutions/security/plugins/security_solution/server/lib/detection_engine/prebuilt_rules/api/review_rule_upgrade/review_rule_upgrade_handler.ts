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
  ReviewRuleUpgradeRequestBody,
  ReviewRuleUpgradeResponseBody,
  RuleUpgradeInfoForReview,
  ThreeWayDiff,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { ThreeWayDiffOutcome } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { invariant } from '../../../../../../common/utils/invariant';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import type { CalculateRuleDiffResult } from '../../logic/diff/calculate_rule_diff';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import type { IPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import type { IPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import type { RuleVersionSpecifier } from '../../logic/rule_versions/rule_version_specifier';
import { zipRuleVersions } from '../../logic/rule_versions/zip_rule_versions';

export const reviewRuleUpgradeHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<undefined, undefined, ReviewRuleUpgradeRequestBody>,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);
  const { page = 1, per_page: perPage = 10_000 } = request.body ?? {};

  try {
    const ctx = await context.resolve(['core', 'alerting']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

    const { diffResults, tags, totalUpgradeableRules } = await calculateUpgradeableRulesDiff({
      ruleAssetsClient,
      ruleObjectsClient,
      page,
      perPage,
    });

    const body: ReviewRuleUpgradeResponseBody = {
      stats: {
        num_rules_to_upgrade_total: totalUpgradeableRules,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
        tags,
      },
      rules: calculateRuleInfos(diffResults),
      page,
      per_page: perPage,
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
      version: installedCurrentVersion.version,
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

interface CalculateUpgradeableRulesDiffArgs {
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
  page: number;
  perPage: number;
}

const BATCH_SIZE = 100;

async function calculateUpgradeableRulesDiff({
  ruleAssetsClient,
  ruleObjectsClient,
  page,
  perPage,
}: CalculateUpgradeableRulesDiffArgs) {
  const allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
  const latestVersionsMap = new Map(allLatestVersions.map((version) => [version.rule_id, version]));

  const upgradeableRules: Array<{ rule: RuleResponse; targetVersion: RuleVersionSpecifier }> = [];
  const allTags = new Set<string>();
  let totalUpgradeableRules = 0;

  // Fetch all installed rules that have a newer version available in batches to
  // avoid loading all rules at once into memory. We need to iterate over all
  // rules, even if the perPage limit is reached, to calculate the total number
  // of upgradeable rules and all tags.
  // TODO: Get rid of stats in this call and don't iterate over all rules. That should cover tha case when rule_ids are passed in the request.
  let batchPage = 1;
  while (true) {
    const currentRulesBatch = await ruleObjectsClient.fetchAllInstalledRules({
      page: batchPage,
      perPage: BATCH_SIZE,
    });
    if (currentRulesBatch.length === 0) {
      break;
    }
    currentRulesBatch.forEach((rule) => {
      const targetVersion = latestVersionsMap.get(rule.rule_id);
      if (targetVersion != null && rule.version < targetVersion.version) {
        if (upgradeableRules.length < perPage) {
          upgradeableRules.push({ rule, targetVersion });
        }
        rule.tags.forEach((tag) => allTags.add(tag));
        totalUpgradeableRules += 1;
      }
    });
    batchPage += 1;
  }

  // Zip current rules with their base and target versions
  const currentRules = upgradeableRules.map(({ rule }) => rule);
  const latestRules = await ruleAssetsClient.fetchAssetsByVersion(
    upgradeableRules.map(({ targetVersion }) => targetVersion)
  );
  const baseRules = await ruleAssetsClient.fetchAssetsByVersion(currentRules);
  const ruleVersionsMap = zipRuleVersions(currentRules, baseRules, latestRules);

  // Calculate the diff between current, base, and target versions
  const ruleDiffCalculationResults = [...ruleVersionsMap.values()].map((ruleVersions) =>
    calculateRuleDiff(ruleVersions)
  );

  return {
    diffResults: ruleDiffCalculationResults,
    tags: Array.from(allTags),
    totalUpgradeableRules,
  };
}
