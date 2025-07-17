/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { transformError } from '@kbn/securitysolution-es-utils';
import { installSecurityAiPromptsPackage } from '../../logic/integrations/install_ai_prompts';
import type {
  BootstrapPrebuiltRulesResponse,
  PackageInstallStatus,
  RuleBootstrapResults,
} from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { installEndpointPackage } from '../../logic/integrations/install_endpoint_package';
import { installPrebuiltRulesPackage } from '../../logic/integrations/install_prebuilt_rules_package';
import { installPromotionRules } from '../../logic/integrations/install_promotion_rules';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';

export const bootstrapPrebuiltRulesHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  _: KibanaRequest,
  response: KibanaResponseFactory
): Promise<IKibanaResponse<BootstrapPrebuiltRulesResponse>> => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['securitySolution', 'alerting', 'core']);
    const securityContext = ctx.securitySolution;
    const savedObjectsClient = ctx.core.savedObjects.client;
    const detectionRulesClient = securityContext.getDetectionRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

    const productFeatureService = securityContext.getProductFeatureService();
    const isExternalDetectionsEnabled = productFeatureService.isEnabled(
      ProductFeatureSecurityKey.externalDetections
    );

    const packageResults: PackageInstallStatus[] = [];

    // Install packages sequentially to avoid high memory usage
    const prebuiltRulesResult = await installPrebuiltRulesPackage(securityContext);
    packageResults.push({
      name: prebuiltRulesResult.package.name,
      version: prebuiltRulesResult.package.version,
      status: prebuiltRulesResult.status,
    });

    let ruleResults: RuleBootstrapResults | undefined;
    if (isExternalDetectionsEnabled) {
      ruleResults = await installPromotionRules({
        rulesClient,
        detectionRulesClient,
        ruleAssetsClient,
        ruleObjectsClient,
        fleetServices: securityContext.getInternalFleetServices(),
      });
    } else {
      const endpointResult = await installEndpointPackage(securityContext);
      packageResults.push({
        name: endpointResult.package.name,
        version: endpointResult.package.version,
        status: endpointResult.status,
      });
    }

    const responseBody: BootstrapPrebuiltRulesResponse = {
      packages: packageResults,
      rules: ruleResults,
    };

    const securityAiPromptsResult = await installSecurityAiPromptsPackage(securityContext);

    if (securityAiPromptsResult !== null) {
      responseBody.packages.push({
        name: securityAiPromptsResult.package.name,
        version: securityAiPromptsResult.package.version,
        status: securityAiPromptsResult.status,
      });
    }

    return response.ok({
      body: responseBody,
    });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
