/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type {
  PerformRuleInstallationResponseBody,
  PerformRuleInstallationRequestBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { aggregatePrebuiltRuleErrors } from '../../logic/aggregate_prebuilt_rule_errors';
import { ensureLatestRulesPackageInstalled } from '../../logic/integrations/ensure_latest_rules_package_installed';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { performTimelinesInstallation } from '../../logic/perform_timelines_installation';

export const performRuleInstallationHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, PerformRuleInstallationRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const exceptionsListClient = ctx.securitySolution.getExceptionListClient();

    const { mode } = request.body;

    // This will create the endpoint list if it does not exist yet
    await exceptionsListClient?.createEndpointList();

    // If this API is used directly without hitting any detection engine
    // pages first, the rules package might be missing.
    await ensureLatestRulesPackageInstalled(ruleAssetsClient, ctx.securitySolution, logger);

    const { installedRules, skippedRules, errors } =
      mode === 'SPECIFIC_RULES'
        ? await detectionRulesClient.installPrebuiltRules({ ruleSpecifiers: request.body.rules })
        : await detectionRulesClient.installAllPrebuiltRules();

    const { error: timelineInstallationError } = await performTimelinesInstallation(
      ctx.securitySolution
    );

    const allErrors = aggregatePrebuiltRuleErrors(errors);
    if (timelineInstallationError) {
      allErrors.push({
        message: timelineInstallationError,
        rules: [],
      });
    }

    const body: PerformRuleInstallationResponseBody = {
      summary: {
        total: installedRules.length + skippedRules.length + errors.length,
        succeeded: installedRules.length,
        skipped: skippedRules.length,
        failed: errors.length,
      },
      results: {
        created: installedRules,
        skipped: skippedRules,
      },
      errors: allErrors,
    };

    return response.ok({ body });
  } catch (err) {
    logger.error(`performRuleInstallationHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
