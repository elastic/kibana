/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import {
  REVIEW_RULE_DEPRECATION_URL,
  ReviewRuleDeprecationRequestBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { DeprecatedRuleForReview } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { RuleParams } from '../../../rule_schema';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';

export const reviewRuleDeprecationRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: REVIEW_RULE_DEPRECATION_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(ReviewRuleDeprecationRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core', 'alerting']);
          const soClient = ctx.core.savedObjects.client;
          const rulesClient = await ctx.alerting.getRulesClient();
          const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
          const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

          const ids = request.body?.ids;

          if (ids && ids.length > 0) {
            // Resolve the provided alert SO IDs to rule_ids, then fetch only
            // deprecated assets matching those rule_ids.
            const { rules: fetchedRules } = await rulesClient.bulkGetRules<RuleParams>({
              ids,
            });

            const ruleIdMap = new Map<string, string>();
            for (const rule of fetchedRules) {
              ruleIdMap.set(rule.params.ruleId, rule.id);
            }

            const deprecatedAssets = await ruleAssetsClient.fetchDeprecatedRules([
              ...ruleIdMap.keys(),
            ]);

            const rules: DeprecatedRuleForReview[] = deprecatedAssets.map((asset) => ({
              id: ruleIdMap.get(asset.rule_id) as string,
              rule_id: asset.rule_id,
              version: asset.version,
              name: asset.name,
              ...(asset.deprecated_reason != null && {
                deprecated_reason: asset.deprecated_reason,
              }),
            }));

            return response.ok({ body: { rules } });
          }

          // No ids filter: fetch all deprecated assets, then resolve their
          // installed rule alert SO IDs via the rule objects client.
          const deprecatedAssets = await ruleAssetsClient.fetchDeprecatedRules();
          const deprecatedRuleIds = deprecatedAssets.map((asset) => asset.rule_id);

          if (deprecatedRuleIds.length === 0) {
            return response.ok({ body: { rules: [] } });
          }

          const installedVersions = await ruleObjectsClient.fetchInstalledRuleVersionsByIds({
            ruleIds: deprecatedRuleIds,
          });

          const installedRuleIdMap = new Map<string, string>();
          for (const installed of installedVersions) {
            installedRuleIdMap.set(installed.rule_id, installed.id);
          }

          // Only include deprecated assets that are actually installed
          const rules: DeprecatedRuleForReview[] = deprecatedAssets
            .filter((asset) => installedRuleIdMap.has(asset.rule_id))
            .map((asset) => ({
              id: installedRuleIdMap.get(asset.rule_id) as string,
              rule_id: asset.rule_id,
              version: asset.version,
              name: asset.name,
              ...(asset.deprecated_reason != null && {
                deprecated_reason: asset.deprecated_reason,
              }),
            }));

          return response.ok({ body: { rules } });
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
