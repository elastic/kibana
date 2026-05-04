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
import { transformError } from '@kbn/securitysolution-es-utils';
import type { RuleBootstrapResults } from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { installPromotionRules } from '../../logic/integrations/install_promotion_rules';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';

export const bootstrapEaseRulesHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  _: KibanaRequest,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<RuleBootstrapResults>> => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['securitySolution', 'alerting', 'core']);
    const securityContext = ctx.securitySolution;

    const savedObjectsClient = ctx.core.savedObjects.client;
    const detectionRulesClient = securityContext.getDetectionRulesClient();
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

    const ruleResults = await installPromotionRules({
      rulesClient,
      detectionRulesClient,
      ruleAssetsClient,
      ruleObjectsClient,
      fleetServices: securityContext.getInternalFleetServices(),
      logger,
    });

    logger.debug(
      `bootstrapEaseRulesHandler: EASE rules installed: ${ruleResults.installed}, updated: ${ruleResults.updated}, deleted: ${ruleResults.deleted}`
    );

    return response.ok({
      body: ruleResults,
    });
  } catch (err) {
    logger.error(`bootstrapEaseRulesHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
