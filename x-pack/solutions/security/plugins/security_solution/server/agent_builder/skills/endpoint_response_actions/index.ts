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
  LIST_ENDPOINTS_PAGE_SIZE,
  MAX_HOSTNAME_FILTER_LENGTH,
  responseActionErrorResult,
} from '../types';

/**
 * ES `from + size` cannot exceed `max_result_window` (10,000). Pages beyond
 * this bound would make the underlying search throw, so they are rejected
 * with a typed error instead.
 */
export const MAX_LIST_ENDPOINTS_PAGE = 199;

const listEndpointsSchema = z.object({
  hostNameFilter: z
    .string()
    .max(MAX_HOSTNAME_FILTER_LENGTH)
    .optional()
    .describe(
      'Optional hostname substring to filter results. Only endpoints whose hostname contains this value will be returned.'
    ),
  page: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      `Zero-based page of results to fetch (default 0). Each page holds up to ${LIST_ENDPOINTS_PAGE_SIZE} endpoints; when the response reports \`hasMore: true\`, request the next page to continue.`
    ),
});

export const listEndpointsTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool<typeof listEndpointsSchema> => {
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
          ? `united.endpoint.host.hostname: *${escapeKuery(params.hostNameFilter)}*`
          : undefined;

        const page = params.page ?? 0;

        if (page > MAX_LIST_ENDPOINTS_PAGE) {
          return responseActionErrorResult(
            'invalid_argument',
            `The endpoint inventory is capped at the first ${
              (MAX_LIST_ENDPOINTS_PAGE + 1) * LIST_ENDPOINTS_PAGE_SIZE
            } endpoints. Narrow the list with the hostNameFilter once a hostname is known instead of paging further.`
          );
        }

        // Request-scoped services so this read fans out to linked projects
        // under CPS. Without them the query is origin-only and a deployment
        // with cross-project search silently reports an origin-only `total`
        // as the visible inventory.
        const scoped = await endpointAppContextService.asScoped(request);

        const hostInfo = await metadataService.getHostMetadataList(
          {
            page,
            // One page of results. The response reports `total`/`hasMore` so the
            // caller can walk further pages instead of silently losing hosts
            // beyond the first page.
            pageSize: LIST_ENDPOINTS_PAGE_SIZE,
            ...(kuery ? { kuery } : {}),
          },
          scoped
        );

        const endpoints = (hostInfo.data ?? []).map((entry: HostInfo) => {
          const metadata = entry.metadata;
          const host = metadata?.host;
          const os = host?.os;
          const agent = metadata?.agent;
          const endpointState = metadata?.Endpoint?.state;
          const appliedPolicy = metadata?.Endpoint?.policy?.applied;

          const osLabel =
            os?.name && os?.version ? `${os.name} ${os.version}` : os?.name || 'Unknown';

          return {
            hostName: host?.hostname || 'unknown',
            agentId: agent?.id || 'unknown',
            status: entry.host_status || 'offline',
            isolated: Boolean(endpointState?.isolation),
            os: osLabel,
            lastSeen: entry.last_checkin || null,
            // The endpoint's applied integration policy, so the agent can give
            // the policy context this tool advertises.
            policy:
              appliedPolicy?.name || appliedPolicy?.id
                ? {
                    name: appliedPolicy?.name || null,
                    id: appliedPolicy?.id || null,
                  }
                : null,
          };
        });

        const total = hostInfo.total ?? 0;

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                kind: 'response_action_result' as const,
                action: 'list-endpoints' as const,
                endpoints,
                total,
                page,
                pageSize: LIST_ENDPOINTS_PAGE_SIZE,
                // Report truncation explicitly: the agent must not treat a
                // partial page as the complete inventory.
                hasMore: page * LIST_ENDPOINTS_PAGE_SIZE + endpoints.length < total,
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
