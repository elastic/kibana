/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { firstValueFrom } from 'rxjs';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { securityTool } from './constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginSetupDependencies,
} from '../../plugin_contract';
import { createPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRules } from '../../lib/detection_engine/prebuilt_rules/logic/rule_objects/create_prebuilt_rules';
import { createDetectionRulesClient } from '../../lib/detection_engine/rule_management/logic/detection_rules_client/detection_rules_client';
import { buildMlAuthz } from '../../lib/machine_learning/authz';
import { calculateRulesAuthz } from '../../lib/detection_engine/rule_management/authz';
import type { ProductFeaturesService } from '../../lib/product_features_service';

const installPrebuiltRulesSchema = z.object({
  rule_ids: z
    .array(z.string())
    .min(1)
    .max(50)
    .describe(
      'Array of prebuilt rule IDs to install. Use the find_prebuilt_rules tool first to discover available rule IDs.'
    ),
});

export const SECURITY_INSTALL_PREBUILT_RULES_TOOL_ID = securityTool('install_prebuilt_rules');

export const installPrebuiltRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  plugins: SecuritySolutionPluginSetupDependencies,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof installPrebuiltRulesSchema> => {
  return {
    id: SECURITY_INSTALL_PREBUILT_RULES_TOOL_ID,
    type: ToolType.builtin,
    description: `Install selected Elastic Security prebuilt detection rules by their rule IDs. Use the find_prebuilt_rules tool first to discover available rules and their rule_ids, then use this tool to install the desired ones. Returns a summary of installed, skipped (already installed), and failed rules.`,
    schema: installPrebuiltRulesSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (params, { request, savedObjectsClient }) => {
      const { rule_ids: ruleIds } = params;

      try {
        logger.debug(
          `${SECURITY_INSTALL_PREBUILT_RULES_TOOL_ID} tool called with ${ruleIds.length} rule_ids`
        );

        const [coreStart, startPlugins] = await core.getStartServices();

        // Build required clients
        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
        const actionsClient = await startPlugins.actions.getActionsClientWithRequest(request);
        const license = await firstValueFrom(startPlugins.licensing.license$);

        const mlAuthz = buildMlAuthz({
          license,
          ml: plugins.ml,
          request,
          savedObjectsClient,
        });

        const rulesAuthz = await calculateRulesAuthz({ coreStart, request });

        const detectionRulesClient = createDetectionRulesClient({
          actionsClient,
          rulesClient,
          savedObjectsClient,
          mlAuthz,
          rulesAuthz,
          productFeaturesService,
          license,
        });

        // Fetch available prebuilt rule assets
        const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
        const allRuleAssets = await ruleAssetsClient.fetchLatestAssets();
        const ruleAssetsMap = new Map(allRuleAssets.map((rule) => [rule.rule_id, rule]));

        // Check which rules are already installed
        const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
        const installedVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
        const installedRuleIds = new Set(installedVersions.map((r) => r.rule_id));

        // Categorize requested rules
        const rulesToInstall = [];
        const skippedAlreadyInstalled = [];
        const notFound = [];

        for (const ruleId of ruleIds) {
          const asset = ruleAssetsMap.get(ruleId);

          if (!asset) {
            notFound.push(ruleId);
          } else if (installedRuleIds.has(ruleId)) {
            skippedAlreadyInstalled.push(ruleId);
          } else {
            rulesToInstall.push(asset);
          }
        }

        // Install rules
        const { results: installedRules, errors: installErrors } = await createPrebuiltRules(
          detectionRulesClient,
          rulesToInstall,
          logger
        );

        const failedRules = installErrors.map((err) => ({
          rule_id: err.item.rule_id,
          error: err.error instanceof Error ? err.error.message : String(err.error),
        }));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: {
                  total: ruleIds.length,
                  installed: installedRules.length,
                  already_installed: skippedAlreadyInstalled.length,
                  not_found: notFound.length,
                  failed: failedRules.length,
                },
                installed_rules: installedRules.map(({ result }) => ({
                  rule_id: result.rule_id,
                  name: result.name,
                  severity: result.severity,
                })),
                ...(skippedAlreadyInstalled.length > 0 && {
                  already_installed_rule_ids: skippedAlreadyInstalled,
                }),
                ...(notFound.length > 0 && { not_found_rule_ids: notFound }),
                ...(failedRules.length > 0 && { failed_rules: failedRules }),
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${SECURITY_INSTALL_PREBUILT_RULES_TOOL_ID} tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error installing prebuilt rules: ${errorMessage}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'detection', 'prebuilt-rules', 'install'],
  };
};
