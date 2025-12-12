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
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { indexDescription, timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { parseDatemath } from '../../utils/time';
import {
  DEFAULT_CORRELATION_IDENTIFIER_FIELDS,
  DEFAULT_ERROR_SEVERITY_FILTER,
  DEFAULT_TIME_RANGE,
} from './constants';
import { fetchAnchorLogs } from './fetch_error_anchors';
import { getCorrelatedLogsForAnchor } from './get_correlated_logs_for_anchor';

export const OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID = 'observability.get_correlated_logs';

const getCorrelatedLogsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().describe(indexDescription).optional(),
  logId: z
    .string()
    .optional()
    .describe(
      'Optional ID of a specific log entry. If provided, the tool will fetch this log and find correlated logs based on its correlation identifier (e.g., trace.id). This takes precedence over time range and other filters for finding the anchor log.'
    ),
  termsFilter: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Optional field filters to narrow down results. Each key-value pair filters logs where the field exactly matches the value. Example: { "service.name": "payment", "host.name": "web-server-01" }. Multiple filters are combined with AND logic. Ignored if logId is provided.'
    ),
  // query: z
  //   .record(z.string(), z.unknown())
  //   .optional()
  //   .describe(
  //     'Optional Elasticsearch DSL query filter to define what constitutes an "error". Use this to target specific error codes, types, or messages (e.g., { term: { "error.code": "500" } }). If omitted, a comprehensive default filter matching standard severity levels (e.g., log.level=ERROR, HTTP 5xx) is used. Ignored if logId is provided.'
  //   ),
  correlationFields: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of field names to use for correlating logs. Use this when the user mentions a specific identifier (e.g., "group by session_id"). Overrides the default list of standard trace/request IDs. The first field in this list found with a value in an error log will be used to fetch the surrounding context.'
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of fields to return for each log entry. If not provided, the full log document is returned.'
    ),
});

export function createGetCorrelatedLogsTool({
  core,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  logger: Logger;
}): StaticToolRegistration<typeof getCorrelatedLogsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getCorrelatedLogsSchema> = {
    id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves logs and their surrounding context based on shared correlation identifiers (e.g. trace.id). Can start from a specific log ID or find error logs within a time range to use as anchors. Returns chronologically sorted groups of logs, providing visibility into the sequence of events leading up to and following the anchor log.`,
    schema: getCorrelatedLogsSchema,
    tags: ['observability', 'logs'],
    handler: async (
      {
        start = DEFAULT_TIME_RANGE.start,
        end = DEFAULT_TIME_RANGE.end,
        termsFilter,
        index,
        correlationFields = DEFAULT_CORRELATION_IDENTIFIER_FIELDS,
        logId,
        fields,
      },
      { esClient }
    ) => {
      try {
        const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
        const startTime = parseDatemath(start);
        const endTime = parseDatemath(end, { roundUp: true });

        const errorAnchors = await fetchAnchorLogs({
          esClient,
          logsIndices,
          startTime,
          endTime,
          termsFilter,
          correlationFields,
          logger,
          logId,
        });

        // For each anchor log, find the correlated logs
        const correlatedLogs = await Promise.all(
          errorAnchors.map(async (errorAnchor) => {
            return getCorrelatedLogsForAnchor({
              esClient,
              errorAnchor,
              logsIndices,
              logger,
              fields,
            });
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
