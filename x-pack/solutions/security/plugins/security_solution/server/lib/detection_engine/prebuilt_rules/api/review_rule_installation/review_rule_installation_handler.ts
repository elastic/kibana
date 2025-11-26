/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  ReviewRuleInstallationRequestBody,
  ReviewRuleInstallationResponseBody,
  RuleInstallationStatsForReview,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { excludeLicenseRestrictedRules } from '../../logic/utils';

// TODO: Add proper sort type
const DEFAULT_SORT = [
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
  const { page = 1, per_page: perPage = 20, sort = DEFAULT_SORT } = request.body ?? {};

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const mlAuthz = ctx.securitySolution.getMlAuthz();

    const allLatestVersions = await ruleAssetsClient.fetchLatestVersions(undefined, sort);
    const currentRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
    const currentRuleVersionsMap = new Map(
      currentRuleVersions.map((version) => [version.rule_id, version])
    );

    const nonInstalledLatestVersions = allLatestVersions.filter(
      (latestVersion) => !currentRuleVersionsMap.has(latestVersion.rule_id)
    );

    const installableVersions = await excludeLicenseRestrictedRules(
      nonInstalledLatestVersions,
      mlAuthz
    );

    const tags = await ruleAssetsClient.fetchTagsByVersion(installableVersions);

    const installableVersionsPage = installableVersions.slice((page - 1) * perPage, page * perPage);

    const installableRuleAssetsPage = await ruleAssetsClient.fetchAssetsByVersion(
      installableVersionsPage
    );

    const body: ReviewRuleInstallationResponseBody = {
      total: installableVersions.length,
      stats: {
        tags,
        num_rules_to_install: installableVersions.length,
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
