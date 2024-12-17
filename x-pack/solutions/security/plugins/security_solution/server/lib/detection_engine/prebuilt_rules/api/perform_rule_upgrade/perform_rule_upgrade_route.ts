/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  PERFORM_RULE_UPGRADE_URL,
  PerformRuleUpgradeRequestBody,
  ModeEnum,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { PerformRuleUpgradeResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { aggregatePrebuiltRuleErrors } from '../../logic/aggregate_prebuilt_rule_errors';
import { performTimelinesInstallation } from '../../logic/perform_timelines_installation';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { upgradePrebuiltRules } from '../../logic/rule_objects/upgrade_prebuilt_rules';
import { fetchRuleVersionsTriad } from '../../logic/rule_versions/fetch_rule_versions_triad';
import { PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS } from '../../constants';
import { getUpgradeableRules } from './get_upgradeable_rules';
import { createModifiedPrebuiltRuleAssets } from './create_upgradeable_rules_payload';
import { getRuleGroups } from '../../model/rule_groups/get_rule_groups';
import type { ConfigType } from '../../../../../config';

export const performRuleUpgradeRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType
) => {
  router.versioned
    .post({
      access: 'internal',
      path: PERFORM_RULE_UPGRADE_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        timeout: {
          idleSocket: PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(PerformRuleUpgradeRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
          const soClient = ctx.core.savedObjects.client;
          const rulesClient = await ctx.alerting.getRulesClient();
          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
          const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
          const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

          const { mode } = request.body;

          const versionSpecifiers = mode === ModeEnum.ALL_RULES ? undefined : request.body.rules;
          const ruleTriadsMap = await fetchRuleVersionsTriad({
            ruleAssetsClient,
            ruleObjectsClient,
            versionSpecifiers,
          });
          const ruleGroups = getRuleGroups(ruleTriadsMap);

          const { upgradeableRules, skippedRules, fetchErrors } = getUpgradeableRules({
            rawUpgradeableRules: ruleGroups.upgradeableRules,
            currentRules: ruleGroups.currentRules,
            versionSpecifiers,
            mode,
          });

          const { prebuiltRulesCustomizationEnabled } = config.experimentalFeatures;
          const { modifiedPrebuiltRuleAssets, processingErrors } = createModifiedPrebuiltRuleAssets(
            {
              upgradeableRules,
              requestBody: request.body,
              prebuiltRulesCustomizationEnabled,
            }
          );

          const { results: updatedRules, errors: installationErrors } = await upgradePrebuiltRules(
            detectionRulesClient,
            modifiedPrebuiltRuleAssets
          );
          const ruleErrors = [...fetchErrors, ...processingErrors, ...installationErrors];

          const { error: timelineInstallationError } = await performTimelinesInstallation(
            ctx.securitySolution
          );

          const allErrors = aggregatePrebuiltRuleErrors(ruleErrors);
          if (timelineInstallationError) {
            allErrors.push({
              message: timelineInstallationError,
              rules: [],
            });
          }

          const body: PerformRuleUpgradeResponseBody = {
            summary: {
              total: updatedRules.length + skippedRules.length + ruleErrors.length,
              skipped: skippedRules.length,
              succeeded: updatedRules.length,
              failed: ruleErrors.length,
            },
            results: {
              updated: updatedRules.map(({ result }) => result),
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
      }
    );
};
