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
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_APPLICATION_METRICS_TOOL_ID =
  'observability.get_application_metrics';

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };

const getApplicationMetricsToolSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  serviceName: z.string().min(1).describe('The name of the service'),
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
      'KQL filter to narrow down results. Examples: "host.name: web-*", "service.node.name: instance-1".'
    ),
});

export function createGetApplicationMetricsTool({
  core,
  dataRegistry,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
}): StaticToolRegistration<typeof getApplicationMetricsToolSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getApplicationMetricsToolSchema> = {
    id: OBSERVABILITY_GET_APPLICATION_METRICS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves application-level runtime metrics for a service, including CPU usage, memory consumption, and thread counts.

Currently supports JVM (Java) metrics. Returns for each service node (application instance):
- Node name and host
- CPU utilization (0-1, where 1 = 100%)
- Heap memory used (bytes)
- Non-heap memory used (bytes)
- Thread count

When to use:
- Investigating high CPU usage in an application service
- Diagnosing memory pressure or potential memory leaks
- Checking thread pool exhaustion or thread count spikes
- Understanding application resource consumption during performance issues
- Correlating latency issues with runtime resource saturation

When NOT to use:
- For host-level metrics (CPU, memory of the entire host) - use ${OBSERVABILITY_GET_HOSTS_TOOL_ID} instead
- For trace/transaction metrics - use observability.get_trace_metrics instead`,
    schema: getApplicationMetricsToolSchema,
    tags: ['observability', 'apm', 'application', 'metrics', 'jvm'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, context) => {
      const { serviceName, serviceEnvironment, start, end, kqlFilter } = toolParams;
      const { request } = context;

      try {
        const { nodes } = await getToolHandler({
          request,
          dataRegistry,
          serviceName,
          serviceEnvironment,
          start,
          end,
          kqlFilter,
        });

        const total = nodes?.length ?? 0;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total,
                nodes,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting application metrics: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch application metrics: ${error.message}`,
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
