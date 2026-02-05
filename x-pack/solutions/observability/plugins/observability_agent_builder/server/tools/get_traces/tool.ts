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
  kqlFilter: z
    .string()
    .describe(
      'KQL filter used to find anchor log(s). Examples: \'service.name: "payment-service"\', \'trace.id: "abc123"\', \'_id: "a1b2c3"\'. The tool will pick an anchor log matching this filter, extract the best available correlation identifier (prefers trace.id), then return APM trace docs and logs for that identifier.'
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

  This tool is KQL-driven: it first finds one or more anchor logs within the time range, then extracts the best available correlation identifier from each anchor (prefers trace.id). For each identifier it returns:
  - APM events (transactions, spans, errors)
  - Logs

  Common patterns:
  - Retrieve a specific trace: kqlFilter: "trace.id: abc123"
  - Expand from a specific log doc: kqlFilter: "_id: a1b2c3" (useful when you have a log document id)

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
      { start, end, index, kqlFilter, errorLogsOnly, maxSequences },
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
          index,
          kqlFilter,
          errorLogsOnly,
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
