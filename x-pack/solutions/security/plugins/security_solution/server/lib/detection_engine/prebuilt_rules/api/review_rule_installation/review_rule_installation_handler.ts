/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { CamelCasedPropertiesDeep } from 'type-fest';
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
import type { PrebuiltRuleAssetsFilter } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_filter';
import type { PrebuiltRuleAssetsSort } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { convertObjectKeysToCamelCase } from '../../../../../utils/object_case_converters';

export const reviewRuleInstallationHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, ReviewRuleInstallationRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  const siemResponse = buildSiemResponse(response);
  const requestParameters = convertObjectKeysToCamelCase(request.body);

  logger.debug(
    `reviewRuleInstallationHandler: Executing handler with params: page=${
      requestParameters.page
    }, perPage=${requestParameters.perPage}, sort=${JSON.stringify(
      requestParameters.sort
    )}, filter=${JSON.stringify(requestParameters.filter)}`
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

    const [rules, stats] = await Promise.all([
      fetchRules({
        ruleAssetsClient,
        logger,
        mlAuthz,
        installedRuleVersionsMap,
        requestParameters,
      }),
      fetchStats({ ruleAssetsClient, logger, mlAuthz, installedRuleVersionsMap }),
    ]);

    const body: ReviewRuleInstallationResponseBody = {
      page: requestParameters.page,
      per_page: requestParameters.perPage,
      rules: rules.rules,
      total: rules.total, // Number of rules matching the filter
      stats: {
        tags: stats.tags,
        num_rules_to_install: stats.numRulesToInstall, // Number of installable rules without applying filters
      },
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
  requestParameters,
}: {
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  logger: Logger;
  mlAuthz: MlAuthz;
  installedRuleVersionsMap: Map<string, RuleSummary>;
  requestParameters: CamelCasedPropertiesDeep<ReviewRuleInstallationRequestBody>;
}): Promise<{ rules: RuleResponse[]; total: number }> {
  const { sort, filter, page, perPage } = requestParameters;
  const installableVersions = await getInstallableRuleVersions(
    ruleAssetsClient,
    logger,
    mlAuthz,
    installedRuleVersionsMap,
    sort,
    filter
  );

  const installableVersionsPage = installableVersions.slice((page - 1) * perPage, page * perPage);

  const installableRuleAssetsPage = await ruleAssetsClient.fetchAssetsByVersion(
    installableVersionsPage
  );

  return {
    rules: installableRuleAssetsPage.map((prebuiltRuleAsset) =>
      convertPrebuiltRuleAssetToRuleResponse(prebuiltRuleAsset)
    ),
    total: installableVersions.length,
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
  installedRuleVersionsMap: Map<string, RuleSummary>,
  sort?: PrebuiltRuleAssetsSort,
  filter?: PrebuiltRuleAssetsFilter
): Promise<BasicRuleInfo[]> {
  const latestRuleVersions = await ruleAssetsClient.fetchLatestVersions({
    sort,
    filter,
  });

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
