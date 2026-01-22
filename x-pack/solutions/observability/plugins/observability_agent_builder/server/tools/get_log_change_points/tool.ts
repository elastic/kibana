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
import { getLogsIndices } from '../../utils/get_logs_indices';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID = 'observability.get_log_change_points';

const getLogChangePointsSchema = z.object({
  ...timeRangeSchemaRequired,
  index: z.string().describe('The index or index pattern to find the logs').optional(),
  kqlFilter: z
    .string()
    .describe(
      'A KQL query to filter the log documents. Examples: level:error, service.name:"my-service"'
    )
    .optional(),
  messageField: z
    .string()
    .describe(
      'The unstructured text field to run the categorize_text aggregation on. This groups similar logs into patterns. Defaults to message'
    )
    .optional(),
});

export function createGetLogChangePointsTool({
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
  const toolDefinition: BuiltinToolDefinition<typeof getLogChangePointsSchema> = {
    id: OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes logs to detect statistically significant changes in log message patterns over time.

When to use:
- Detecting significant changes in log message categories (spike, dip, step change, trend change, distribution change, stationary/non‑stationary, indeterminable) and identifying when they occur.

How it works:
Uses "categorize_text" aggregation to group similar unstructured messages into patterns, then detects change points (spikes, dips, trend changes) within each category.`,
    schema: getLogChangePointsSchema,
    tags: ['observability', 'logs'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ start, end, index, kqlFilter, messageField = 'message' }, { esClient }) => {
      try {
        const logIndexPatterns = await getLogsIndices({ core, logger });

        const topLogChangePoints = await getToolHandler({
          esClient,
          start,
          end,
          index: index || logIndexPatterns.join(','),
          kqlFilter,
          messageField,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                changePoints: topLogChangePoints,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting log change points: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error getting log change points: ${error.message}`,
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
