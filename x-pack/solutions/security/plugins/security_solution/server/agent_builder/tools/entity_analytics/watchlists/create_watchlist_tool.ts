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
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { WatchlistConfigClient } from '../../../../lib/entity_analytics/watchlists/management/watchlist_config';
import { getUserWatchlistPrivileges } from '../../../../lib/entity_analytics/watchlists/management/get_user_watchlist_privileges';
import { getAgentBuilderResourceAvailability } from '../../../utils/get_agent_builder_resource_availability';
import { securityTool } from '../../constants';
import { formatRiskModifier, riskModifierSchema } from './risk_modifier';

const DEFAULT_RISK_MODIFIER = 1.5;

const schema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      'The watchlist name. Use the user\'s exact wording when they named the watchlist, e.g. "Privileged Users" or "Compromised Accounts".'
    ),
  description: z
    .string()
    .optional()
    .describe(
      'Optional short description of the watchlist\'s purpose. Include this when the user supplied context, e.g. "Sensitive accounts under continuous review".'
    ),
  riskModifier: riskModifierSchema
    .optional()
    .describe(
      `Optional risk score multiplier for entities on this watchlist. Allowed values: 0, 0.5, 1, 1.5, or 2 (steps of 0.5). 0 = scores zeroed out, 1 = no change, 2 = doubled. Defaults to ${DEFAULT_RISK_MODIFIER}; only pass a value when the user explicitly asks for a different multiplier.`
    ),
});

export const SECURITY_CREATE_WATCHLIST_TOOL_ID = securityTool('create_watchlist');

export const createWatchlistTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_CREATE_WATCHLIST_TOOL_ID,
    type: ToolType.builtin,
    description: `Create a new Entity Analytics watchlist in the current space. Requires user confirmation before the watchlist is created. Returns the created watchlist's id, name, description, and risk modifier.

Use this tool when the user explicitly asks to create a new watchlist (e.g. "create a watchlist called X", "make a new watchlist for Y", "add a watchlist named Z").

Do NOT use this tool to add entities to an existing watchlist — that is a separate action.`,
    schema,
    tags: ['security', 'entity-analytics', 'watchlists'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }: ToolAvailabilityContext) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status !== 'available') {
            return availability;
          }
          if (!experimentalFeatures.entityAnalyticsWatchlistEnabled) {
            return {
              status: 'unavailable',
              reason: 'Entity Analytics watchlists are not enabled.',
            };
          }
          return { status: 'available' };
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check ${SECURITY_CREATE_WATCHLIST_TOOL_ID} availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async (
      params,
      { spaceId, esClient, savedObjectsClient, request, prompts, callContext }
    ) => {
      logger.debug(
        `${SECURITY_CREATE_WATCHLIST_TOOL_ID} tool called with parameters ${JSON.stringify(params)}`
      );

      try {
        const [, startPlugins] = await core.getStartServices();
        const { security } = startPlugins;

        const privileges = await getUserWatchlistPrivileges(request, security, spaceId);
        if (!privileges.has_write_permissions) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: 'You do not have permission to create watchlists in this space.',
                },
              },
            ],
          };
        }

        const riskModifier = params.riskModifier ?? DEFAULT_RISK_MODIFIER;

        const promptId = `manage_watchlists.create_watchlist.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);

        if (status === ConfirmationStatus.unprompted) {
          const detailLines = [
            `**Name:** ${params.name}`,
            ...(params.description ? [`**Description:** ${params.description}`] : []),
            `**Risk modifier:** ${formatRiskModifier(riskModifier)}`,
          ];
          return prompts.askForConfirmation({
            id: promptId,
            title: 'Create watchlist',
            message: `Create a new watchlist with these settings?\n\n${detailLines.join('\n')}`,
            confirm_text: 'Create',
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
                data: { message: 'User declined to create the watchlist.' },
              },
            ],
          };
        }

        const client = new WatchlistConfigClient({
          soClient: savedObjectsClient,
          esClient: esClient.asCurrentUser,
          internalEsClient: esClient.asInternalUser,
          namespace: spaceId,
          logger,
        });

        const watchlist = await client.create({
          name: params.name,
          description: params.description,
          riskModifier,
          managed: false,
        });

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: { watchlist },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error creating watchlist: ${errorMessage}` },
            },
          ],
        };
      }
    },
  };
};
