/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { timeRangeSchemaRequired, indexDescription } from '../../utils/tool_schemas';
import { getToolHandler } from './handler';

export const OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID = 'observability.run_log_rate_analysis';

const logRateAnalysisSchema = z.object({
  index: z.string().describe(indexDescription),
  timeFieldName: z
    .string()
    .default('@timestamp')
    .describe('Timestamp field used to build the baseline/deviation windows.'),
  baseline: z
    .object(timeRangeSchemaRequired)
    .describe(
      'Time range representing "normal" behavior that the deviation window will be compared against.'
    ),
  deviation: z
    .object(timeRangeSchemaRequired)
    .describe('Time range representing the time period with unusual behavior.'),
  searchQuery: z
    .record(z.any())
    .describe(
      'Optional Elasticsearch query DSL filter that limits which documents are analyzed. Defaults to a match_all query.'
    )
    .optional(),
});

export function createRunLogRateAnalysisTool({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): StaticToolRegistration<typeof logRateAnalysisSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof logRateAnalysisSchema> = {
    id: OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes which log fields or message patterns correlate with changes in log throughput (spikes or drops).

When to use:
- Log volume suddenly increased or decreased and you want to know WHY
- Identifying which services, hosts, or error types are driving a spike
- Correlating throughput changes to specific log categories or field values
- Answering "what changed?" when looking at log rate anomalies

How it works:
Compares a baseline time window to a deviation window and performs statistical correlation analysis to find fields/patterns associated with the change.

Do NOT use for:
- Understanding the sequence of events for a specific error (use get_correlated_logs)
- Getting a general overview of log types (use get_log_groups)
- Investigating individual log entries or transactions`,
    schema: logRateAnalysisSchema,
    tags: ['observability', 'logs'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, context) => {
      const { index, timeFieldName, baseline, deviation, searchQuery } = toolParams;

      try {
        const esClient = context.esClient.asCurrentUser;

        const { analysisType, items } = await getToolHandler({
          esClient,
          logger,
          index,
          timeFieldName,
          baseline,
          deviation,
          searchQuery,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                analysisType,
                items,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Log rate analysis tool failed: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: error.message,
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
