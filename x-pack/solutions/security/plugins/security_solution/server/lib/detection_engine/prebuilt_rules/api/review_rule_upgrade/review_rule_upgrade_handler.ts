/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  ReviewRuleUpgradeRequestBody,
  ReviewRuleUpgradeResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { MAX_RESULTS_WINDOW } from '../../../../../usage/constants';
import { buildSiemResponse } from '../../../routes/utils';
import { findRules } from '../../../rule_management/logic/search/find_rules';
import { internalRuleToAPIResponse } from '../../../rule_management/logic/detection_rules_client/converters/internal_rule_to_api_response';
import { buildGranularRulesKql } from '../../../rule_management/logic/search/build_granular_rules_kql';
import {
  buildAggregations,
  expandRawAggregationResult,
} from '../../../rule_management/logic/search/granular_facet_aggregations';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import type { BasicRuleInfo } from '../../logic/basic_rule_info';
import { zipRuleVersions } from '../../logic/rule_versions/zip_rule_versions';
import { getPossibleUpgrades } from '../../logic/utils';
import { calculateRuleUpgradeInfo } from './calculate_rule_upgrade_info';

export const reviewRuleUpgradeHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, ReviewRuleUpgradeRequestBody>,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);
  const {
    page,
    per_page: perPage,
    filter,
    search,
    aggregations,
    sort_field: sortField,
    sort_order: sortOrder,
    search_after: searchAfterParam,
    rule_ids: restrictToRuleIds,
  } = request.body ?? ({} as ReviewRuleUpgradeRequestBody);

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const rulesClient = await ctx.alerting.getRulesClient();
    const soClient = ctx.core.savedObjects.client;
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const mlAuthz = ctx.securitySolution.getMlAuthz();

    // 1. Determine the set of installed rule SO ids that are eligible for
    //    upgrade. This requires joining installed rule versions with the
    //    latest asset versions and filtering out rules that are not
    //    allowed by the current license.
    const [latestVersions, installedRuleVersions] = await Promise.all([
      ruleAssetsClient.fetchLatestVersions(),
      restrictToRuleIds && restrictToRuleIds.length > 0
        ? ruleObjectsClient.fetchInstalledRuleVersionsByIds({ ruleIds: restrictToRuleIds })
        : ruleObjectsClient.fetchInstalledRuleVersions(),
    ]);

    const latestVersionsMap = new Map(latestVersions.map((v) => [v.rule_id, v]));
    const installedBySignatureId = new Map(installedRuleVersions.map((r) => [r.rule_id, r]));

    const upgradeableTargets = await getPossibleUpgrades(
      installedRuleVersions,
      latestVersionsMap,
      mlAuthz
    );

    const upgradeableSoIds = upgradeableTargets
      .map((target) => installedBySignatureId.get(target.rule_id)?.id)
      .filter((id): id is string => id != null);

    if (upgradeableSoIds.length === 0) {
      const body: ReviewRuleUpgradeResponseBody = {
        stats: {
          num_rules_to_upgrade_total: 0,
          num_rules_with_conflicts: 0,
          num_rules_with_non_solvable_conflicts: 0,
          tags: [],
        },
        rules: [],
        page,
        per_page: perPage,
        total: 0,
      };
      return response.ok({ body });
    }

    // 2. Run a findRules query on the alert SOs restricted to the
    //    upgradeable set, applying the caller's KQL filter, sort,
    //    pagination and aggregation options.
    const combinedKql = buildGranularRulesKql({ filter, search });
    const categoryCounts = aggregations?.counts ?? [];
    const aggs =
      categoryCounts.length > 0 ? buildAggregations({ categories: categoryCounts }) : undefined;

    const shouldUseSearchAfter =
      sortField != null &&
      sortOrder != null &&
      (page * perPage >= MAX_RESULTS_WINDOW || searchAfterParam != null);

    const findResult = await findRules({
      rulesClient,
      ruleIds: upgradeableSoIds,
      filter: combinedKql,
      sortField,
      sortOrder,
      page: shouldUseSearchAfter ? undefined : page,
      perPage,
      searchAfter: shouldUseSearchAfter ? (searchAfterParam as SortResults | undefined) : undefined,
      aggregations: aggs,
    });

    // 3. Compute diffs for the returned page of rules only.
    const currentRules = findResult.data.map((rule) => internalRuleToAPIResponse(rule));
    const targetVersionSpecifiers = currentRules
      .map((rule) => latestVersionsMap.get(rule.rule_id))
      .filter((v): v is BasicRuleInfo => v != null);
    const latestRules = await ruleAssetsClient.fetchAssetsByVersion(targetVersionSpecifiers);
    const baseRules = await ruleAssetsClient.fetchAssetsByVersion(currentRules);
    const ruleVersionsMap = zipRuleVersions(currentRules, baseRules, latestRules);

    const diffResults = currentRules.map((current) => {
      const base = ruleVersionsMap.get(current.rule_id)?.base;
      const target = ruleVersionsMap.get(current.rule_id)?.target;
      return calculateRuleDiff({ current, base, target });
    });

    const counts = findResult.aggregations
      ? expandRawAggregationResult(findResult.aggregations, categoryCounts)
      : undefined;

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
      total: findResult.total,
      ...(counts ? { counts } : {}),
      ...(shouldUseSearchAfter && findResult.searchAfter
        ? { search_after: findResult.searchAfter as ReviewRuleUpgradeResponseBody['search_after'] }
        : {}),
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
