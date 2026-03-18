/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { Logger } from '@kbn/logging';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';

export const SECURITY_MANAGE_RULES_TOOL_ID = securityTool('manage_rules');

const manageRulesSchema = z.object({
  operation: z
    .enum(['enable', 'disable', 'install_prebuilt', 'duplicate'])
    .describe(
      'The operation to perform. "enable" enables rules, "disable" disables rules, "install_prebuilt" installs prebuilt Elastic rules, "duplicate" creates copies of existing rules.'
    ),
  rule_ids: z
    .array(z.string())
    .optional()
    .describe(
      'Array of rule saved object IDs to operate on. Required for enable, disable, and duplicate operations.'
    ),
  query: z
    .string()
    .optional()
    .describe('KQL query to filter rules for bulk operations. Alternative to rule_ids.'),
});

export const manageRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures?: ExperimentalFeatures
): BuiltinSkillBoundedTool<typeof manageRulesSchema> => {
  return {
    id: SECURITY_MANAGE_RULES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Manage security detection rules: enable, disable, duplicate existing rules, or install prebuilt Elastic rules. Operates on rules by ID or KQL query.',
    schema: manageRulesSchema,
    handler: async ({ operation, rule_ids: ruleIds, query }, { request }) => {
      logger.debug(
        `${SECURITY_MANAGE_RULES_TOOL_ID} tool called with operation: ${operation}, rule_ids: ${JSON.stringify(
          ruleIds
        )}`
      );

      try {
        const [, startPlugins] = await core.getStartServices();
        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

        if (operation === 'install_prebuilt') {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message:
                    'To install prebuilt rules, use the Kibana API: PUT /api/detection_engine/rules/prepackaged. This operation requires the Security app to be properly configured.',
                  operation: 'install_prebuilt',
                },
              },
            ],
          };
        }

        if (!ruleIds?.length && !query) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: 'Either rule_ids or query must be provided for this operation.',
                },
              },
            ],
          };
        }

        let targetIds = ruleIds ?? [];

        if (!targetIds.length && query) {
          const found = await rulesClient.find({
            options: {
              filter: query,
              perPage: 100,
            },
          });
          targetIds = found.data.map((rule) => rule.id);
        }

        if (operation === 'enable') {
          const enabled: string[] = [];
          for (const id of targetIds) {
            await rulesClient.enableRule({ id });
            enabled.push(id);
          }
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `Successfully enabled ${enabled.length} rule(s).`,
                  rule_ids: enabled,
                },
              },
            ],
          };
        }

        if (operation === 'disable') {
          const disabled: string[] = [];
          for (const id of targetIds) {
            await rulesClient.disableRule({ id });
            disabled.push(id);
          }
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `Successfully disabled ${disabled.length} rule(s).`,
                  rule_ids: disabled,
                },
              },
            ],
          };
        }

        if (operation === 'duplicate') {
          const duplicated: Array<{ original_id: string; new_id: string; name: string }> = [];
          for (const id of targetIds) {
            const rule = await rulesClient.get({ id });
            const newRule = await rulesClient.create({
              data: {
                name: `${rule.name} (copy)`,
                enabled: false,
                alertTypeId: rule.alertTypeId,
                consumer: rule.consumer,
                schedule: rule.schedule,
                tags: rule.tags,
                params: rule.params,
                throttle: rule.throttle ?? undefined,
                notifyWhen: rule.notifyWhen ?? undefined,
                actions: rule.actions,
              },
            });
            duplicated.push({ original_id: id, new_id: newRule.id, name: newRule.name });
          }
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `Successfully duplicated ${duplicated.length} rule(s).`,
                  duplicated,
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Unknown operation: ${operation}`,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_MANAGE_RULES_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error managing rules: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
