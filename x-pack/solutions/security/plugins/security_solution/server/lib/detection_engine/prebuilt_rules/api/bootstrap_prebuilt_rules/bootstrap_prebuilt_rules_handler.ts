/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { ProductFeatureRulesKey } from '@kbn/security-solution-features/keys';
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
  response: KibanaResponseFactory,
  logger: Logger
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
      ProductFeatureRulesKey.externalDetections
    );

    const packageResults: PackageInstallStatus[] = [];

    // Install packages sequentially to avoid high memory usage
    const prebuiltRulesResult = await installPrebuiltRulesPackage(securityContext, logger);
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
        logger,
      });
    } else {
      const endpointResult = await installEndpointPackage(securityContext, logger);
      packageResults.push({
        name: endpointResult.package.name,
        version: endpointResult.package.version,
        status: endpointResult.status,
      });
    }

    const securityAiPromptsResult = await installSecurityAiPromptsPackage(securityContext, logger);

    if (securityAiPromptsResult !== null) {
      packageResults.push({
        name: securityAiPromptsResult.package.name,
        version: securityAiPromptsResult.package.version,
        status: securityAiPromptsResult.status,
      });
    }

    const responseBody: BootstrapPrebuiltRulesResponse = {
      packages: packageResults,
      rules: ruleResults,
    };

    logger.debug(
      `bootstrapPrebuiltRulesHandler: Total packages installed: ${packageResults.length}`
    );

    return response.ok({
      body: responseBody,
    });
  } catch (err) {
    logger.error(`bootstrapPrebuiltRulesHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
