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

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { LIST_ENDPOINTS_TOOL_ID } from '../..';
import type { HostInfo } from '../types';
import {
  insufficientPrivilegesResult,
  MAX_HOSTNAME_FILTER_LENGTH,
  responseActionErrorResult,
} from '../types';

const listEndpointsSchema = z.object({
  hostNameFilter: z
    .string()
    .max(MAX_HOSTNAME_FILTER_LENGTH)
    .optional()
    .describe(
      'Optional hostname substring to filter results. Only endpoints whose hostname contains this value will be returned.'
    ),
});

export const listEndpointsTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: LIST_ENDPOINTS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Lists endpoints enrolled with Elastic Defend that response actions can be executed on. Returns hostname, status, isolation state, OS, and last seen time for each endpoint.',
    schema: listEndpointsSchema,
    handler: async (params, { logger, request, spaceId }) => {
      try {
        // The endpoint metadata list route gates this behind `canReadSecuritySolution`
        // (`server/endpoint/routes/metadata/index.ts`). The internal metadata service
        // skips that check, so assert the caller's privilege here before enumerating
        // enrolled endpoints.
        const authz = await endpointAppContextService.getEndpointAuthz(request);
        if (!authz.canReadSecuritySolution) {
          return insufficientPrivilegesResult('canReadSecuritySolution');
        }

        const metadataService = endpointAppContextService.getEndpointMetadataService(spaceId);

        // `hostNameFilter` is user/LLM-controlled, so escape it before
        // interpolating into the KQL wildcard expression.
        const kuery = params.hostNameFilter
          ? `united.endpoint.host.hostname: *${escapeKuery(params.hostNameFilter as string)}*`
          : undefined;

        const hostInfo = await metadataService.getHostMetadataList({
          page: 0,
          // Return up to 50 endpoints (broader than single-host lookups).
          // The agent can refine with hostNameFilter if the list is too long.
          pageSize: 50,
          ...(kuery ? { kuery } : {}),
        });

        const endpoints = (hostInfo.data ?? []).map((entry: HostInfo) => {
          const metadata = entry.metadata;
          const host = metadata?.host;
          const os = host?.os;
          const agent = metadata?.agent;
          const endpointState = metadata?.Endpoint?.state;

          const osLabel =
            os?.name && os?.version ? `${os.name} ${os.version}` : os?.name || 'Unknown';

          return {
            hostName: host?.hostname || 'unknown',
            agentId: agent?.id || 'unknown',
            status: entry.host_status || 'offline',
            isolated: Boolean(endpointState?.isolation),
            os: osLabel,
            lastSeen: entry.last_checkin || null,
          };
        });

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                kind: 'response_action_result' as const,
                action: 'list-endpoints' as const,
                endpoints,
                total: hostInfo.total ?? 0,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return responseActionErrorResult(
          'unknown_error',
          `Error listing endpoints: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };
};
