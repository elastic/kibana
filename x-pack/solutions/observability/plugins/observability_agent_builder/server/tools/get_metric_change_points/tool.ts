/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import { getMetricsIndices } from '../../utils/get_metrics_indices';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID =
  'observability.get_metric_change_points';

const getMetricChangePointsSchema = z.object({
  ...timeRangeSchemaRequired,
  name: z
    .string()
    .describe(
      'A descriptive label for the metric change point analysis, e.g. "Error Rate" or "Latency P95". Used to identify results in the output.'
    ),
  index: z.string().describe('The index or index pattern to find the metrics').optional(),
  kqlFilter: z
    .string()
    .describe('A KQL filter to filter the metric documents, e.g.: my_field:foo')
    .optional(),
  field: z
    .string()
    .describe(
      `Optional numeric field to aggregate and observe for changes (e.g., 'transaction.duration.us'). REQUIRED when 'aggregationType' is 'avg', 'sum', 'min', 'max', 'p95', or 'p99'.`
    )
    .optional(),
  aggregationType: z
    .enum(['count', 'avg', 'sum', 'min', 'max', 'p95', 'p99'])
    .describe('The aggregation to apply to the specified field. Required when a field is provided.')
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
    description: `Analyzes metrics to detect statistically significant changes like spikes and dips, in specific metric patterns.

How it works:
It uses the "auto_date_histogram" aggregation to group metrics by time and then detects change points (spikes/dips) within each time bucket.`,
    schema: getMetricChangePointsSchema,
    tags: ['observability', 'metrics'],
    handler: async (
      { start, end, name, index, kqlFilter, field, aggregationType = 'count', groupBy },
      { esClient }
    ) => {
      try {
        const metricIndexPatterns = await getMetricsIndices({ core, plugins, logger });

        const topMetricChangePoints = await getToolHandler({
          esClient,
          start,
          end,
          name,
          index: index || metricIndexPatterns.join(','),
          kqlFilter,
          field,
          aggregationType,
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
