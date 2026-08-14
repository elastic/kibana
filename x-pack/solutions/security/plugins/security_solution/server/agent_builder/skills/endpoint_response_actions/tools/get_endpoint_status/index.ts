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
import {
  endpointNotFoundData,
  insufficientPrivilegesResult,
  MAX_HOSTNAME_LENGTH,
  responseActionErrorResult,
} from '../types';
import { createEndpointLookupService } from '../services/endpoint_lookup';

const getEndpointStatusSchema = z.object({
  hostName: z
    .string()
    .min(1)
    .max(MAX_HOSTNAME_LENGTH)
    .describe('The hostname of the endpoint to check status for.'),
});

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

        // Resolve hostname -> endpoint id + EDR vendor. The service handles
        // hostname escaping, space validation, and multi-vendor `agentType`
        // resolution in one place so every host-lookup tool behaves the same.
        const lookup = createEndpointLookupService(endpointAppContextService, spaceId);
        const resolved = await lookup.resolveByHostName(hostName);

        if (!resolved) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: endpointNotFoundData(hostName),
              },
            ],
          };
        }

        const { agentId } = resolved;

        // Get detailed status from endpoint metadata service
        const metadataService = endpointAppContextService.getEndpointMetadataService(spaceId);
        const hostInfo = await metadataService.getHostMetadataList({
          page: 0,
          pageSize: 1,
          kuery: `agent.id: ${escapeKuery(agentId)}`,
        });

        if (!hostInfo.data?.length) {
          // Agent exists in Fleet but no metadata document was found (index
          // missing or agent filtered out). Return a not-found result rather
          // than reporting stale defaults as a successful lookup.
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: endpointNotFoundData(hostName),
              },
            ],
          };
        }

        const hostMetadata = hostInfo.data[0];
        const isolated = Boolean(hostMetadata.metadata.Endpoint?.state?.isolation);
        const lastSeen = hostMetadata.last_checkin || null;
        const status = hostMetadata.host_status || HostStatus.OFFLINE;

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
        return responseActionErrorResult(
          'unknown_error',
          `Error retrieving endpoint status: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  };
};
