/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { RESOLUTION_RULE_IDS, type ResolutionRuleId } from '@kbn/entity-store/common';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { securityTool } from '../../constants';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { checkResolutionAccess } from './check_resolution_access';
import { getResolutionToolAvailability } from './resolution_availability';

const RULE_ID_VALUES = Object.values(RESOLUTION_RULE_IDS) as [
  ResolutionRuleId,
  ...ResolutionRuleId[]
];

const schema = z.object({
  ruleId: z
    .enum(RULE_ID_VALUES)
    .describe(
      'The stable id of the entity resolution rule to enable. Use `security.list_resolution_rules` if needed to see the available ids and their current state.'
    ),
});

export const SECURITY_ENABLE_RESOLUTION_RULE_TOOL_ID = securityTool('enable_resolution_rule');

export const enableResolutionRuleTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_ENABLE_RESOLUTION_RULE_TOOL_ID,
    type: ToolType.builtin,
    description: `Enable a managed entity resolution rule in the current space. Requires user confirmation before the change is applied.

Use when the user asks to turn on, enable, or re-enable an automated resolution rule (e.g. "enable the email matching rule", "turn the Windows SID bridge back on"). Resolve the rule id first when the user named the rule rather than gave its id.`,
    schema,
    tags: ['security', 'entity-store', 'entity-analytics', 'resolution'],
    annotations: {
      title: 'Enable Resolution Rule',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) =>
        getResolutionToolAvailability({ core, request, spaceId, experimentalFeatures, logger }),
    },
    handler: async (params, { spaceId, savedObjectsClient, prompts, callContext, request }) => {
      logger.debug(
        `${SECURITY_ENABLE_RESOLUTION_RULE_TOOL_ID} tool called with parameters ${JSON.stringify(
          params
        )}`
      );

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_ENABLE_RESOLUTION_RULE_TOOL_ID,
        spaceId,
        actionType: 'mutation',
      });
      telemetryTracker.recordResultCount(0);

      try {
        const [, { security, entityStore }] = await core.getStartServices();
        const accessResult = await checkResolutionAccess({
          request,
          security,
          action: 'enable entity resolution rules',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const promptId = `resolution.enable_resolution_rule.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);
        telemetryTracker.recordConfirmationStatus(status);

        if (status === ConfirmationStatus.unprompted) {
          telemetryTracker.recordAwaitingConfirmation();
          return prompts.askForConfirmation({
            id: promptId,
            title: 'Enable resolution rule',
            message: `Enable the resolution rule "${params.ruleId}" in this space?`,
            confirm_text: 'Enable',
            cancel_text: 'Cancel',
            color: 'primary',
          });
        }

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: 'User declined to enable the resolution rule.' },
              },
            ],
          };
        }

        const rulesClient = entityStore.createResolutionRulesClient(savedObjectsClient, spaceId);
        const rule = await rulesClient.setEnabled(params.ruleId, true);

        telemetryTracker.recordResultCount(1);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: { rule },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        telemetryTracker.recordFailure(errorMessage);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error enabling resolution rule: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
