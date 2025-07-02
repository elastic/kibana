/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_PREBUILT_RULES_STATUS_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { GetPrebuiltRulesStatusResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { excludeLicenseRestrictedRules, getPossibleUpgrades } from '../../logic/utils';

export const getPrebuiltRulesStatusRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_PREBUILT_RULES_STATUS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
          const soClient = ctx.core.savedObjects.client;
          const rulesClient = await ctx.alerting.getRulesClient();
          const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
          const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
          const mlAuthz = ctx.securitySolution.getMlAuthz();

          const currentRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
          const latestRuleVersions = await ruleAssetsClient.fetchLatestVersions();
          const currentRuleVersionsMap = new Map(
            currentRuleVersions.map((rule) => [rule.rule_id, rule])
          );
          const latestRuleVersionsMap = new Map(
            latestRuleVersions.map((rule) => [rule.rule_id, rule])
          );
          const allInstallableRules = latestRuleVersions.filter(
            (rule) => !currentRuleVersionsMap.has(rule.rule_id)
          );

          const installableRuleAssets = await excludeLicenseRestrictedRules(
            allInstallableRules,
            mlAuthz
          );

          const upgradableRules = await getPossibleUpgrades(
            currentRuleVersions,
            latestRuleVersionsMap,
            mlAuthz
          );

          const upgradeableRulesTags = upgradableRules.reduce<string[]>((tags, rule) => {
            const ruleTags = currentRuleVersionsMap.get(rule.rule_id)?.tags;
            if (ruleTags) {
              tags.push(...ruleTags);
            }
            return tags;
          }, []);

          const body: GetPrebuiltRulesStatusResponseBody = {
            stats: {
              num_prebuilt_rules_installed: currentRuleVersions.length,
              num_prebuilt_rules_to_install: installableRuleAssets.length,
              num_prebuilt_rules_to_upgrade: upgradableRules.length,
              num_prebuilt_rules_total_in_package: latestRuleVersions.length,
            },
            aggregated_fields: {
              upgradeable_rules: {
                tags: [...new Set(upgradeableRulesTags)],
              },
            },
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
