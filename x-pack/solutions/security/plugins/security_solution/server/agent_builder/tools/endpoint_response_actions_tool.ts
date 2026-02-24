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

export const SECURITY_ENDPOINT_RESPONSE_ACTIONS_TOOL_ID = securityTool(
  'endpoint_response_actions'
);

const INITIAL_WAIT_MS = 2_000;
const CHECK_INTERVAL_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 120_000;

const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const endpointResponseActionsSchema = z.object({
  action: z
    .enum([
      'isolate',
      'unisolate',
      'kill_process',
      'suspend_process',
      'get_processes',
      'execute',
      'get_file',
      'scan',
    ])
    .describe(
      'The response action to perform. IMPORTANT: For destructive actions (isolate, unisolate, kill_process, suspend_process, execute, get_file, scan), you MUST present a confirmation summary to the user and wait for approval before calling this tool. Only "get_processes" may be called autonomously.'
    ),
  endpoint_ids: z
    .array(z.string())
    .describe(
      'Array of endpoint agent IDs to target. Get these from the endpoint_status tool or from alert data (agent.id field).'
    ),
  comment: z
    .string()
    .optional()
    .describe(
      'Optional comment explaining why the action is being taken. Recommended for audit trail.'
    ),
  parameters: z
    .string()
    .optional()
    .describe(
      'JSON string of action-specific parameters. Required for: kill_process ({"pid":"123"} or {"entity_id":"..."}), suspend_process (same), execute ({"command":"ls -la /tmp","timeout":600}), get_file ({"path":"/etc/passwd"}), scan ({"path":"/tmp/suspicious"}).'
    ),
});

const ACTION_ROUTES: Record<string, string> = {
  isolate: '/api/endpoint/action/isolate',
  unisolate: '/api/endpoint/action/unisolate',
  kill_process: '/api/endpoint/action/kill_process',
  suspend_process: '/api/endpoint/action/suspend_process',
  get_processes: '/api/endpoint/action/running_procs',
  execute: '/api/endpoint/action/execute',
  get_file: '/api/endpoint/action/get_file',
  scan: '/api/endpoint/action/scan',
};

export const endpointResponseActionsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof endpointResponseActionsSchema> => {
  const getBaseUrl = () => {
    const { protocol, hostname, port } = core.http.getServerInfo();
    const basePath = core.http.basePath.serverBasePath;
    return `${protocol}://${hostname}:${port}${basePath}`;
  };

  const getHeaders = (authHeader: string): Record<string, string> => ({
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true',
    'elastic-api-version': '2023-10-31',
    Authorization: authHeader,
  });

  const pollForCompletion = async ({
    actionId,
    baseUrl,
    headers,
  }: {
    actionId: string;
    baseUrl: string;
    headers: Record<string, string>;
  }): Promise<{ completed: boolean; details: Record<string, unknown> }> => {
    const detailsUrl = `${baseUrl}/api/endpoint/action/${encodeURIComponent(actionId)}`;
    const deadline = Date.now() + DEFAULT_TIMEOUT_MS;

    await waitMs(INITIAL_WAIT_MS);

    while (Date.now() < deadline) {
      try {
        const response = await fetch(detailsUrl, { method: 'GET', headers });
        if (response.ok) {
          const result = await response.json();
          const actionDetails = result.data || result;

          if (actionDetails.isCompleted) {
            return { completed: true, details: actionDetails };
          }
        }
      } catch {
        // Non-fatal: retry on next interval
      }

      await waitMs(CHECK_INTERVAL_MS);
    }

    try {
      const response = await fetch(detailsUrl, { method: 'GET', headers });
      if (response.ok) {
        const result = await response.json();
        return { completed: (result.data || result).isCompleted ?? false, details: result.data || result };
      }
    } catch {
      // Fall through
    }

    return { completed: false, details: { id: actionId } };
  };

  return {
    id: SECURITY_ENDPOINT_RESPONSE_ACTIONS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Execute response actions on Elastic Defend endpoints. Supports: isolate (network-isolate a host), unisolate (release from isolation), kill_process, suspend_process, get_processes (list running processes), execute (run a command), get_file (retrieve a file), scan (scan a path). The tool automatically waits up to 120 seconds for the action to complete and returns the result including any output data. If the action times out, the security.endpoint_action_history tool can be used with the returned action_id to check status later. IMPORTANT: All actions except get_processes are DESTRUCTIVE. You MUST present a confirmation summary to the user and receive explicit approval before executing destructive actions.',
    schema: endpointResponseActionsSchema,
    tags: ['security', 'endpoint', 'elastic-defend', 'response-actions'],
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
        const route = ACTION_ROUTES[params.action];
        const url = `${baseUrl}${route}`;
        const headers = getHeaders(authHeader as string);

        const body: Record<string, unknown> = {
          endpoint_ids: params.endpoint_ids,
        };

        if (params.comment) {
          body.comment = params.comment;
        }

        if (params.parameters) {
          try {
            body.parameters = JSON.parse(params.parameters);
          } catch {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: 'Invalid JSON in parameters field' },
                },
              ],
            };
          }
        }

        logger.debug(
          `Executing endpoint response action: ${params.action} on ${params.endpoint_ids.length} endpoint(s)`
        );

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!response.ok) {
          logger.error(
            `Failed to execute endpoint response action ${params.action}: ${JSON.stringify(result)}`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Failed to execute ${params.action}: ${result.message || response.statusText}`,
                  statusCode: response.status,
                  details: result,
                },
              },
            ],
          };
        }

        const actionId = result.data?.id || result.action;
        if (!actionId) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  success: true,
                  action: params.action,
                  endpoint_ids: params.endpoint_ids,
                  response: result,
                  note: 'Action submitted but no action ID returned for status tracking.',
                },
              },
            ],
          };
        }

        logger.debug(
          `Action ${params.action} submitted (id: ${actionId}), polling for completion...`
        );

        const { completed, details } = await pollForCompletion({
          actionId,
          baseUrl,
          headers,
        });

        if (completed) {
          const wasSuccessful = details.wasSuccessful ?? false;
          logger.debug(
            `Action ${params.action} (id: ${actionId}) completed: ${wasSuccessful ? 'success' : 'failure'}`
          );
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  success: wasSuccessful,
                  action: params.action,
                  action_id: actionId,
                  endpoint_ids: params.endpoint_ids,
                  status: 'completed',
                  details,
                },
              },
            ],
          };
        }

        logger.debug(
          `Action ${params.action} (id: ${actionId}) still pending after ${DEFAULT_TIMEOUT_MS / 1000}s timeout`
        );
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                action: params.action,
                action_id: actionId,
                endpoint_ids: params.endpoint_ids,
                status: 'pending',
                message: `Action submitted and still in progress after ${DEFAULT_TIMEOUT_MS / 1000}s. Use the security.endpoint_action_history tool with action "details" and action_id "${actionId}" to check the result later.`,
                details,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in endpoint_response_actions tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Error executing response action: ${error.message}` },
            },
          ],
        };
      }
    },
  };
};
