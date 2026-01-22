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
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import { getMetricsIndices } from '../../utils/get_metrics_indices';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID =
  'observability.get_metric_change_points';

const getMetricChangePointsSchema = z.object({
  ...timeRangeSchemaRequired,
  index: z.string().describe('The index or index pattern to find the metrics').optional(),
  kqlFilter: z
    .string()
    .describe('A KQL filter to filter the metric documents, e.g.: my_field:foo')
    .optional(),
  aggregation: z
    .object({
      field: z
        .string()
        .describe(
          `Numeric field to aggregate and observe for changes (e.g., 'transaction.duration.us').`
        ),
      type: z
        .enum(['avg', 'sum', 'min', 'max', 'p95', 'p99'])
        .describe('Aggregation to apply to the specified field.'),
    })
    .optional(),
  groupBy: z
    .array(z.string())
    .describe(
      `Optional keyword fields to break down metrics by to identify which specific group experienced a change.
Use only low-cardinality fields. Using many fields or high-cardinality fields can cause a large number of groups and severely impact performance.
Examples: ['service.name', 'service.version'], ['service.name', 'host.name'], ['cloud.availability_zone']
`
    )
    .optional(),
});

export function createGetMetricChangePointsTool({
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
  const toolDefinition: BuiltinToolDefinition<typeof getMetricChangePointsSchema> = {
    id: OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Detects statistically significant changes in metrics across groups (e.g., by service, host, or custom fields).

When to use:
- Detecting significant changes in metric values (spike, dip, step change, trend change, distribution change, stationary/non‑stationary, indeterminable) and identifying when they occur.
`,
    schema: getMetricChangePointsSchema,
    tags: ['observability', 'metrics'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ start, end, index, kqlFilter, aggregation, groupBy = [] }, { esClient }) => {
      try {
        const metricIndexPatterns = await getMetricsIndices({ core, plugins, logger });

        const topMetricChangePoints = await getToolHandler({
          esClient,
          start,
          end,
          index: index || metricIndexPatterns.join(','),
          kqlFilter,
          aggregation,
          groupBy,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                changePoints: topMetricChangePoints,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting metric change points: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error getting metric change points: ${error.message}`,
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
