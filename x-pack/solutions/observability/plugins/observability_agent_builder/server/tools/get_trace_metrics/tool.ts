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
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';
import { OBSERVABILITY_GET_HOSTS_TOOL_ID, OBSERVABILITY_GET_SERVICES_TOOL_ID } from '..';

export const OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID = 'observability.get_trace_metrics';

const getTraceMetricsSchema = z.object({
  ...timeRangeSchemaRequired,
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'KQL filter to scope the data. Examples: \'service.name: "frontend"\', \'service.name: "checkout" AND transaction.name: "POST /api/cart"\', \'host.name: "web-*"\'.'
    ),
  groupBy: z
    .string()
    .default('service.name')
    .describe(
      'Field to group results by. Common fields: "service.name", "transaction.name", "host.name", "container.id". Use low-cardinality fields for meaningful aggregations.'
    ),
  latencyType: z
    .enum(['avg', 'p95', 'p99'])
    .describe('Aggregation type for latency metric.')
    .default('avg'),
  sortBy: z
    .enum(['latency', 'throughput', 'failureRate'])
    .describe('Metric to sort the results by.')
    .default('latency'),
});

export function createGetTraceMetricsTool({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getTraceMetricsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getTraceMetricsSchema> = {
    id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves trace metrics (throughput, failure rate, latency) for APM data with flexible filtering and grouping. 
        
Trace metrics are:
- Throughput: requests per minute
- Failure rate: percentage of failed transactions (0-1)
- Latency: average response time in milliseconds

Transaction types:
This tool includes ALL transaction types by default, unlike ${OBSERVABILITY_GET_SERVICES_TOOL_ID} which only shows the primary transaction type per service.
Default transaction types are: "request", "page-load", "mobile".
To filter by transaction type, use the kqlFilter parameter: kqlFilter='transaction.type: "request"'.

When to use this tool:
- After identifying an unhealthy service with the ${OBSERVABILITY_GET_SERVICES_TOOL_ID} tool, use this tool to drill down and find the root cause
- Analyze which specific transactions, hosts, or containers are causing performance issues
- Compare trace metrics across different dimensions (e.g., by transaction name, host, region)

When NOT to use this tool:
- For a high-level overview of all services, use the ${OBSERVABILITY_GET_SERVICES_TOOL_ID} tool instead
- For infrastructure metrics (CPU, memory, disk), use the ${OBSERVABILITY_GET_HOSTS_TOOL_ID} tool instead

Example workflow:
1. Call the ${OBSERVABILITY_GET_SERVICES_TOOL_ID} tool to identify a service with high latency
2. Call get_trace_metrics(kqlFilter='service.name: "frontend"', groupBy='transaction.name') to find which transaction is slow
3. Call get_trace_metrics(kqlFilter='service.name: "frontend" AND transaction.name: "POST /api/cart"', groupBy='host.name') to identify if specific hosts are affected

Returns an array of items with: group (the groupBy field value), latency (ms), throughput (rpm), failureRate (0-1).`,
    schema: getTraceMetricsSchema,
    tags: ['observability', 'services', 'trace', 'metrics'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { start, end, kqlFilter, groupBy = 'service.name', latencyType = 'avg', sortBy = 'latency' },
      context
    ) => {
      const { request } = context;

      try {
        const traceMetrics = await getToolHandler({
          core,
          plugins,
          request,
          logger,
          start,
          end,
          kqlFilter,
          groupBy,
          latencyType,
          sortBy,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: traceMetrics,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting trace metrics: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch trace metrics: ${error.message}`,
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
