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
import { invariant } from '../../../../../../common/utils/invariant';
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

            // Map rule_id -> { id, name } from the installed rules
            const installedRuleMap = new Map<string, { id: string; name: string }>();
            for (const rule of fetchedRules) {
              installedRuleMap.set(rule.params.ruleId, { id: rule.id, name: rule.name });
            }

            const deprecatedAssets = await ruleAssetsClient.fetchDeprecatedRules([
              ...installedRuleMap.keys(),
            ]);

            const rules: DeprecatedRuleForReview[] = deprecatedAssets.map((asset) => {
              const installedRule = installedRuleMap.get(asset.rule_id);
              invariant(
                installedRule,
                `Expected installed rule for rule_id ${asset.rule_id} to exist`
              );
              return {
                id: installedRule.id,
                rule_id: asset.rule_id,
                name: installedRule.name,
                ...(asset.deprecated_reason != null && {
                  deprecated_reason: asset.deprecated_reason,
                }),
              };
            });

            return response.ok({ body: { rules } });
          }

          // Retrieve all deprecated rule assets to compare in memory
          const deprecatedAssets = await ruleAssetsClient.fetchDeprecatedRules();
          const deprecatedRuleIds = deprecatedAssets.map((asset) => asset.rule_id);

          // Only fetch installed rules that match deprecated rule_ids
          const installedRules = await ruleObjectsClient.fetchInstalledRulesByIds({
            ruleIds: deprecatedRuleIds,
          });

          // Build response from installed rules that have matching deprecated assets
          const deprecatedAssetMap = new Map(
            deprecatedAssets.map((asset) => [asset.rule_id, asset])
          );

          const rules: DeprecatedRuleForReview[] = installedRules.map((rule) => {
            const asset = deprecatedAssetMap.get(rule.rule_id);
            return {
              id: rule.id,
              rule_id: rule.rule_id,
              name: rule.name,
              ...(asset?.deprecated_reason != null && {
                deprecated_reason: asset.deprecated_reason,
              }),
            };
          });

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
