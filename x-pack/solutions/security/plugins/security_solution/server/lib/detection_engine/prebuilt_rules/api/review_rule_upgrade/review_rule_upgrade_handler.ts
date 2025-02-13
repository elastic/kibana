/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type {
  PrebuiltRuleFilter,
  ReviewRuleUpgradeRequestBody,
  ReviewRuleUpgradeResponseBody,
  ReviewRuleUpgradeSort,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import type { IPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import type { RuleVersionSpecifier } from '../../logic/rule_versions/rule_version_specifier';
import { zipRuleVersions } from '../../logic/rule_versions/zip_rule_versions';
import { calculateRuleUpgradeInfo } from './calculate_rule_upgrade_info';
import type { IPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';

const DEFAULT_SORT: ReviewRuleUpgradeSort = {
  field: 'name',
  order: 'asc',
};

export const reviewRuleUpgradeHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<undefined, undefined, ReviewRuleUpgradeRequestBody>,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);
  const { page = 1, per_page: perPage = 10_000, sort = DEFAULT_SORT, filter } = request.body ?? {};

  try {
    const ctx = await context.resolve(['core', 'alerting']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

    const { diffResults, totalUpgradeableRules } = await calculateUpgradeableRulesDiff({
      ruleAssetsClient,
      ruleObjectsClient,
      page,
      perPage,
      sort,
      filter,
    });

    const body: ReviewRuleUpgradeResponseBody = {
      stats: {
        num_rules_to_upgrade_total: 0,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
        tags: [],
      },
      rules: calculateRuleUpgradeInfo(diffResults),
      page,
      per_page: perPage,
      total: totalUpgradeableRules,
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

interface CalculateUpgradeableRulesDiffArgs {
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
  page: number;
  perPage: number;
  sort: ReviewRuleUpgradeSort;
  filter: PrebuiltRuleFilter | undefined;
}

const BATCH_SIZE = 100;

async function calculateUpgradeableRulesDiff({
  ruleAssetsClient,
  ruleObjectsClient,
  page,
  perPage,
  sort,
  filter,
}: CalculateUpgradeableRulesDiffArgs) {
  const allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
  const latestVersionsMap = new Map(allLatestVersions.map((version) => [version.rule_id, version]));

  const upgradeableRules: Array<{ rule: RuleResponse; targetVersion: RuleVersionSpecifier }> = [];
  let foundUpgradeableRules = 0;

  // Fetch all installed rules that have a newer version available in batches to
  // avoid loading all rules at once into memory. We need to iterate over all
  // rules, even if the perPage limit is reached, to calculate the total number
  // of upgradeable rules and all tags.
  let batchPage = 1;
  while (true) {
    const currentRulesBatch = await ruleObjectsClient.fetchInstalledRules({
      filter,
      perPage: BATCH_SIZE,
      page: batchPage,
      sortField: sort.field,
      sortOrder: sort.order,
    });

    if (currentRulesBatch.length === 0) {
      break;
    }
    currentRulesBatch.forEach((rule) => {
      const targetVersion = latestVersionsMap.get(rule.rule_id);
      if (targetVersion != null && rule.version < targetVersion.version) {
        // Push the rule to the list of upgradeable rules if it falls within the current page
        if (foundUpgradeableRules >= (page - 1) * perPage && upgradeableRules.length < perPage) {
          upgradeableRules.push({ rule, targetVersion });
        }
        foundUpgradeableRules += 1;
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
  // Iterate through the current rules array to keep the order of the results
  const diffResults = currentRules.map((current) => {
    const base = ruleVersionsMap.get(current.rule_id)?.base;
    const target = ruleVersionsMap.get(current.rule_id)?.target;
    return calculateRuleDiff({ current, base, target });
  });

  return {
    diffResults,
    totalUpgradeableRules: foundUpgradeableRules,
  };
}
