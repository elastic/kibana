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
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID =
  'observability.get_trace_change_points';

const getTraceChangePointsSchema = z.object({
  ...timeRangeSchemaRequired,
  kqlFilter: z
    .string()
    .describe(
      'Optional KQL query to filter the trace documents. Examples: trace.id:"abc123", service.name:"my-service"'
    )
    .optional(),
  groupBy: z
    .string()
    .describe(
      `Field to group results by. Use only low-cardinality fields. Using many fields or high-cardinality fields can cause a large number of groups and severely impact performance. Common fields to group by include: 
- Service level: 'service.name', 'service.environment', 'service.version'
- Transaction level: 'transaction.name', 'transaction.type'
- Infrastructure level: 'host.name', 'container.id', 'kubernetes.pod.name' 
`
    )
    .optional(),
  latencyType: z
    .enum(['avg', 'p95', 'p99'])
    .describe('Aggregation type for latency change points analysis. default is avg.')
    .optional(),
});

export function createGetTraceChangePointsTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof getTraceChangePointsSchema> = {
    id: OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes traces to detect statistically significant change points in latency, throughput, and failure rate across group (e.g., service, transaction, host).
Trace metrics:
- Latency: avg/p95/p99 response time.
- Throughput: requests per minute.
- Failure rate: percentage of failed transactions.

Supports optional KQL filtering

When to use:
- Detecting significant changes in trace behavior (spike, dip, step change, trend change, distribution change, stationary/non‑stationary, indeterminable) and identifying when they occur.
`,
    schema: getTraceChangePointsSchema,
    tags: ['observability', 'traces'],
    handler: async (
      { start, end, kqlFilter, groupBy = 'service.name', latencyType = 'avg' },
      { request }
    ) => {
      try {
        const changePoints = await getToolHandler({
          core,
          plugins,
          request,
          logger,
          start,
          end,
          kqlFilter,
          groupBy,
          latencyType,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                changePoints,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting trace change points: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error getting trace change points: ${error.message}`,
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
