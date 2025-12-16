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
import { getAnchorLogs } from './fetch_anchor_logs/fetch_anchor_logs';
import { getCorrelatedLogsForAnchor } from './get_correlated_logs_for_anchor';
import type { LogSequence } from './types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';

export const OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID = 'observability.get_correlated_logs';

function getNoResultsMessage({
  sequences,
  logId,
  logsFilter,
  interestingEventFilter,
  correlationFields,
  start,
  end,
}: {
  sequences: LogSequence[];
  logId: string | undefined;
  logsFilter: string | undefined;
  interestingEventFilter: string | undefined;
  correlationFields: string[];
  start: string;
  end: string;
}): string | undefined {
  if (sequences.length > 0) {
    return undefined;
  }

  const isUsingDefaultCorrelationFields =
    correlationFields === DEFAULT_CORRELATION_IDENTIFIER_FIELDS;

  const correlationFieldsDescription = isUsingDefaultCorrelationFields
    ? 'Matching logs exist but lack the default correlation fields (trace.id, request.id, transaction.id, etc.). Try using `correlationFields` for specifying custom correlation fields.'
    : `Matching logs exist but lack the custom correlation fields: ${correlationFields.join(', ')}`;

  const isUsingDefaultEventFilter = !interestingEventFilter;
  const eventFilterDescription = isUsingDefaultEventFilter
    ? 'The default `interestingEventFilter` (log.level: ERROR/WARN/FATAL, HTTP 5xx, syslog severity ≤3, etc.) did not match any documents.'
    : `The \`interestingEventFilter\` option "${interestingEventFilter}" did not match any documents.`;

  if (logId) {
    return `The log ID "${logId}" was not found, or the log does not have any of the ${correlationFieldsDescription}.`;
  }

  const suggestions = [
    `No matching logs exist in this time range (${start} to ${end})`,
    ...(logsFilter ? ['`logsFilter` is too restrictive'] : []),
    eventFilterDescription,
    correlationFieldsDescription,
  ];

  return `No log sequences found. Possible reasons: ${suggestions
    .map((s, i) => `(${i + 1}) ${s}`)
    .join(', ')}.`;
}

const getCorrelatedLogsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().describe(indexDescription).optional(),
  logId: z
    .string()
    .optional()
    .describe(
      'Optional ID of a specific log entry. If provided, the tool will fetch this log and find correlated logs based on its correlation identifier (e.g., trace.id). NOTE: When logId is provided, "start", "end", "logsFilter", and "interestingEventFilter" are ignored.'
    ),
  logsFilter: z
    .string()
    .optional()
    .describe(
      'Optional KQL query to filter the scope of logs to search. Example: "service.name: payment AND host.name: web-server-01". Ignored if logId is provided.'
    ),
  interestingEventFilter: z
    .string()
    .optional()
    .describe(
      'Optional KQL query to define what constitutes an "interesting event" - the starting point for correlation. Defaults to matching error logs (ERROR, WARN, FATAL, HTTP 5xx, etc.). Use this to find non-error events (e.g. "event.duration > 1000000" for slow requests) or specific errors. Ignored if logId is provided.'
    ),
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
      'Optional list of fields to return for each log entry. If not provided, a default set of common Observability fields is returned. For a high-level overview, ["@timestamp", "message", "log.level"] is recommended.'
    ),
  maxSequences: z
    .number()
    .optional()
    .describe('Optional maximum number of unique log sequences to return. Defaults to 10.'),
  maxLogsPerSequence: z
    .number()
    .optional()
    .describe(
      'Optional maximum number of logs per sequence. Defaults to 200. Increase this to see a longer history of events surrounding the anchor.'
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
    description: `Retrieves complete log sequences around events of interest (errors, slow requests, anomalies) to understand what happened.

When to use:
- Investigating WHY something failed or behaved unexpectedly
- Understanding the sequence of events leading to an error or incident
- Following a request/transaction across services using correlation IDs (trace.id, request.id, etc.)
- An alert fired and you need to understand the root cause

How it works:
1. Finds "anchor" logs matching your criteria (default: errors with severity ERROR, WARN, FATAL, HTTP 5xx, etc.)
2. Groups logs by correlation ID - a shared identifier that links related logs across a distributed system
3. Returns chronologically sorted sequences showing the full story before and after each anchor

Returns: { sequences: [{ correlation: { field, value }, logs: [...] }] }

Do NOT use for:
- Getting a high-level overview of log patterns (use get_log_categories)
- Analyzing why log volume changed (use run_log_rate_analysis)`,
    schema: getCorrelatedLogsSchema,
    tags: ['observability', 'logs'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        start = DEFAULT_TIME_RANGE.start,
        end = DEFAULT_TIME_RANGE.end,
        logsFilter,
        interestingEventFilter,
        index,
        correlationFields = DEFAULT_CORRELATION_IDENTIFIER_FIELDS,
        logId,
        logSourceFields = DEFAULT_LOG_SOURCE_FIELDS,
        maxSequences = 10,
        maxLogsPerSequence = 200,
      },
      { esClient }
    ) => {
      try {
        const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
        const startTime = parseDatemath(start);
        const endTime = parseDatemath(end, { roundUp: true });

        const anchorLogs = await getAnchorLogs({
          esClient,
          logsIndices,
          startTime,
          endTime,
          logsFilter,
          interestingEventFilter,
          correlationFields,
          logger,
          logId,
          maxSequences,
        });

        // For each anchor log, find the correlated logs
        const sequences = await Promise.all(
          anchorLogs.map(async (anchorLog) => {
            const { logs, isTruncated } = await getCorrelatedLogsForAnchor({
              esClient,
              anchorLog,
              logsIndices,
              logger,
              logSourceFields,
              maxLogsPerSequence,
            });

            return {
              correlation: anchorLog.correlation,
              logs,
              isTruncated,
            };
          })
        );

        const message = getNoResultsMessage({
          sequences,
          logId,
          logsFilter,
          interestingEventFilter,
          correlationFields,
          start,
          end,
        });
        return {
          results: [{ type: ToolResultType.other, data: { sequences, message } }],
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
