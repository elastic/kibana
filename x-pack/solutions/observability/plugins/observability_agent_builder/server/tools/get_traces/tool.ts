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
    .describe(
      'Trace ID to retrieve the full distributed trace (transactions, spans, errors, and correlated logs). Example: "abc123".'
    ),
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
    description: `Retrieves a full distributed trace (transactions, spans, errors, and correlated logs) for a specific \'trace.id\'.

When to use:
- You already have a \'trace.id\' from tools like observability.get_trace_metrics, observability.get_correlated_logs, or an error/log record
- You need to understand what happened during a single request end-to-end
- You want a chronological view of trace events across services

How it works:
1. Fetches APM events (transactions, spans, errors) with the same \'trace.id\'
2. Fetches log events that share the same \'trace.id\'
3. Sorts everything by \'@timestamp\'

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
    handler: async ({ start, end, traceId, index }, { esClient, request }) => {
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
