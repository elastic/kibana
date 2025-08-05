/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ReviewPrebuiltRuleUpgradeFilter } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/review_prebuilt_rules_upgrade_filter';
import type {
  ReviewRuleUpgradeRequestBody,
  ReviewRuleUpgradeResponseBody,
  ReviewRuleUpgradeSort,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import type { IPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import type { IPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { type RuleVersionSpecifier } from '../../logic/rule_versions/rule_version_specifier';
import { zipRuleVersions } from '../../logic/rule_versions/zip_rule_versions';
import { calculateRuleUpgradeInfo } from './calculate_rule_upgrade_info';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { getPossibleUpgrades } from '../../logic/utils';

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
  const { page = 1, per_page: perPage = 20, sort = DEFAULT_SORT, filter } = request.body ?? {};

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const mlAuthz = ctx.securitySolution.getMlAuthz();

    const { diffResults, totalUpgradeableRules } = await calculateUpgradeableRulesDiff({
      ruleAssetsClient,
      ruleObjectsClient,
      mlAuthz,
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
  mlAuthz: MlAuthz;
  page: number;
  perPage: number;
  sort: ReviewRuleUpgradeSort;
  filter: ReviewPrebuiltRuleUpgradeFilter | undefined;
}

async function calculateUpgradeableRulesDiff({
  ruleAssetsClient,
  ruleObjectsClient,
  mlAuthz,
  page,
  perPage,
  sort,
  filter,
}: CalculateUpgradeableRulesDiffArgs) {
  const allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
  const latestVersionsMap = new Map(allLatestVersions.map((version) => [version.rule_id, version]));

  const currentRuleVersions = filter?.rule_ids
    ? await ruleObjectsClient.fetchInstalledRuleVersionsByIds({
        ruleIds: filter.rule_ids,
        sortField: sort.field,
        sortOrder: sort.order,
      })
    : await ruleObjectsClient.fetchInstalledRuleVersions({
        filter,
        sortField: sort.field,
        sortOrder: sort.order,
      });

  const upgradeableRules = await getPossibleUpgrades(
    currentRuleVersions,
    latestVersionsMap,
    mlAuthz
  );

  const totalUpgradeableRules = upgradeableRules.length;

  const pagedRuleIds = upgradeableRules
    .slice((page - 1) * perPage, page * perPage)
    .map((rule) => rule.rule_id);

  const currentRules = await ruleObjectsClient.fetchInstalledRulesByIds({
    ruleIds: pagedRuleIds,
    sortField: sort.field,
    sortOrder: sort.order,
  });
  const latestRules = await ruleAssetsClient.fetchAssetsByVersion(
    currentRules.map(({ rule_id: ruleId }) => latestVersionsMap.get(ruleId) as RuleVersionSpecifier)
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
    totalUpgradeableRules,
  };
}
