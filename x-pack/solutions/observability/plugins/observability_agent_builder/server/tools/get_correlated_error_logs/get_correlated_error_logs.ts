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
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { indexDescription, timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { parseDatemath } from '../../utils/time';
import { DEFAULT_TIME_RANGE } from './constants';
import { fetchErrorAnchors } from './fetch_error_anchors';
import { fetchCorrelatedLogs } from './fetch_correlated_logs';

export const OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID =
  'observability.get_correlated_error_logs';

const getCorrelatedErrorLogsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().describe(indexDescription).optional(),
  terms: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Optional field filters to narrow down results. Each key-value pair filters logs where the field exactly matches the value. Example: { "service.name": "payment", "host.name": "web-server-01" }. Multiple filters are combined with AND logic.'
    ),
  errorSeverityFilter: z
    .any()
    .optional()
    .describe(
      'Optional custom Elasticsearch query filter to define what constitutes an "error". Use this to target specific error codes, types, or messages (e.g., { term: { "error.code": "500" } }). If omitted, a comprehensive default filter matching standard severity levels (e.g., log.level=ERROR, HTTP 5xx) is used.'
    ),
  correlationFields: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of field names to use for correlating logs. Use this when the user mentions a specific identifier (e.g., "group by session_id"). Overrides the default list of standard trace/request IDs. The first field in this list found with a value in an error log will be used to fetch the surrounding context.'
    ),
});

export function createGetCorrelatedErrorLogsTool({
  core,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  logger: Logger;
}): StaticToolRegistration<typeof getCorrelatedErrorLogsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getCorrelatedErrorLogsSchema> = {
    id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves error logs and their surrounding context based on shared correlation identifiers. Returns chronologically sorted groups of logs, providing visibility into the sequence of events leading up to and following an error. Custom filters for defining "errors" and specifying correlation fields are supported.`,
    schema: getCorrelatedErrorLogsSchema,
    tags: ['observability', 'logs'],
    handler: async (
      {
        start = DEFAULT_TIME_RANGE.start,
        end = DEFAULT_TIME_RANGE.end,
        terms,
        index,
        errorSeverityFilter,
        correlationFields,
      },
      { esClient }
    ) => {
      try {
        const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
        const startTime = parseDatemath(start);
        const endTime = parseDatemath(end, { roundUp: true });

        const errorAnchors = await fetchErrorAnchors({
          esClient,
          logsIndices,
          startTime,
          endTime,
          terms,
          errorSeverityFilter,
          correlationFields,
          logger,
        });

        // For each error, find surrounding logs with matching tracing identifier
        const correlatedLogs = await Promise.all(
          errorAnchors.map(async (errorAnchor) => {
            return fetchCorrelatedLogs({ esClient, errorAnchor, logsIndices, logger });
          })
        );

        return {
          results: [{ type: ToolResultType.other, data: { correlatedLogs } }],
        };
      } catch (error) {
        logger.error(`Error fetching errors and surrounding logs: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch errors and surrounding logs: ${error.message}`,
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
