/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { RuleSummary } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import type {
  ReviewRuleInstallationRequestBody,
  ReviewRuleInstallationResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import type { IPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { excludeLicenseRestrictedRules } from '../../logic/utils';
import type { BasicRuleInfo } from '../../logic/basic_rule_info';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { buildGranularRulesKql } from '../../../rule_management/logic/search/build_granular_rules_kql';
import {
  buildPrebuiltRuleAssetsAggregations,
  expandPrebuiltRuleAssetsAggregationResult,
} from '../../logic/search/prebuilt_rule_assets_aggregations';
import { convertPrebuiltRuleAssetSearchTermToKql } from '../../logic/search/convert_prebuilt_rule_asset_search_term_to_kql';

export const reviewRuleInstallationHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, ReviewRuleInstallationRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
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
    search_after: searchAfter,
  } = request.body;

  logger.debug(
    `reviewRuleInstallationHandler: Executing handler with params: page=${page}, perPage=${perPage}, sort_field=${sortField}, sort_order=${sortOrder}, filter=${filter}`
  );

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const mlAuthz = ctx.securitySolution.getMlAuthz();

    const installedRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
    logger.debug(
      `reviewRuleInstallationHandler: Found ${installedRuleVersions.length} currently installed prebuilt rules`
    );
    const installedRuleVersionsMap = new Map(
      installedRuleVersions.map((version) => [version.rule_id, version])
    );

    const combinedKql = buildGranularRulesKql({
      filter,
      search,
      searchTermConverter: convertPrebuiltRuleAssetSearchTermToKql,
    });
    const categoryCounts = aggregations?.counts ?? [];
    const aggs =
      categoryCounts.length > 0
        ? buildPrebuiltRuleAssetsAggregations({ categories: categoryCounts })
        : undefined;

    const [rulesResult, stats] = await Promise.all([
      fetchRules({
        ruleAssetsClient,
        logger,
        mlAuthz,
        installedRuleVersionsMap,
        filter: combinedKql,
        sortField,
        sortOrder,
        page,
        perPage,
        searchAfter: searchAfter as SortResults | undefined,
        aggs,
      }),
      fetchStats({ ruleAssetsClient, logger, mlAuthz, installedRuleVersionsMap }),
    ]);

    const counts = rulesResult.aggregations
      ? expandPrebuiltRuleAssetsAggregationResult(rulesResult.aggregations, categoryCounts)
      : undefined;

    const body: ReviewRuleInstallationResponseBody = {
      page,
      per_page: perPage,
      rules: rulesResult.rules,
      total: rulesResult.total,
      stats: {
        tags: stats.tags,
        num_rules_to_install: stats.numRulesToInstall,
      },
      ...(counts ? { counts } : {}),
      ...(rulesResult.searchAfter ? { search_after: rulesResult.searchAfter } : {}),
    };

    logger.debug(
      `reviewRuleInstallationHandler: Returning response with total=${body.total}, num_rules_to_install=${body.stats.num_rules_to_install}`
    );

    return response.ok({ body });
  } catch (err) {
    logger.error(`reviewRuleInstallationHandler: Caught error`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};

async function fetchRules({
  ruleAssetsClient,
  logger,
  mlAuthz,
  installedRuleVersionsMap,
  filter,
  sortField,
  sortOrder,
  page,
  perPage,
  searchAfter,
  aggs,
}: {
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  logger: Logger;
  mlAuthz: MlAuthz;
  installedRuleVersionsMap: Map<string, RuleSummary>;
  filter: string | undefined;
  sortField: ReviewRuleInstallationRequestBody['sort_field'];
  sortOrder: ReviewRuleInstallationRequestBody['sort_order'];
  page: number;
  perPage: number;
  searchAfter?: SortResults;
  aggs?: Parameters<IPrebuiltRuleAssetsClient['searchRuleAssets']>[0]['aggregations'];
}) {
  const installableVersions = await getInstallableRuleVersions(
    ruleAssetsClient,
    logger,
    mlAuthz,
    installedRuleVersionsMap
  );

  const searchResult = await ruleAssetsClient.searchRuleAssets({
    versions: installableVersions,
    filter,
    sortField,
    sortOrder,
    page,
    perPage,
    searchAfter,
    aggregations: aggs,
  });

  return {
    rules: searchResult.assets.map((prebuiltRuleAsset) =>
      convertPrebuiltRuleAssetToRuleResponse(prebuiltRuleAsset)
    ),
    total: searchResult.total,
    searchAfter: searchResult.searchAfter,
    aggregations: searchResult.aggregations,
  };
}

async function fetchStats({
  ruleAssetsClient,
  logger,
  mlAuthz,
  installedRuleVersionsMap,
}: {
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  logger: Logger;
  mlAuthz: MlAuthz;
  installedRuleVersionsMap: Map<string, RuleSummary>;
}): Promise<{ tags: string[]; numRulesToInstall: number }> {
  const installableVersionsWithoutFilter = await getInstallableRuleVersions(
    ruleAssetsClient,
    logger,
    mlAuthz,
    installedRuleVersionsMap
  );

  const tags = await ruleAssetsClient.fetchTagsByVersion(installableVersionsWithoutFilter);

  return {
    tags,
    numRulesToInstall: installableVersionsWithoutFilter.length,
  };
}

async function getInstallableRuleVersions(
  ruleAssetsClient: IPrebuiltRuleAssetsClient,
  logger: Logger,
  mlAuthz: MlAuthz,
  installedRuleVersionsMap: Map<string, RuleSummary>
): Promise<BasicRuleInfo[]> {
  const latestRuleVersions = await ruleAssetsClient.fetchLatestVersions();

  logger.debug(
    `reviewRuleInstallationHandler: Fetched ${latestRuleVersions.length} latest rule versions from assets`
  );

  const nonInstalledLatestRuleVersions = latestRuleVersions.filter(
    (latestVersion) => !installedRuleVersionsMap.has(latestVersion.rule_id)
  );

  logger.debug(
    `reviewRuleInstallationHandler: ${nonInstalledLatestRuleVersions.length} rules remaining after filtering installed rules`
  );

  const installableRuleVersions = await excludeLicenseRestrictedRules(
    nonInstalledLatestRuleVersions,
    mlAuthz
  );

  logger.debug(
    `reviewRuleInstallationHandler: ${installableRuleVersions.length} rules remaining after checking license restrictions`
  );

  return installableRuleVersions;
}
