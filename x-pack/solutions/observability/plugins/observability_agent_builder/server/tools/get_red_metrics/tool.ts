/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';
import { OBSERVABILITY_GET_HOSTS_TOOL_ID, OBSERVABILITY_GET_SERVICES_TOOL_ID } from '..';

export const OBSERVABILITY_GET_RED_METRICS_TOOL_ID = 'observability.get_red_metrics';

const getRedMetricsSchema = z.object({
  ...timeRangeSchemaRequired,
  filter: z
    .string()
    .optional()
    .describe(
      'KQL filter to scope the data. Examples: \'service.name: "frontend"\', \'service.name: "checkout" AND transaction.name: "POST /api/cart"\', \'host.name: "web-*"\'.'
    ),
  groupBy: z
    .string()
    .optional()
    .describe(
      'Field to group results by. Common fields: "service.name", "transaction.name", "host.name", "container.id", "service.version", "cloud.region". If not specified, results are grouped by service.name.'
    ),
});

export function createGetRedMetricsTool({
  core,
  dataRegistry,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
}): StaticToolRegistration<typeof getRedMetricsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getRedMetricsSchema> = {
    id: OBSERVABILITY_GET_RED_METRICS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves RED metrics (Rate, Errors, Duration) for APM data with flexible filtering and grouping. 
        
RED metrics are:
- Rate (throughput): requests per minute
- Errors (failure rate): percentage of failed transactions (0-1)
- Duration (latency): average response time in milliseconds

Transaction types:
This tool includes ALL transaction types by default, unlike ${OBSERVABILITY_GET_SERVICES_TOOL_ID} which only shows the primary transaction type per service.
Default transaction types are: "request", "page-load", "mobile".
To filter by transaction type, use the filter parameter: filter='transaction.type: "request"'.

When to use this tool:
- After identifying an unhealthy service with the ${OBSERVABILITY_GET_SERVICES_TOOL_ID} tool, use this tool to drill down and find the root cause
- Analyze which specific transactions, hosts, or containers are causing performance issues
- Compare RED metrics across different dimensions (e.g., by transaction name, host, region)

When NOT to use this tool:
- For a high-level overview of all services, use the ${OBSERVABILITY_GET_SERVICES_TOOL_ID} tool instead
- For infrastructure metrics (CPU, memory, disk), use the ${OBSERVABILITY_GET_HOSTS_TOOL_ID} tool instead

Example workflow:
1. Call the ${OBSERVABILITY_GET_SERVICES_TOOL_ID} tool to identify a service with high latency
2. Call get_red_metrics(filter='service.name: "frontend"', groupBy='transaction.name') to find which transaction is slow
3. Call get_red_metrics(filter='service.name: "frontend" AND transaction.name: "POST /api/cart"', groupBy='host.name') to identify if specific hosts are affected

Returns an array of items with: group (the groupBy field value), latency (ms), throughput (rpm), failureRate (0-1).`,
    schema: getRedMetricsSchema,
    tags: ['observability', 'services', 'metrics'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ start, end, filter, groupBy }, context) => {
      const { request } = context;

      try {
        const { items } = await getToolHandler({
          request,
          dataRegistry,
          start,
          end,
          filter,
          groupBy,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                items,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting RED metrics: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch RED metrics: ${error.message}`,
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
