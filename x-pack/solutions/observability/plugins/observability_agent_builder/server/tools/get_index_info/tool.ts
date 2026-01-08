/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import type { OtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { castArray } from 'lodash';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getIndexInfoHandler, type IndexInfoResult } from './get_index_info_handler';
import { getIndexFieldsHandler, type IndexFieldsResult } from './get_index_fields_handler';
import { getFieldValuesHandler, type MultiFieldValuesResult } from './get_field_values_handler';

export const OBSERVABILITY_GET_INDEX_INFO_TOOL_ID = 'observability.get_index_info';

export type GetIndexInfoToolResult = OtherResult<
  IndexInfoResult | IndexFieldsResult | MultiFieldValuesResult
>;

const getIndexInfoSchema = z.object({
  index: z
    .string()
    .optional()
    .describe(
      `Index pattern to get fields from. Supports cross-cluster search.

Examples:
- "logs-*" — local cluster
- "cluster_one:logs-*" — specific remote cluster
- "*:logs-*,logs-*" — all remote and local clusters

When omitted, returns available data sources (index patterns) for observability data.`
    ),
  field: z
    .union([z.string(), z.array(z.string()).max(10)])
    .optional()
    .describe(
      `Field(s) to get values for. Requires 'index'.

For keyword fields: returns up to 50 distinct values.
For numeric fields: returns min/max range.
For date fields: returns min/max date range.

Examples:
- "service.name" → { type: "keyword", values: ["payment", "order"] }
- "http.response.status_code" → { type: "numeric", min: 200, max: 503 }
- "@timestamp" → { type: "date", min: "2024-01-01T00:00:00Z", max: "2024-01-07T23:59:59Z" }`
    ),
  userIntentDescription: z
    .string()
    .optional()
    .describe(
      `Describe the user's investigation intent to filter fields to only relevant ones.

Include:
- The symptom or problem (latency, errors, OOM, crashes)
- Entities involved (service name, host, container, pod)
- What aspect to analyze (performance, errors, resources, dependencies)

Transform user questions into focused investigation descriptions:
- User: "Why is checkout slow?" → "High latency in checkout service - need transaction duration and service fields"
- User: "Pod keeps crashing" → "Pod crashes and restarts - need kubernetes, container, and error fields"
- User: "Memory issues on prod" → "Memory pressure on production hosts - need memory metrics and host fields"`
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
    description: `Returns index patterns, fields, and field values from the user's Elasticsearch cluster.

**Three call patterns:**

1. **get_index_info()** — Get data sources
   Returns categorized index patterns: { apm: {...}, logs: [...], metrics: [...] }
   Use FIRST to know which indices to query.

2. **get_index_info({ index: "logs-*", userIntentDescription?: "..." })** — Get fields from index
   Returns fields grouped by type (keyword, text, long, date, etc.)
   Pass 'userIntentDescription' with the investigation goal to get only relevant fields.
   Use to find available fields for filtering or aggregation.

3. **get_index_info({ index, field: "service.name" })** — Get field values
   Returns distinct values for keyword fields, or min/max range for numeric/date fields.
   Use before building filters to know valid values.

**When to use:**
- Before constructing queries to validate field names exist
- To discover valid values for building filters
- To get index patterns for observability data
- With 'userIntentDescription' to get fields relevant to the investigation

**When NOT to use:**
- For full-text log search (use get_correlated_logs)
- For pre-defined entities (use get_services, get_hosts)`,
    schema: getIndexInfoSchema,
    tags: ['observability', 'index', 'fields'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ index, field, userIntentDescription }, { esClient, modelProvider }) => {
      try {
        let result;

        if (index && field) {
          result = await getFieldValuesHandler({ esClient, index, fields: castArray(field) });
        } else if (index) {
          result = await getIndexFieldsHandler({
            esClient,
            index,
            userIntentDescription,
            modelProvider,
            logger,
          });
        } else {
          result = await getIndexInfoHandler({ core, plugins, logger, esClient });
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
