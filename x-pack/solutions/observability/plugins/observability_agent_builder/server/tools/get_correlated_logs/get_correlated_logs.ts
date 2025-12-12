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
  DEFAULT_TIME_RANGE,
  DEFAULT_LOG_SOURCE_FIELDS,
} from './constants';
import { fetchAnchorLogs } from './fetch_anchor_logs';
import { getCorrelatedLogsForAnchor } from './get_correlated_logs_for_anchor';

export const OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID = 'observability.get_correlated_logs';

const getCorrelatedLogsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().describe(indexDescription).optional(),
  logId: z
    .string()
    .optional()
    .describe(
      'Optional ID of a specific log entry. If provided, the tool will fetch this log and find correlated logs based on its correlation identifier (e.g., trace.id). NOTE: When logId is provided, "start", "end", "kqlQuery", and "anchorFilter" are ignored.'
    ),
  kqlQuery: z
    .string()
    .optional()
    .describe(
      'Optional KQL query to filter logs. Example: "service.name: payment AND host.name: web-server-01". Ignored if logId is provided.'
    ),
  anchorFilter: z
    .string()
    .optional()
    .describe(
      'Optional KQL query to define what constitutes an "anchor" log. Defaults to matching error logs. Use this to find non-error events (e.g. "event.duration > 1000000") or specific errors. Ignored if logId is provided.'
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
  logSourceFields: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of fields to return for each log entry. If not provided, a default set of common Observability fields is returned.'
    ),
  maxResults: z
    .number()
    .optional()
    .describe(
      'Optional maximum number of log groups to return. Defaults to 10. Use this to analyze a larger batch of logs.'
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
    description: `Retrieves logs and their surrounding context based on shared correlation identifiers (e.g. trace.id). Can start from a specific log ID or find "anchor" logs (default: errors) within a time range. Returns chronologically sorted groups of logs.
    
    By default, this tool returns log sequences that contain at least one ERROR log. To find sequences based on other events (e.g. slow requests), you must provide an 'anchorFilter'.
    If 'logId' is provided, 'start', 'end', 'kqlQuery', and 'anchorFilter' are ignored.`,
    schema: getCorrelatedLogsSchema,
    tags: ['observability', 'logs'],
    handler: async (
      {
        start = DEFAULT_TIME_RANGE.start,
        end = DEFAULT_TIME_RANGE.end,
        kqlQuery,
        anchorFilter,
        index,
        correlationFields = DEFAULT_CORRELATION_IDENTIFIER_FIELDS,
        logId,
        logSourceFields = DEFAULT_LOG_SOURCE_FIELDS,
        maxResults = 10,
      },
      { esClient }
    ) => {
      try {
        const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
        const startTime = parseDatemath(start);
        const endTime = parseDatemath(end, { roundUp: true });

        const anchorLogs = await fetchAnchorLogs({
          esClient,
          logsIndices,
          startTime,
          endTime,
          kqlQuery,
          anchorFilter,
          correlationFields,
          logger,
          logId,
          maxResults,
        });

        // For each anchor log, find the correlated logs
        const groups = await Promise.all(
          anchorLogs.map(async (anchorLog) => {
            const logs = await getCorrelatedLogsForAnchor({
              esClient,
              anchorLog,
              logsIndices,
              logger,
              logSourceFields,
            });

            return {
              correlation: anchorLog.correlation,
              logs,
            };
          })
        );

        return {
          results: [{ type: ToolResultType.other, data: { groups } }],
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
