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
import { escapeKuery } from '@kbn/es-query';
import { HostStatus } from '../../../../../../common/endpoint/types';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { GET_ENDPOINT_STATUS_TOOL_ID } from '../..';
import { insufficientPrivilegesResult } from '../types';

const getEndpointStatusSchema = z.object({
  hostName: z.string().min(1).describe('The hostname of the endpoint to check status for.'),
});

/**
 * Builds a consistent "endpoint not found" result object.
 */
function notFoundResult(hostName: string): Record<string, unknown> {
  return {
    kind: 'response_action_result' as const,
    hostName,
    found: false,
    reason: 'endpoint_not_found' as const,
    status: HostStatus.OFFLINE,
    isolated: false,
    lastSeen: null,
    message: `No endpoint found with hostname '${hostName}'.`,
  };
}

export const getEndpointStatusTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: GET_ENDPOINT_STATUS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the current status of a host by its hostname, including whether it is isolated, its last seen time, and online/offline status.`,
    schema: getEndpointStatusSchema,
    handler: async (params, { logger, request, spaceId }) => {
      try {
        const hostName = params.hostName as string;

        // The endpoint metadata detail route gates this behind
        // `withEndpointAuthz({ any: ['canReadSecuritySolution', 'canAccessFleet'] })`
        // (`server/endpoint/routes/metadata/index.ts`). The internal fleet and
        // metadata services skip that check, so assert the caller's privilege
        // here before resolving or reporting on a host.
        const authz = await endpointAppContextService.getEndpointAuthz(request);
        if (!authz.canReadSecuritySolution && !authz.canAccessFleet) {
          return insufficientPrivilegesResult('canReadSecuritySolution');
        }

        // Resolve hostname to endpoint IDs via fleet agent service.
        // `hostName` is user/LLM-controlled, so escape it before interpolating
        // into the KQL expression.
        const fleetServices = endpointAppContextService.getInternalFleetServices(spaceId);
        const agentClient = fleetServices.agent;
        const agents = await agentClient.listAgents({
          showInactive: true,
          kuery: `local_metadata.host.name: ${escapeKuery(hostName)}`,
          page: 1,
          perPage: 1,
        });

        if (!agents?.agents?.length) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: notFoundResult(hostName),
              },
            ],
          };
        }

        const agent = agents.agents[0];
        const agentId = agent.id;

        // Ensure the resolved agent belongs to the caller's active space before
        // reporting on it, so a hostname collision cannot leak status from a
        // host in another space.
        await fleetServices.ensureInCurrentSpace({ agentIds: [agentId] });

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
          } else {
            // Agent exists in fleet but no metadata document was found (index
            // missing or agent filtered out). Return a not-found result rather
            // than reporting stale defaults as a successful lookup.
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: notFoundResult(hostName),
                },
              ],
            };
          }
        } catch (metadataError) {
          logger.warn(`Could not retrieve metadata for host ${hostName}: ${metadataError.message}`);
          // Fallback to agent-level info
          isolated = Boolean((agent as unknown as { isolation?: string }).isolation);
          lastSeen = agent.last_checkin ?? null;
          status =
            (agent as unknown as { host_status?: HostStatus }).host_status || HostStatus.OFFLINE;
        }

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                kind: 'response_action_result' as const,
                action: 'get-endpoint-status' as const,
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
