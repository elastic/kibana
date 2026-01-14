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
import dedent from 'dedent';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getIndexPatternsHandler } from './get_index_overview_handler';
import { listFieldsHandler } from './get_index_fields_handler';
import { getFieldValuesHandler } from './get_field_values_handler';

export const OBSERVABILITY_GET_INDEX_INFO_TOOL_ID = 'observability.get_index_info';

const getIndexInfoSchema = z.object({
  operation: z.enum(['get-index-patterns', 'list-fields', 'get-field-values']).describe(
    dedent(`Operation to perform:
        - "get-index-patterns": Get observability index patterns and discovered data streams 
        - "list-fields": List names of populated fields in an index (requires: index)
        - "get-field-values": Get values for specific fields (requires: index, fields)`)
  ),
  index: z
    .string()
    .optional()
    .describe(
      'Index pattern (e.g., "logs-*", "metrics-*"). Required for "list-fields" and "get-field-values".'
    ),
  fields: z
    .array(z.string())
    .max(10)
    .optional()
    .describe(
      'Array of field names or wildcard patterns to get values for (e.g., ["host.name"], ["attributes.app.*"]). Required for "get-field-values".'
    ),
  ...timeRangeSchemaOptional({ start: 'now-24h', end: 'now' }),
  kqlFilter: z
    .string()
    .optional()
    .describe('KQL filter to scope field discovery (e.g., ["service.name: checkout"]).'),
  intent: z
    .string()
    .optional()
    .describe(
      'Investigation focus to filter relevant fields (e.g., "memory issues", "high latency").'
    ),
});

export function createGetIndexInfoTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getIndexInfoSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getIndexInfoSchema> = {
    id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
    type: ToolType.builtin,
    description: dedent(`
      Discovers observability index patterns, fields, and field values in the user's Elasticsearch cluster.

      **When to use:**
      - Before calling tools with "kqlFilter" param to discover valid fields and values 
      - To discover custom fields available beyond standard ECS or OTel fields
      - To understand which fields have data in the index
      - To understand the sample values and ranges for fields

      **When NOT to use:**
      - When you already know the field names and values you need

      **Examples:**
      - getIndexInfo(operation: "get-index-patterns" )
      - getIndexInfo(operation: "list-fields", index: "logs-*" )
      - getIndexInfo(operation: "get-field-values", index: "logs-*", fields: ["host.name"] )
    `),
    schema: getIndexInfoSchema,
    tags: ['observability', 'index', 'fields'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (params, { esClient, modelProvider }) => {
      try {
        let result;

        switch (params.operation) {
          case 'get-index-patterns':
            result = await getIndexPatternsHandler({ core, plugins, esClient, logger });
            break;

          case 'list-fields':
            if (!params.index) {
              return {
                results: [
                  {
                    type: ToolResultType.error,
                    data: { message: '"index" is required for operation "list-fields"' },
                  },
                ],
              };
            }
            result = await listFieldsHandler({
              esClient,
              index: params.index,
              intent: params.intent,
              start: params.start,
              end: params.end,
              kqlFilter: params.kqlFilter,
              modelProvider,
              logger,
            });
            break;

          case 'get-field-values':
            if (!params.index || !params.fields) {
              return {
                results: [
                  {
                    type: ToolResultType.error,
                    data: {
                      message: '"index" and "fields" are required for operation "get-field-values"',
                    },
                  },
                ],
              };
            }
            result = await getFieldValuesHandler({
              esClient,
              index: params.index,
              fields: params.fields,
              start: params.start,
              end: params.end,
              kqlFilter: params.kqlFilter,
            });
            break;
        }

        return {
          results: [{ type: ToolResultType.other, data: { ...result } }],
        };
      } catch (error) {
        logger.error(`Error getting index info: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to get index info: ${error.message}` },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
