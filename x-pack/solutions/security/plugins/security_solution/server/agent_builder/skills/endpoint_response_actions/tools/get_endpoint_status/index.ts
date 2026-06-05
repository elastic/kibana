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
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { HostStatus } from '../../../../../../common/endpoint/types';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { GET_ENDPOINT_STATUS_TOOL_ID } from '../..';

const getEndpointStatusSchema = z.object({
  hostName: z.string().min(1).describe('The hostname of the endpoint to check status for.'),
});

export const getEndpointStatusTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: GET_ENDPOINT_STATUS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the current status of a host by its hostname, including whether it is isolated, its last seen time, and online/offline status.`,
    schema: getEndpointStatusSchema,
    handler: async (params, { logger }) => {
      try {
        const { hostName } = params;
        const spaceId = DEFAULT_SPACE_ID;

        // Resolve hostname to endpoint IDs via fleet agent service
        const fleetServices = endpointAppContextService.getInternalFleetServices(spaceId);
        const agentService = fleetServices.agentService.asInternalUser;
        const agents = await agentService.list({
          kuery: `host.name: ${hostName}`,
          page: 1,
          perPage: 1,
        });

        if (!agents?.items?.length) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  hostName,
                  found: false,
                  status: HostStatus.OFFLINE,
                  isolated: false,
                  lastSeen: null,
                  message: `No endpoint found with hostname '${hostName}'.`,
                },
              },
            ],
          };
        }

        const agent = agents.items[0];
        const agentId = agent.id;

        // Get detailed status from endpoint metadata service
        const metadataService = endpointAppContextService.getEndpointMetadataService(spaceId);

        // Try to get metadata for this specific agent
        let isolated = false;
        let lastSeen: string | null = null;
        let status = HostStatus.OFFLINE;

        try {
          const hostInfo = await metadataService.getHostMetadataList({
            page: 0,
            pageSize: 1,
            kuery: `agent.id: ${agentId}`,
          });

          if (hostInfo.data?.length) {
            const hostMetadata = hostInfo.data[0];
            isolated = Boolean(hostMetadata.metadata.Endpoint?.state?.isolation);
            lastSeen = hostMetadata.last_checkin || null;
            status = hostMetadata.host_status || HostStatus.OFFLINE;
          }
        } catch (metadataError) {
          logger.warn(`Could not retrieve metadata for host ${hostName}: ${metadataError.message}`);
          // Fallback to agent-level info
          isolated = Boolean(agent.isolation);
          lastSeen = agent.last_checkin ?? null;
          status = agent.host_status || HostStatus.OFFLINE;
        }

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                hostName,
                agentId,
                found: true,
                status,
                isolated,
                lastSeen,
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
                message: `Error retrieving endpoint status: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
