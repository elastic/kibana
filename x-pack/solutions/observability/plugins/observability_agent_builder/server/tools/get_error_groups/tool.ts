/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import type { OtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';
import { OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID } from '../get_log_categories/tool';
import { OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID } from '../get_correlated_logs/tool';

export const OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID = 'observability.get_error_groups';

export type GetErrorGroupsToolResult = OtherResult<{
  apmErrorGroups: {
    total: number;
    groups: Array<{
      groupId: string;
      name: string;
      lastSeen: number;
      occurrences: number;
      culprit: string | undefined;
      handled: boolean | undefined;
      type: string | undefined;
      traceId: string | undefined;
    }>;
  };
  otelExceptionGroups: {
    total: number;
    groups: Array<{
      exceptionType: string;
      occurrences: number;
      lastSeen: number;
      sample: Record<string, unknown> | undefined;
    }>;
  };
}>;

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };

const getErrorGroupsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  serviceName: z
    .string()
    .optional()
    .describe('Filter by service name. Examples: "payment-service", "order-service".'),
  serviceEnvironment: z
    .string()
    .optional()
    .describe(
      'The environment that the service is running in. Leave empty to query for all environments.'
    ),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'KQL filter to narrow down errors. Examples: \'host.name: "web-server-01"\', \'exception.type: "NullPointerException"\'.'
    ),
});

export function createGetErrorGroupsTool({
  core,
  dataRegistry,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
}): StaticToolRegistration<typeof getErrorGroupsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getErrorGroupsSchema> = {
    id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves error groups from APM errors and OTel exceptions, grouped by error type.

When to use:
- Identifying what exceptions and errors are occurring in services
- Getting a breakdown of error types and their frequencies
- Answering "what errors are being thrown?" rather than "what's being logged?"
- Investigating application errors with structured exception data (type, message, stack trace)

How it works:
- Returns APM error groups (using pre-computed error.grouping_key)
- Returns OTel exception groups (grouped by exception.type)
- Each group includes occurrence count, last seen timestamp, and sample details

After using this tool:
- For errors with trace IDs, use \`${OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID}\` to see the sequence of events leading to the error
- Compare error patterns across services to identify root cause vs symptoms
- Look for common exception types like "NullPointerException", "TimeoutException", "ConnectionRefused"

Do NOT use for:
- Analyzing general log messages (use \`${OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID}\`)
- Log pattern analysis (use \`${OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID}\`)
- Investigating specific traces (use \`${OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID}\`)`,
    schema: getErrorGroupsSchema,
    tags: ['observability', 'errors', 'apm', 'exceptions'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, context) => {
      const { serviceName, serviceEnvironment, start, end, kqlFilter } = toolParams;
      const { request, esClient } = context;

      try {
        const { apmErrorGroups, otelExceptionGroups, totalApmErrors, totalOtelExceptions } =
          await getToolHandler({
            core,
            request,
            esClient,
            dataRegistry,
            logger,
            serviceName,
            serviceEnvironment,
            start,
            end,
            kqlFilter,
          });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                apmErrorGroups: {
                  total: totalApmErrors,
                  groups: apmErrorGroups,
                },
                otelExceptionGroups: {
                  total: totalOtelExceptions,
                  groups: otelExceptionGroups,
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching error groups: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch error groups: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
