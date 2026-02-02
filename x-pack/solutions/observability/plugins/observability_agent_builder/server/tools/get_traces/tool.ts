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
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { indexDescription, timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { DEFAULT_TIME_RANGE } from './constants';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_TRACES_TOOL_ID = 'observability.get_traces';

const getTracesSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().describe(indexDescription).optional(),
  traceId: z
    .string()
    .optional()
    .describe(
      'Trace ID to retrieve the full distributed trace (transactions, spans, errors, and logs). Example: "abc123".'
    ),
  logId: z
    .string()
    .optional()
    .describe(
      'ID of a specific log entry to use as an anchor. When provided, other filter parameters are ignored.'
    ),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'KQL filter to narrow down logs. Examples: \'service.name: "payment"\', \'host.name: "web-server-01"\'. Ignored if logId is provided.'
    ),
  errorLogsOnly: z
    .boolean()
    .default(true)
    .describe(
      'When true, only sequences containing error logs (ERROR, WARN, FATAL, HTTP 5xx) are returned. Set to false to return any sequence. You can use `kqlFilter` to apply another filter (e.g., slow requests).'
    ),
  maxSequences: z
    .number()
    .default(10)
    .describe('Maximum number of unique log sequences to return.'),
});

export function createGetTracesTool({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getTracesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getTracesSchema> = {
    id: OBSERVABILITY_GET_TRACES_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves trace data (APM transactions/spans/errors) plus logs for a single request/flow.

You can look up a trace in two ways:
- Direct: provide traceId to fetch for that trace within the provided time range
- Anchor-based: provide a logId (or a KQL filter + time range) and the tool will find anchor logs, extract the best available correlation identifier (prefers trace.id), then fetch APM events and logs for that identifier

When to use:
- You already have a trace.id and want a single place to fetch APM events + logs for that trace
- You have an error log (logId) but not a trace.id yet, and you want to expand to the surrounding context
- You have a log query (kqlFilter) and want to sample a few representative sequences, then expand each one

How it works:
1. Determine correlation identifiers:
   - If traceId is provided: use trace.id
   - Else: find up to maxSequences anchor logs (errors by default), and derive correlation identifiers from their fields
2. For each correlation identifier, query:
   - APM events (transactions, spans, errors) using the same identifier field/value
   - APM error documents (filtered to exclude debug/info/warning)
   - Logs with the same identifier field/value from the selected indices
3. Each result set is sorted by @timestamp (APM and logs are returned as separate arrays, not merged).

Do NOT use for:
- Finding traces by a broad query (use observability.get_trace_metrics or observability.get_trace_change_points to scope first)`,
    schema: getTracesSchema,
    tags: ['observability', 'trace', 'apm', 'logs'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { start, end, traceId, index, logId, kqlFilter, errorLogsOnly, maxSequences },
      { esClient, request }
    ) => {
      try {
        const { sequences } = await getToolHandler({
          core,
          plugins,
          request,
          logger,
          esClient,
          start,
          end,
          traceId,
          index,
          kqlFilter,
          errorLogsOnly,
          logId,
          maxSequences,
        });

        return {
          results: [{ type: ToolResultType.other, data: { sequences } }],
        };
      } catch (error) {
        logger.error(`Error fetching traces: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch traces: ${error.message}`,
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
