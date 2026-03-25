/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';

const responseActionsSchema = z.object({
  action: z
    .enum(['isolate', 'release', 'kill_process', 'suspend_process'])
    .describe(
      'The response action to execute: isolate (isolate host from network), release (release host from isolation), kill_process (terminate a running process), suspend_process (suspend a running process)'
    ),
  endpoint_id: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9-]+$/, 'Endpoint ID must contain only alphanumeric characters and hyphens')
    .describe('The unique identifier of the endpoint agent to execute the action on'),
  parameters: z
    .object({
      process_pid: z
        .number()
        .optional()
        .describe(
          'The PID of the process to kill or suspend. Required for kill_process and suspend_process actions'
        ),
      comment: z
        .string()
        .max(1000)
        .optional()
        .describe('An optional comment describing the reason for the response action'),
    })
    .optional()
    .describe('Optional parameters for the response action'),
});

export const SECURITY_RESPONSE_ACTIONS_TOOL_ID = securityTool('response_actions');

export const responseActionsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  endpointAppContextService: EndpointAppContextService
): BuiltinToolDefinition<typeof responseActionsSchema> => {
  return {
    id: SECURITY_RESPONSE_ACTIONS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Execute response actions on endpoints including host isolation, process termination, and process suspension. Requires the calling user to have endpoint response action privileges.',
    schema: responseActionsSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ action, endpoint_id: endpointId, parameters }, { spaceId }) => {
      logger.debug(
        `${SECURITY_RESPONSE_ACTIONS_TOOL_ID} tool called with action: ${action}, endpoint_id: ${endpointId}`
      );

      try {
        // Validate that process actions include a PID
        if (
          (action === 'kill_process' || action === 'suspend_process') &&
          parameters?.process_pid === undefined
        ) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: `The ${action} action requires a process_pid parameter`,
                },
              },
            ],
          };
        }

        const responseActionsClient =
          endpointAppContextService.getInternalResponseActionsClient({
            spaceId,
            username: 'agent-builder',
          });

        const baseRequestBody = {
          endpoint_ids: [endpointId],
          comment: parameters?.comment ?? 'Executed by AI SOC Agent',
        };

        let result;
        switch (action) {
          case 'isolate':
            result = await responseActionsClient.isolate(baseRequestBody);
            break;
          case 'release':
            result = await responseActionsClient.release(baseRequestBody);
            break;
          case 'kill_process':
            result = await responseActionsClient.killProcess({
              ...baseRequestBody,
              parameters: { pid: parameters!.process_pid! },
            });
            break;
          case 'suspend_process':
            result = await responseActionsClient.suspendProcess({
              ...baseRequestBody,
              parameters: { pid: parameters!.process_pid! },
            });
            break;
        }

        logger.debug(
          `Response action ${action} submitted for endpoint ${endpointId}, action id: ${result.id}`
        );

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                success: true,
                action,
                action_id: result.id,
                endpoint_id: endpointId,
                status: result.status,
                started_at: result.startedAt,
                is_completed: result.isCompleted,
                comment: parameters?.comment ?? null,
                ...(parameters?.process_pid ? { process_pid: parameters.process_pid } : {}),
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${SECURITY_RESPONSE_ACTIONS_TOOL_ID} tool: ${errorMessage}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error executing response action: ${errorMessage}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'response-actions', 'endpoint'],
  };
};
