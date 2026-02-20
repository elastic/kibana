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
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { OBSERVABILITY_GET_HOSTS_TOOL_ID } from '../get_hosts/tool';
import { OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID } from '../get_trace_metrics/tool';
import { getToolHandler, type RuntimeMetricsNode } from './handler';

export const OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID = 'observability.get_runtime_metrics';

export type GetRuntimeMetricsToolResult = OtherResult<{
  total: number;
  nodes: RuntimeMetricsNode[];
}>;

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };

const getRuntimeMetricsToolSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  serviceName: z
    .string()
    .optional()
    .describe('Filter to a specific service. If omitted, use kqlFilter to narrow results.'),
  serviceEnvironment: z
    .string()
    .optional()
    .describe(
      'The environment that the service is running in. Leave empty to query for all environments.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of service nodes to return'),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'KQL filter to narrow down results. Examples: "service.name: ad", "host.name: web-*".'
    ),
});

export function createGetRuntimeMetricsTool({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getRuntimeMetricsToolSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getRuntimeMetricsToolSchema> = {
    id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves runtime metrics for services, including CPU usage, memory consumption, thread counts, and GC duration.

Currently supports JVM (Java) metrics. Returns for each service node (application instance):
- Service name and node name
- Host name
- Runtime type (e.g., "jvm")
- CPU utilization (0-1, where 1 = 100%)
- Heap memory: used, max, and utilization (0-1)
- Non-heap memory: used, max, and utilization (0-1)
- Thread count
- GC duration (ms) - total garbage collection time

Filter using serviceName parameter or kqlFilter (e.g., "service.name: my-service").

When to use:
- Investigating high CPU usage in application services
- Diagnosing memory pressure or potential memory leaks
- Checking thread pool exhaustion or thread count spikes
- Understanding application resource consumption during performance issues
- Correlating latency issues with runtime resource saturation or GC pauses

When NOT to use:
- For non-JVM services (Node.js, Python, Go, etc.) - this tool will return empty results
- For host-level metrics (CPU, memory of the entire host) - use ${OBSERVABILITY_GET_HOSTS_TOOL_ID} instead
- For trace/transaction metrics - use ${OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID} instead`,
    schema: getRuntimeMetricsToolSchema,
    tags: ['observability', 'apm', 'runtime', 'metrics', 'jvm'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, context) => {
      const { serviceName, serviceEnvironment, start, end, limit, kqlFilter } = toolParams;
      const { request } = context;

      try {
        const { nodes } = await getToolHandler({
          core,
          plugins,
          request,
          logger,
          serviceName,
          limit,
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
        logger.error(`Error getting runtime metrics: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch runtime metrics: ${error.message}`,
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
