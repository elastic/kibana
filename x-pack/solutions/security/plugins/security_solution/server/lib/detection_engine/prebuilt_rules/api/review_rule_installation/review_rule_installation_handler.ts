/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
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
import type { PrebuiltRuleAssetsFilter } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_filter';
import type { PrebuiltRuleAssetsSort } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';

/*
  To ensure a smooth transition from a non-paginated API to a paginated API, we will release the changes in two stages:
  Release 1: Only the backend and mapping changes.
    - Endpoint is paginated, but `page` and `per_page` parameters are optional. If no pagination parameters are provided, it will return all rules at once (same as previous behavior).
    - No changes to frontend – sorting and pagination are still handled on the frontend.
  Release 2: Frontend changes and making pagination parameters required.
    - `page` and `per_page` parameters become required.
    - Frontend makes use of backend-side pagination and sorting.
*/
const DEFAULT_PER_PAGE = 10_000;
const DEFAULT_PAGE = 1;

export const reviewRuleInstallationHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, ReviewRuleInstallationRequestBody | null>,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  const siemResponse = buildSiemResponse(response);
  const {
    page = DEFAULT_PAGE,
    per_page: perPage = DEFAULT_PER_PAGE,
    sort,
    filter,
  } = request.body ?? {};

  logger.debug(
    `reviewRuleInstallationHandler: Executing handler with params: page=${page}, perPage=${perPage}, sort=${JSON.stringify(
      sort
    )}, filter=${JSON.stringify(filter)}`
  );

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const mlAuthz = ctx.securitySolution.getMlAuthz();

    const fetchStats = async (): Promise<{ tags: string[]; numRulesToInstall: number }> => {
      // If there's no filter, we can reuse already fetched installable rule versions array
      const requestHasFilter = Boolean(Object.keys(filter ?? {}).length);

      const installableVersionsWithoutFilter = requestHasFilter
        ? await getInstallableRuleVersions(
            ruleAssetsClient,
            logger,
            mlAuthz,
            installedRuleVersionsMap
          )
        : installableVersions;

      const tags = await ruleAssetsClient.fetchTagsByVersion(installableVersionsWithoutFilter);

      return {
        tags,
        numRulesToInstall: installableVersionsWithoutFilter.length,
      };
    };

    const installedRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
    logger.debug(
      `reviewRuleInstallationHandler: Found ${installedRuleVersions.length} currently installed prebuilt rules`
    );
    const installedRuleVersionsMap = new Map(
      installedRuleVersions.map((version) => [version.rule_id, version])
    );

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

    const { tags, numRulesToInstall } = await fetchStats();

    const body: ReviewRuleInstallationResponseBody = {
      page,
      per_page: perPage,
      total: installableVersions.length, // Number of rules matching the filter
      stats: {
        tags,
        num_rules_to_install: numRulesToInstall, // Number of installable rules without applying filters
      },
      rules: installableRuleAssetsPage.map((prebuiltRuleAsset) =>
        convertPrebuiltRuleAssetToRuleResponse(prebuiltRuleAsset)
      ),
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
