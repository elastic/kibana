/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  PerformRuleUpgradeRequestBody,
  PerformRuleUpgradeResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  ModeEnum,
  PickVersionValuesEnum,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { aggregatePrebuiltRuleErrors } from '../../logic/aggregate_prebuilt_rule_errors';
import { performTimelinesInstallation } from '../../logic/perform_timelines_installation';
import { validatePerformRuleUpgradeRequest } from './validate_perform_rule_upgrade_request';
import {
  sendRuleBulkUpgradeTelemetryEvent,
  sendRuleUpdateTelemetryEvents,
} from './update_rule_telemetry';

export const performRuleUpgradeHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, PerformRuleUpgradeRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
    const analyticsService = ctx.securitySolution.getAnalytics();

    const { isRulesCustomizationEnabled } = detectionRulesClient.getRuleCustomizationStatus();
    const defaultPickVersion = isRulesCustomizationEnabled
      ? PickVersionValuesEnum.MERGED
      : PickVersionValuesEnum.TARGET;

    validatePerformRuleUpgradeRequest({
      isRulesCustomizationEnabled,
      payload: request.body,
      defaultPickVersion,
    });

    const { mode, dry_run: isDryRun, on_conflict: conflictResolutionStrategy } = request.body;
    const sharedArgs = {
      conflictResolutionStrategy,
      defaultPickVersion: request.body.pick_version ?? defaultPickVersion,
      isDryRun: isDryRun ?? false,
    } as const;

    const { updatedRules, skippedRules, errors, ruleUpgradeContexts } =
      mode === ModeEnum.ALL_RULES
        ? await detectionRulesClient.upgradeAllPrebuiltRules({
            filter: request.body.filter,
            ...sharedArgs,
          })
        : await detectionRulesClient.upgradePrebuiltRules({
            ruleSpecifiers: request.body.rules,
            ...sharedArgs,
          });

    const allErrors = aggregatePrebuiltRuleErrors(errors);

    if (!isDryRun) {
      const { error: timelineInstallationError } = await performTimelinesInstallation(
        ctx.securitySolution
      );

      if (timelineInstallationError) {
        allErrors.push({
          message: timelineInstallationError,
          rules: [],
        });
      }

      sendRuleUpdateTelemetryEvents(
        analyticsService,
        ruleUpgradeContexts,
        updatedRules,
        errors,
        skippedRules,
        logger
      );

      if (mode === ModeEnum.ALL_RULES) {
        sendRuleBulkUpgradeTelemetryEvent(
          analyticsService,
          ruleUpgradeContexts,
          updatedRules,
          errors,
          skippedRules,
          logger
        );
      }
    }

    const body: PerformRuleUpgradeResponseBody = {
      summary: {
        total: updatedRules.length + skippedRules.length + errors.length,
        skipped: skippedRules.length,
        succeeded: updatedRules.length,
        failed: errors.length,
      },
      results: {
        updated: updatedRules,
        skipped: skippedRules,
      },
      errors: allErrors,
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
