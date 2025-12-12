/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
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
import type { ReviewPrebuiltRuleInstallationFilter } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/review_prebuilt_rules_installation_filter';
import type { ReviewPrebuiltRuleInstallationSort } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/review_prebuilt_rules_installation_sort';

const DEFAULT_SORT: ReviewPrebuiltRuleInstallationSort = [
  {
    field: 'name',
    order: 'asc',
  },
];

export const reviewRuleInstallationHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<undefined, undefined, ReviewRuleInstallationRequestBody>,
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

    const currentRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
    const currentRuleVersionsMap = new Map(
      currentRuleVersions.map((version) => [version.rule_id, version])
    );

    const hasFilter = Boolean(filter && Object.keys(filter).length);

    const installableVersions = await getInstallableRuleVersions(
      ruleAssetsClient,
      mlAuthz,
      currentRuleVersionsMap,
      sort,
      filter
    );

    const installableVersionsWithoutFilter = hasFilter
      ? await getInstallableRuleVersions(ruleAssetsClient, mlAuthz, currentRuleVersionsMap)
      : installableVersions;

    const installableVersionsPage = installableVersions.slice((page - 1) * perPage, page * perPage);

    const installableRuleAssetsPage = await ruleAssetsClient.fetchAssetsByVersion(
      installableVersionsPage
    );

    const tags = await ruleAssetsClient.fetchTagsByVersion(installableVersionsWithoutFilter);

    const body: ReviewRuleInstallationResponseBody = {
      page,
      per_page: perPage,
      total: installableVersions.length, // Number of rules matching the filter
      stats: {
        tags,
        num_rules_to_install: installableVersionsWithoutFilter.length, // Number of installable rules without applying filters
      },
      rules: installableRuleAssetsPage.map((prebuiltRuleAsset) =>
        convertPrebuiltRuleAssetToRuleResponse(prebuiltRuleAsset)
      ),
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

async function getInstallableRuleVersions(
  ruleAssetsClient: IPrebuiltRuleAssetsClient,
  mlAuthz: MlAuthz,
  currentRuleVersionsMap: Map<string, RuleSummary>,
  sort?: ReviewPrebuiltRuleInstallationSort,
  filter?: ReviewPrebuiltRuleInstallationFilter
): Promise<BasicRuleInfo[]> {
  const allLatestVersions = await ruleAssetsClient.fetchLatestVersions({
    sort,
    filter,
  });

  const nonInstalledLatestVersions = allLatestVersions.filter(
    (latestVersion) => !currentRuleVersionsMap.has(latestVersion.rule_id)
  );

  const installableVersions = await excludeLicenseRestrictedRules(
    nonInstalledLatestVersions,
    mlAuthz
  );

  return installableVersions;
}
