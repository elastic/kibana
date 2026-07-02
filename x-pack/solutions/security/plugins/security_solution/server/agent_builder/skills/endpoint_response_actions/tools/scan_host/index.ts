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
import { SCAN_TOOL_ID } from '../..';

const scanHostSchema = z.object({
  hostName: z.string().min(1).describe('The hostname of the endpoint to scan for malware.'),
  path: z
    .string()
    .min(1)
    .describe('The absolute file or folder path on the endpoint to scan for malware.'),
  comment: z
    .string()
    .min(1)
    .optional()
    .describe('An optional comment explaining why the scan is being performed.'),
});

/**
 * Malware scan action. `scan` only detects malware on the provided path using
 * the endpoint's existing Elastic Defend policy — it does not execute or modify
 * anything on the host. It is nonetheless classified as a write action and
 * therefore always requires an explicit human confirmation step before the
 * skill dispatches it (see the skill system instructions).
 */
export const scanHostTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: SCAN_TOOL_ID,
    type: ToolType.builtin,
    description: `Scans a file or folder path on a host for malware using the endpoint's existing Elastic Defend policy. The action is dispatched through the Elastic Defend Response Actions service. Requires explicit analyst confirmation before dispatch.`,
    schema: scanHostSchema,
    handler: async (params, { logger }) => {
      try {
        const hostName = params.hostName as string;
        const path = params.path as string;
        const comment = params.comment as string | undefined;
        const spaceId = DEFAULT_SPACE_ID;
        const responseActionsClient = endpointAppContextService.getInternalResponseActionsClient({
          spaceId,
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

        const actionDetails = await responseActionsClient.scan(
          {
            endpoint_ids: endpointIds,
            comment: comment ?? `Malware scan requested via AI agent: ${hostName}`,
            parameters: { path },
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
                path,
                actionId: actionDetails.id,
                status: actionDetails.status,
                wasSuccessful: actionDetails.wasSuccessful,
                hosts: actionDetails.hosts,
                comment,
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
                message: `Error scanning host: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
