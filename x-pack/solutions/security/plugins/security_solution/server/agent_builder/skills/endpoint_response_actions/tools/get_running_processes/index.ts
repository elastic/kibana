/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { RUNNING_PROCESSES_TOOL_ID } from '../..';

const getRunningProcessesSchema = z.object({
  hostName: z
    .string()
    .min(1)
    .describe('The hostname of the endpoint to list running processes for.'),
  comment: z
    .string()
    .min(1)
    .optional()
    .describe('An optional comment explaining why the process list is being retrieved.'),
});

/**
 * Read-only inspection action: retrieves the list of running processes from an
 * enrolled Elastic Defend host. Read-only actions do not require a human
 * confirmation step (see the skill system instructions).
 */
export const getRunningProcessesTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: RUNNING_PROCESSES_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the list of running processes from a host by its hostname. This is a read-only inspection action dispatched through the Elastic Defend Response Actions service; it does not modify the endpoint.`,
    schema: getRunningProcessesSchema,
    handler: async (params, { logger, request }) => {
      try {
        const hostName = params.hostName as string;
        const comment = params.comment as string | undefined;
        const spaceId = DEFAULT_SPACE_ID;
        // Attribute the action to the initiating analyst (falls back to the
        // default system user when the current user cannot be resolved) so the
        // Response Actions audit trail records who requested it, not `elastic`.
        const username = endpointAppContextService.getCurrentUsername(request);
        const responseActionsClient = endpointAppContextService.getInternalResponseActionsClient({
          spaceId,
          username,
          agentType: 'endpoint',
        });

        // The response actions API needs endpoint_ids, not host names.
        const fleetServices = endpointAppContextService.getInternalFleetServices(spaceId);
        const agent = fleetServices.agent;
        const agents = await agent.listAgents({
          showInactive: true,
          kuery: `local_metadata.host.name: ${hostName}`,
          page: 1,
          perPage: 1,
        });

        if (!agents?.agents?.length) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  hostName,
                  found: false,
                  reason: 'endpoint_not_found' as const,
                  message: `No endpoint found with hostname '${hostName}'.`,
                },
              },
            ],
          };
        }

        const endpointIds = agents.agents.map((a) => a.id);

        const actionDetails = await responseActionsClient.runningProcesses(
          {
            endpoint_ids: endpointIds,
            comment: comment ?? `Running processes requested via AI agent: ${hostName}`,
          },
          { hosts: { [endpointIds[0]]: { name: hostName } } }
        );

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                hostName,
                found: true,
                actionId: actionDetails.id,
                status: actionDetails.status,
                wasSuccessful: actionDetails.wasSuccessful,
                hosts: actionDetails.hosts,
                outputs: actionDetails.outputs,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error retrieving running processes: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
