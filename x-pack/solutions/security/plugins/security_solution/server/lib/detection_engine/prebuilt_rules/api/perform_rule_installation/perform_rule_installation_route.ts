/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  PERFORM_RULE_INSTALLATION_URL,
  PerformRuleInstallationRequestBody,
  SkipRuleInstallReason,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type {
  PerformRuleInstallationResponseBody,
  SkippedRuleInstall,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import type { PromisePoolError } from '../../../../../utils/promise_pool';
import { buildSiemResponse } from '../../../routes/utils';
import { aggregatePrebuiltRuleErrors } from '../../logic/aggregate_prebuilt_rule_errors';
import { ensureLatestRulesPackageInstalled } from '../../logic/ensure_latest_rules_package_installed';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRules } from '../../logic/rule_objects/create_prebuilt_rules';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../logic/rule_versions/fetch_rule_versions_triad';
import { performTimelinesInstallation } from '../../logic/perform_timelines_installation';
import {
  PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
  PREBUILT_RULES_OPERATION_CONCURRENCY,
} from '../../constants';
import { getRuleGroups } from '../../model/rule_groups/get_rule_groups';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';

export const performRuleInstallationRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: PERFORM_RULE_INSTALLATION_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        tags: [routeLimitedConcurrencyTag(PREBUILT_RULES_OPERATION_CONCURRENCY)],
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
            body: buildRouteValidation(PerformRuleInstallationRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
          const config = ctx.securitySolution.getConfig();
          const soClient = ctx.core.savedObjects.client;
          const rulesClient = await ctx.alerting.getRulesClient();
          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
          const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
          const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
          const exceptionsListClient = ctx.securitySolution.getExceptionListClient();

          const { mode } = request.body;

          // This will create the endpoint list if it does not exist yet
          await exceptionsListClient?.createEndpointList();

          // If this API is used directly without hitting any detection engine
          // pages first, the rules package might be missing.
          await ensureLatestRulesPackageInstalled(ruleAssetsClient, config, ctx.securitySolution);

          const fetchErrors: Array<PromisePoolError<{ rule_id: string }>> = [];
          const skippedRules: SkippedRuleInstall[] = [];

          const ruleVersionsMap = await fetchRuleVersionsTriad({
            ruleAssetsClient,
            ruleObjectsClient,
            versionSpecifiers: mode === 'ALL_RULES' ? undefined : request.body.rules,
          });
          const { currentRules, installableRules } = getRuleGroups(ruleVersionsMap);

          // Perform all the checks we can before we start the upgrade process
          if (mode === 'SPECIFIC_RULES') {
            const currentRuleIds = new Set(currentRules.map((rule) => rule.rule_id));
            const installableRuleIds = new Set(installableRules.map((rule) => rule.rule_id));
            request.body.rules.forEach((rule) => {
              // Check that the requested rule is not installed yet
              if (currentRuleIds.has(rule.rule_id)) {
                skippedRules.push({
                  rule_id: rule.rule_id,
                  reason: SkipRuleInstallReason.ALREADY_INSTALLED,
                });
                return;
              }

              // Check that the requested rule is installable
              if (!installableRuleIds.has(rule.rule_id)) {
                fetchErrors.push({
                  error: new Error(
                    `Rule with ID "${rule.rule_id}" and version "${rule.version}" not found`
                  ),
                  item: rule,
                });
              }
            });
          }

          const { results: installedRules, errors: installationErrors } = await createPrebuiltRules(
            detectionRulesClient,
            installableRules
          );
          const ruleErrors = [...fetchErrors, ...installationErrors];

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

          const body: PerformRuleInstallationResponseBody = {
            summary: {
              total: installedRules.length + skippedRules.length + ruleErrors.length,
              succeeded: installedRules.length,
              skipped: skippedRules.length,
              failed: ruleErrors.length,
            },
            results: {
              created: installedRules.map(({ result }) => result),
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
