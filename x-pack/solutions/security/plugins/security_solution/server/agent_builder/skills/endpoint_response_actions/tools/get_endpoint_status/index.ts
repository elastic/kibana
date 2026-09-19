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
  agentId: z
    .string()
    .min(1)
    .max(MAX_HOSTNAME_LENGTH)
    .optional()
    .describe(
      'The endpoint/agent ID, when the hostname resolves to more than one endpoint. Pass it with the hostName to select one specific host; omit it otherwise.'
    ),
});

export const getEndpointStatusTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: GET_ENDPOINT_STATUS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the current status of a host by its hostname, including whether it is isolated, its last seen time, and online/offline status. When several endpoints share the hostname, pass the endpoint's agent ID to select one.`,
    schema: getEndpointStatusSchema,
    handler: async (params, { logger, request, spaceId }) => {
      try {
        const hostName = params.hostName as string;
        const requestedAgentId = params.agentId as string | undefined;

        // The endpoint metadata detail route gates this behind
        // `withEndpointAuthz({ any: ['canReadSecuritySolution', 'canAccessFleet'] })`
        // (`server/endpoint/routes/metadata/index.ts`). The internal fleet and
        // metadata services skip that check, so assert the caller's privilege
        // here before resolving or reporting on a host.
        const authz = await endpointAppContextService.getEndpointAuthz(request);
        if (!authz.canReadSecuritySolution && !authz.canAccessFleet) {
          return insufficientPrivilegesResult('canReadSecuritySolution');
        }

        const scoped = await endpointAppContextService.asScoped(request);

        let agentId = requestedAgentId;

        if (!agentId) {
          // Resolve hostname -> endpoint id + EDR vendor. The service handles
          // hostname escaping, space validation, and multi-vendor `agentType`
          // resolution in one place so every host-lookup tool behaves the same.
          const lookup = createEndpointLookupService(endpointAppContextService, spaceId, scoped);
          const resolved = await lookup.resolveByHostName(hostName);

          if (resolved.kind === 'not_found') {
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

          if (resolved.kind === 'ambiguous') {
            // Either two live agents share this hostname, or more agent
            // records match it than the lookup examined. Picking one would
            // report the wrong machine's status, so ask for an agent ID —
            // which this tool accepts as `agentId`, making the instruction
            // something the model can actually carry out.
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    kind: 'response_action_result' as const,
                    action: 'get-endpoint-status' as const,
                    hostName,
                    found: false,
                    reason: 'ambiguous_hostname' as const,
                    candidates: resolved.candidates,
                    ...(resolved.truncated
                      ? {
                          truncated: true as const,
                          totalCandidates: resolved.totalCandidates,
                        }
                      : {}),
                    message: resolved.truncated
                      ? `More endpoints match the hostname "${hostName}" than could be examined, so it cannot be resolved to a single host. Ask the analyst which agent ID they mean, then call this tool again with that agentId.`
                      : `Multiple online endpoints share the hostname "${hostName}". Ask the analyst which agent ID they mean, then call this tool again with that agentId.`,
                  },
                },
              ],
            };
          }

          agentId = resolved.endpoint.agentId;
        }

        // Get detailed status from endpoint metadata service. `scoped` (built
        // above for the lookup) is threaded through so this read also fans out
        // to linked projects under CPS. When the caller supplied an agent ID
        // the read is scoped by that id alone — the metadata query is filtered
        // to the policies visible in this space, so an agent from another
        // space stays invisible here just as it does in `list_endpoints`.
        const metadataService = endpointAppContextService.getEndpointMetadataService(spaceId);
        const hostInfo = await metadataService.getHostMetadataList(
          {
            page: 0,
            pageSize: 1,
            kuery: `agent.id: ${escapeKuery(agentId)}`,
          },
          scoped
        );

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
