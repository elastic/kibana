/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/onechat-server';
import type { Logger } from '@kbn/core/server';
import { runLogRateAnalysis } from '@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis_for_alert';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis/window_parameters';
import { parseDatemath } from '../../utils/time';
import { timeRangeSchemaRequired, indexDescription } from '../../utils/tool_schemas';

export const OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID = 'observability.run_log_rate_analysis';

const logRateAnalysisSchema = z.object({
  index: z.string().describe(indexDescription),
  timeFieldName: z
    .string()
    .describe(
      'Timestamp field used to build the baseline/deviation windows. Defaults to `@timestamp`.'
    )
    .optional(),
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
  logger,
}: {
  logger: Logger;
}): StaticToolRegistration<typeof logRateAnalysisSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof logRateAnalysisSchema> = {
    id: OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes log rate changes by comparing a baseline time window to a deviation time window. Identifies significant spikes or dips in log volume and correlates them with specific field values.`,
    schema: logRateAnalysisSchema,
    tags: ['observability', 'logs'],
    handler: async (
      { index, timeFieldName = '@timestamp', baseline, deviation, searchQuery },
      context
    ) => {
      try {
        const esClient = context.esClient.asCurrentUser;

        const windowParameters: WindowParameters = {
          baselineMin: parseDatemath(baseline.start),
          baselineMax: parseDatemath(baseline.end, { roundUp: true }),
          deviationMin: parseDatemath(deviation.start),
          deviationMax: parseDatemath(deviation.end, { roundUp: true }),
        };

        const response = await runLogRateAnalysis({
          esClient,
          arguments: {
            index,
            windowParameters,
            timefield: timeFieldName,
            searchQuery: searchQuery ?? { match_all: {} },
          },
        });
        logger.debug(
          `Log rate analysis tool (index: "${index}") found ${response.significantItems.length} items of type ${response.logRateAnalysisType}.`
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                analysisType: response.logRateAnalysisType,
                items: response.significantItems,
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
