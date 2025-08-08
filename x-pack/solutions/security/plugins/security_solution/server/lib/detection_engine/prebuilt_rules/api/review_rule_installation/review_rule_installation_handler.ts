/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
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

export const reviewRuleInstallationHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const mlAuthz = ctx.securitySolution.getMlAuthz();

    const allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
    const currentRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
    const currentRuleVersionsMap = new Map(
      currentRuleVersions.map((version) => [version.rule_id, version])
    );

    const allInstallableRules = allLatestVersions.filter(
      (latestVersion) => !currentRuleVersionsMap.has(latestVersion.rule_id)
    );

    const nonInstalledRuleAssets = await ruleAssetsClient.fetchAssetsByVersion(allInstallableRules);
    const installableRuleAssets = await excludeLicenseRestrictedRules(
      nonInstalledRuleAssets,
      mlAuthz
    );

    const body: ReviewRuleInstallationResponseBody = {
      stats: calculateRuleStats(installableRuleAssets),
      rules: installableRuleAssets.map((prebuiltRuleAsset) =>
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
const getAggregatedTags = (rules: PrebuiltRuleAsset[]): string[] => {
  const set = new Set<string>(rules.flatMap((rule) => rule.tags || []));
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
};
const calculateRuleStats = (
  rulesToInstall: PrebuiltRuleAsset[]
): RuleInstallationStatsForReview => {
  const tagsOfRulesToInstall = getAggregatedTags(rulesToInstall);
  return {
    num_rules_to_install: rulesToInstall.length,
    tags: tagsOfRulesToInstall,
  };
};
