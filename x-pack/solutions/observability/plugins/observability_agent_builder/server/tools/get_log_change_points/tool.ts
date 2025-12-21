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
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID = 'observability.get_log_change_points';

const getLogChangePointsSchema = z.object({
  ...timeRangeSchemaRequired,
  logs: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            'A descriptive label for the log change point analysis, e.g. "Error Logs" or "API Requests". Used to identify results in the output.'
          ),
        index: z.string().describe('The index or index pattern to find the logs').optional(),
        kqlFilter: z
          .string()
          .describe('A KQL filter to filter the log documents, e.g.: my_field:foo')
          .optional(),
        field: z
          .string()
          .describe(
            'The text field that contains the message to be analyzed, usually `message`. ONLY use field names from the conversation.'
          )
          .optional(),
      })
    )
    .describe(
      'Analyze changes in log patterns. If no index is given, the default logs index pattern will be used'
    ),
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
    description: `Analyzes log messages to detect statistically significant changes like spikes and dips, in specific log patterns.

How it works:
It uses the "categorize_text" aggregation to group similar unstructured messages into categories and then detects change points (spikes/dips) within each cateogory.`,
    schema: getLogChangePointsSchema,
    tags: ['observability', 'logs'],
    handler: async ({ start, end, logs = [] }, { esClient }) => {
      try {
        const allLogChangePoints = await getToolHandler({
          core,
          logger,
          esClient,
          start,
          end,
          logs,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                changePoints: {
                  logs: allLogChangePoints,
                },
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
