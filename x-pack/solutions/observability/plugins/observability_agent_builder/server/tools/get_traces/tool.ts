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
import {
  DEFAULT_MAX_DOCS_PER_TRACE,
  DEFAULT_MAX_TRACES,
  DEFAULT_TIME_RANGE,
  DEFAULT_TRACE_FIELDS,
} from './constants';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_TRACES_TOOL_ID = 'observability.get_traces';

const getTracesSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().describe(indexDescription).optional(),
  kqlFilter: z
    .string()
    .describe(
      'KQL filter used to find seed Observability documents (logs, transactions, spans, and errors) within the selected time range. Examples: \'service.name: "payment-service"\', \'trace.id: "abc123"\', \'_id: "a1b2c3"\'. The tool discovers one or more `trace.id` values from matching documents (up to `maxTraces`) and returns Observability documents grouped by trace.id.'
    ),
  maxTraces: z
    .number()
    .optional()
    .default(DEFAULT_MAX_TRACES)
    .describe('Maximum number of traces to return. Defaults to 10.'),
  maxDocsPerTrace: z
    .number()
    .optional()
    .default(DEFAULT_MAX_DOCS_PER_TRACE)
    .describe('Maximum number of documents to return per trace. Defaults to 100.'),

  fields: z
    .array(z.string())
    .default(DEFAULT_TRACE_FIELDS)
    .describe('Fields to include in the returned documents.'),
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
    description: `Retrieves Observability documents (logs, transactions, spans, and errors) for one or more traces.

  This tool is KQL-driven: it searches for matching Observability documents within the time range, extracts one or more trace.id values, then returns Observability documents grouped by trace.id.

  Common patterns:
  - Retrieve a specific trace: kqlFilter: "trace.id: abc123"
  - Expand from a specific document id: kqlFilter: "_id: a1b2c3" (only works if that document has a trace.id)

  Note: The optional "index" parameter is used for trace.id discovery. The returned documents are fetched from the configured Observability data sources.

  Do NOT use for:
  - Finding traces by a broad query (use observability.get_trace_metrics or observability.get_trace_change_points to scope first)`,
    schema: getTracesSchema,
    tags: ['observability', 'trace', 'apm', 'logs', 'errors'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { start, end, index, kqlFilter, maxDocsPerTrace, maxTraces, fields },
      { esClient }
    ) => {
      try {
        const result = await getToolHandler({
          core,
          plugins,
          logger,
          esClient,
          start,
          end,
          index,
          kqlFilter,
          maxDocsPerTrace,
          fields,
          maxTraces,
        });

        return {
          results: [{ type: ToolResultType.other, data: result }],
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
