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

export const SECURITY_ENDPOINT_ACTION_HISTORY_TOOL_ID = securityTool(
  'endpoint_action_history'
);

const endpointActionHistorySchema = z.object({
  action: z
    .enum(['list', 'details', 'status'])
    .describe(
      'The action to perform. "list" returns the response action log with optional filters. "details" returns full details and output for a single action by ID. "status" returns pending action counts for agent(s).'
    ),
  action_id: z
    .string()
    .optional()
    .describe('The action ID for "details" action. Required for "details".'),
  agent_ids: z
    .array(z.string())
    .optional()
    .describe('Filter by agent IDs. Used in "list" and "status" actions.'),
  commands: z
    .array(z.string())
    .optional()
    .describe(
      'Filter by command types in "list" action. Values: "isolate", "unisolate", "kill-process", "suspend-process", "running-processes", "get-file", "execute", "upload", "scan".'
    ),
  statuses: z
    .array(z.string())
    .optional()
    .describe(
      'Filter by action statuses in "list" action. Values: "failed", "pending", "successful".'
    ),
  start_date: z
    .string()
    .optional()
    .describe('ISO 8601 or Date Math start date for "list" action.'),
  end_date: z
    .string()
    .optional()
    .describe('ISO 8601 or Date Math end date for "list" action.'),
  page: z.number().optional().describe('Page number for "list" action. Defaults to 1.'),
  page_size: z
    .number()
    .optional()
    .describe('Results per page for "list" action. Defaults to 10.'),
});

export const endpointActionHistoryTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof endpointActionHistorySchema> => {
  const getBaseUrl = () => {
    const { protocol, hostname, port } = core.http.getServerInfo();
    const basePath = core.http.basePath.serverBasePath;
    return `${protocol}://${hostname}:${port}${basePath}`;
  };

  return {
    id: SECURITY_ENDPOINT_ACTION_HISTORY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Retrieve Elastic Defend response action history and status. Use "list" to view past actions (isolate, kill-process, execute, etc.) with filters for agent, command type, status, and date range. Use "details" to get the full output and result of a specific action. Use "status" to check how many actions are pending for agent(s). This is a read-only tool.',
    schema: endpointActionHistorySchema,
    tags: ['security', 'endpoint', 'elastic-defend', 'action-history'],
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

        if (params.action === 'details') {
          if (!params.action_id) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: 'action_id is required for "details" action' },
                },
              ],
            };
          }

          const url = `${baseUrl}/api/endpoint/action/${encodeURIComponent(params.action_id)}`;
          const response = await fetch(url, { method: 'GET', headers });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to get action details: ${result.message || response.statusText}`,
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
          if (params.page_size !== undefined)
            searchParams.set('pageSize', String(params.page_size));
          if (params.start_date) searchParams.set('startDate', params.start_date);
          if (params.end_date) searchParams.set('endDate', params.end_date);

          if (params.agent_ids) {
            params.agent_ids.forEach((id) => searchParams.append('agentIds', id));
          }
          if (params.commands) {
            params.commands.forEach((cmd) => searchParams.append('commands', cmd));
          }
          if (params.statuses) {
            params.statuses.forEach((s) => searchParams.append('statuses', s));
          }

          const url = `${baseUrl}/api/endpoint/action?${searchParams.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to list actions: ${result.message || response.statusText}`,
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

        if (params.action === 'status') {
          const agentIds = params.agent_ids || [];
          if (agentIds.length === 0) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: 'agent_ids is required for "status" action' },
                },
              ],
            };
          }

          const searchParams = new URLSearchParams();
          agentIds.forEach((id) => searchParams.append('agent_ids', id));

          const url = `${baseUrl}/api/endpoint/action_status?${searchParams.toString()}`;
          const response = await fetch(url, { method: 'GET', headers });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to get action status: ${result.message || response.statusText}`,
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
        logger.error(`Error in endpoint_action_history tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error retrieving action history: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
