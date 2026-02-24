/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

export const SECURITY_ENDPOINT_STATUS_TOOL_ID = securityTool('endpoint_status');

const endpointStatusSchema = z.object({
  action: z
    .enum(['list', 'get', 'agent_status'])
    .describe(
      'The action to perform. "list" returns all managed endpoints with optional filters. "get" returns metadata for a single endpoint by agent ID. "agent_status" returns health/status summary for specific agent(s).'
    ),
  agent_id: z
    .string()
    .optional()
    .describe('The agent ID for "get" action. Required for "get".'),
  agent_ids: z
    .array(z.string())
    .optional()
    .describe(
      'Array of agent IDs for "agent_status" action, or to filter "list" results.'
    ),
  page: z.number().optional().describe('Page number for "list" action. Defaults to 0.'),
  page_size: z
    .number()
    .optional()
    .describe('Results per page for "list" action. Defaults to 10, max 100.'),
  host_statuses: z
    .array(z.enum(['healthy', 'offline', 'updating', 'inactive', 'unenrolled']))
    .optional()
    .describe('Filter endpoints by host status in "list" action.'),
  kuery: z
    .string()
    .optional()
    .describe(
      'KQL filter for "list" action. Example: "united.endpoint.host.hostname:SRVWIN01*" or "united.endpoint.host.os.name:Windows".'
    ),
});

export const endpointStatusTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof endpointStatusSchema> => {
  const getBaseUrl = () => {
    const { protocol, hostname, port } = core.http.getServerInfo();
    const basePath = core.http.basePath.serverBasePath;
    return `${protocol}://${hostname}:${port}${basePath}`;
  };

  return {
    id: SECURITY_ENDPOINT_STATUS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Query Elastic Defend endpoint status and metadata. Use "list" to find all managed endpoints (hostname, OS, policy, agent health). Use "get" for detailed metadata on a single endpoint by agent ID. Use "agent_status" to check if endpoints are online and healthy. This is a read-only tool.',
    schema: endpointStatusSchema,
    tags: ['security', 'endpoint', 'elastic-defend', 'metadata'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (params, { request }) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: 'No authorization header found on the request' },
              },
            ],
          };
        }

        const baseUrl = getBaseUrl();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
          Authorization: authHeader as string,
        };

        if (params.action === 'get') {
          if (!params.agent_id) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: 'agent_id is required for "get" action' },
                },
              ],
            };
          }

          const url = `${baseUrl}/api/endpoint/metadata/${encodeURIComponent(params.agent_id)}`;
          const response = await fetch(url, { method: 'GET', headers });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to get endpoint: ${result.message || response.statusText}`,
                    statusCode: response.status,
                  },
                },
              ],
            };
          }

          return {
            results: [{ type: ToolResultType.other, data: result }],
          };
        }

        if (params.action === 'list') {
          const searchParams = new URLSearchParams();
          if (params.page !== undefined) searchParams.set('page', String(params.page));
          if (params.page_size !== undefined) searchParams.set('pageSize', String(params.page_size));
          if (params.host_statuses) {
            params.host_statuses.forEach((s) => searchParams.append('hostStatuses', s));
          }
          if (params.kuery) searchParams.set('kuery', params.kuery);
          if (params.agent_ids) {
            params.agent_ids.forEach((id) => searchParams.append('agentIds', id));
          }

          const qs = searchParams.toString();
          const url = `${baseUrl}/api/endpoint/metadata${qs ? `?${qs}` : ''}`;
          const response = await fetch(url, {
            method: 'GET',
            headers,
          });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to list endpoints: ${result.message || response.statusText}`,
                    statusCode: response.status,
                  },
                },
              ],
            };
          }

          const summary = {
            total: result.total ?? result.data?.length ?? 0,
            endpoints: (result.data || []).map(
              (ep: {
                host_status: string;
                metadata: {
                  agent: { id: string };
                  host: { hostname: string; os: { name: string; full: string } };
                  Endpoint: { policy: { applied: { name: string; status: string } } };
                };
              }) => ({
                agent_id: ep.metadata?.agent?.id,
                hostname: ep.metadata?.host?.hostname,
                os: ep.metadata?.host?.os?.name,
                os_full: ep.metadata?.host?.os?.full,
                status: ep.host_status,
                policy_name: ep.metadata?.Endpoint?.policy?.applied?.name,
                policy_status: ep.metadata?.Endpoint?.policy?.applied?.status,
              })
            ),
          };

          return {
            results: [{ type: ToolResultType.other, data: summary }],
          };
        }

        if (params.action === 'agent_status') {
          const agentIds = params.agent_ids || (params.agent_id ? [params.agent_id] : []);
          if (agentIds.length === 0) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: 'agent_ids or agent_id is required for "agent_status" action',
                  },
                },
              ],
            };
          }

          const searchParams = new URLSearchParams();
          agentIds.forEach((id) => searchParams.append('agentIds', id));

          const url = `${baseUrl}/internal/api/endpoint/agent_status?${searchParams.toString()}`;
          const response = await fetch(url, {
            method: 'GET',
            headers: { ...headers, 'x-elastic-internal-origin': 'kibana', 'elastic-api-version': '1' },
          });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to get agent status: ${result.message || response.statusText}`,
                    statusCode: response.status,
                  },
                },
              ],
            };
          }

          return {
            results: [{ type: ToolResultType.other, data: result }],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Unknown action: ${params.action}` },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in endpoint_status tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Error querying endpoint status: ${error.message}` },
            },
          ],
        };
      }
    },
  };
};
