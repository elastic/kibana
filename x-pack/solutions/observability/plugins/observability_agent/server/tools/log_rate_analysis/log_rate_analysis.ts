/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { fetchLogRateAnalysisForAlert } from '@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis_for_alert';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis/window_parameters';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';

export const OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID = 'observability.run_log_rate_analysis';

const dateRangeSchema = z.object({
  from: z
    .string()
    .describe('Start of the time window expressed with Elastic date math. Example: `now-15m`'),
  to: z
    .string()
    .describe('End of the time window expressed with Elastic date math. Example: `now`.'),
});

const logRateAnalysisSchema = z.object({
  index: z
    .string()
    .describe(
      'Concrete index, data stream, or alias to analyze (for example `logs-payments.api-default`).'
    ),
  timeFieldName: z
    .string()
    .describe(
      'Timestamp field used to build the baseline/deviation windows. Defaults to `@timestamp`.'
    )
    .optional(),
  baseline: dateRangeSchema.describe(
    'Time range representing "normal" behavior that the deviation window will be compared against.'
  ),
  deviation: dateRangeSchema.describe(
    'Time range representing the time period with unusual behavior.'
  ),
});

export function createRunLogRateAnalysisTool({
  core: _core,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  logger: Logger;
}): StaticToolRegistration<typeof logRateAnalysisSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof logRateAnalysisSchema> = {
    id: OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Explain log spikes or dips by comparing two time windows (baseline vs deviation) and letting Kibana\'s log rate analysis surface the most significant field/value cohorts and categorized messages. Use this whenever you need to answer "what changed in the logs?" for a given index.',
    schema: logRateAnalysisSchema,
    tags: ['observability', 'logs'],
    handler: async ({ index, timeFieldName = '@timestamp', baseline, deviation }, context) => {
      try {
        const esClient = context.esClient.asCurrentUser;

        const windowParameters: WindowParameters = {
          baselineMin: parseDate(baseline.from),
          baselineMax: parseDate(baseline.to, { roundUp: true }),
          deviationMin: parseDate(deviation.from),
          deviationMax: parseDate(deviation.to, { roundUp: true }),
        };

        const deviationDurationMs = windowParameters.deviationMax - windowParameters.deviationMin;
        const intervalMinutes = Math.max(1, Math.round(deviationDurationMs / 60000));

        const response = await fetchLogRateAnalysisForAlert({
          esClient,
          arguments: {
            index,
            alertStartedAt: new Date(windowParameters.deviationMax).toISOString(),
            alertRuleParameterTimeSize: intervalMinutes,
            alertRuleParameterTimeUnit: 'm',
            timefield: timeFieldName,
            searchQuery: {
              match_all: {},
            },
          },
        });
        logger.debug(
          `Log rate analysis tool (${index}) found ${response.significantItems.length} items of type ${response.logRateAnalysisType}.`
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
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Log rate analysis tool failed: ${message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}

function parseDate(value: string, options?: Parameters<typeof datemath.parse>[1]) {
  return datemath.parse(value, options)?.valueOf() ?? 0;
}
