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
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { indexDescription, timeRangeSchemaOptional } from '../../utils/tool_schemas';
import {
  DEFAULT_CORRELATION_IDENTIFIER_FIELDS,
  DEFAULT_TIME_RANGE,
  DEFAULT_LOG_SOURCE_FIELDS,
} from './constants';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getNoResultsMessage, getToolHandler } from './handler';

export const OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID = 'observability.get_correlated_logs';

const getCorrelatedLogsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().describe(indexDescription).optional(),
  logId: z
    .string()
    .optional()
    .describe(
      'Optional ID of a specific log entry. If provided, the tool will fetch this log and find correlated logs based on its correlation identifier (e.g., trace.id). NOTE: When logId is provided, other filter parameters are ignored.'
    ),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'Optional KQL filter to narrow down logs. Example: "service.name: payment AND host.name: web-server-01". Ignored if logId is provided.'
    ),
  errorLogsOnly: z
    .boolean()
    .optional()
    .describe(
      'When true (default), only anchors on error logs (ERROR, WARN, FATAL, HTTP 5xx). Set to false to anchor on any log. For slow requests: kqlFilter="event.duration > 1000000", errorLogsOnly=false.'
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
    description: `Retrieves complete log sequences around error events to understand what happened. By default, anchors on error logs (ERROR, WARN, FATAL, HTTP 5xx). Set errorLogsOnly=false to anchor on non-error events like slow requests.

When to use:
- Investigating WHY something failed or behaved unexpectedly
- Understanding the sequence of events leading to an error
- Following a request/transaction across services using correlation IDs (trace.id, request.id, etc.)

How it works:
1. Finds "anchor" logs (errors by default, or any log if errorLogsOnly=false)
2. Groups logs by correlation ID (trace.id, request.id, etc.)
3. Returns chronologically sorted sequences showing context before and after each anchor

Do NOT use for:
- High-level overview of log patterns (use get_log_categories)
- Analyzing log volume changes (use run_log_rate_analysis)`,
    schema: getCorrelatedLogsSchema,
    tags: ['observability', 'logs'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, { esClient }) => {
      const {
        start,
        end,
        kqlFilter,
        errorLogsOnly = true,
        index,
        correlationFields = DEFAULT_CORRELATION_IDENTIFIER_FIELDS,
        logId,
        logSourceFields = DEFAULT_LOG_SOURCE_FIELDS,
        maxSequences = 10,
        maxLogsPerSequence = 200,
      } = toolParams;

      try {
        const { sequences } = await getToolHandler({
          core,
          logger,
          esClient,
          start,
          end,
          kqlFilter,
          errorLogsOnly,
          index,
          correlationFields,
          logId,
          logSourceFields,
          maxSequences,
          maxLogsPerSequence,
        });

        if (sequences.length === 0) {
          const message = getNoResultsMessage({
            logId,
            kqlFilter,
            errorLogsOnly,
            correlationFields,
            start,
            end,
          });

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  sequences: [],
                  message,
                },
              },
            ],
          };
        }

        return {
          results: [{ type: ToolResultType.other, data: { sequences } }],
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
