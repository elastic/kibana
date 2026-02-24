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

export const SECURITY_RULE_EXECUTION_HISTORY_TOOL_ID = securityTool(
  'get_rule_execution_history'
);

const ruleExecutionHistorySchema = z.object({
  rule_id: z
    .string()
    .describe(
      'The saved object ID (UUID) of the detection rule to retrieve execution history for.'
    ),
  start: z
    .string()
    .optional()
    .describe(
      'ISO 8601 datetime for the start of the time range. Defaults to 24 hours ago.'
    ),
  end: z
    .string()
    .optional()
    .describe('ISO 8601 datetime for the end of the time range. Defaults to now.'),
  status_filters: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of execution statuses to filter by. Valid values: "going to run", "running", "partial failure", "failed", "succeeded".'
    ),
  sort_field: z
    .enum([
      'timestamp',
      'duration_ms',
      'gap_duration_s',
      'indexing_duration_ms',
      'search_duration_ms',
      'schedule_delay_ms',
    ])
    .optional()
    .describe('Field to sort results by. Defaults to "timestamp".'),
  sort_order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Sort direction. Defaults to "desc".'),
  page: z.number().optional().describe('Page number. Defaults to 1.'),
  per_page: z
    .number()
    .optional()
    .describe('Results per page. Defaults to 20.'),
});

export const ruleExecutionHistoryTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof ruleExecutionHistorySchema> => {
  return {
    id: SECURITY_RULE_EXECUTION_HISTORY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Retrieve execution history for a detection rule in Elastic Security. Returns per-execution results including status, duration, alert counts (new/active/recovered), search and indexing metrics, gap information, and schedule delay. Useful for monitoring rule health, diagnosing failures, and understanding detection coverage gaps.',
    schema: ruleExecutionHistorySchema,
    tags: ['security', 'detection', 'rule-monitoring', 'siem'],
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

        const { protocol, hostname, port } = core.http.getServerInfo();
        const basePath = core.http.basePath.serverBasePath;
        const baseUrl = `${protocol}://${hostname}:${port}${basePath}`;

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const searchParams = new URLSearchParams({
          start: params.start || twentyFourHoursAgo.toISOString(),
          end: params.end || now.toISOString(),
          sort_field: params.sort_field || 'timestamp',
          sort_order: params.sort_order || 'desc',
          page: String(params.page || 1),
          per_page: String(params.per_page || 20),
        });

        if (params.status_filters) {
          searchParams.set('status_filters', params.status_filters);
        }

        const url = `${baseUrl}/internal/detection_engine/rules/${encodeURIComponent(params.rule_id)}/execution/results?${searchParams.toString()}`;

        logger.debug(`Fetching execution history for rule ${params.rule_id}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true',
            'elastic-api-version': '1',
            'x-elastic-internal-origin': 'kibana',
            Authorization: authHeader as string,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          logger.error(
            `Failed to get rule execution history: ${JSON.stringify(result)}`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Failed to get execution history: ${result.message || response.statusText}`,
                  statusCode: response.status,
                  details: result,
                },
              },
            ],
          };
        }

        const executions = result.events || [];
        const summary = {
          total: result.total || executions.length,
          succeeded: executions.filter(
            (e: { status: string }) => e.status === 'succeeded'
          ).length,
          failed: executions.filter(
            (e: { status: string }) => e.status === 'failed'
          ).length,
          partial_failure: executions.filter(
            (e: { status: string }) => e.status === 'partial failure'
          ).length,
        };

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                rule_id: params.rule_id,
                summary,
                executions,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in get_rule_execution_history tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error retrieving rule execution history: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
