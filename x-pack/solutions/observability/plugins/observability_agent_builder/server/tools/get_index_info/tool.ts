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
import dedent from 'dedent';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getIndexInfoHandler, type IndexInfoResult } from './get_index_info_handler';
import { getIndexFieldsHandler, type IndexFieldsResult } from './get_index_fields_handler';
import { getFieldValuesHandler, type MultiFieldValuesResult } from './get_field_values_handler';
import { OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID } from '../get_trace_metrics/tool';
import { OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID } from '../get_metric_change_points/tool';
import { OBSERVABILITY_GET_HOSTS_TOOL_ID } from '../get_hosts/tool';
import { OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID } from '../get_log_categories/tool';

export const OBSERVABILITY_GET_INDEX_INFO_TOOL_ID = 'observability.get_index_info';

export type GetIndexInfoToolResult = OtherResult<
  IndexInfoResult | IndexFieldsResult | MultiFieldValuesResult
>;

const getIndexInfoSchema = z.object({
  index: z
    .string()
    .optional()
    .describe(
      dedent(`Index pattern to get fields from. Supports cross-cluster search.

Examples:
- "logs-*" — local cluster
- "cluster_one:logs-*" — specific remote cluster
- "*:logs-*,logs-*" — all remote and local clusters

When omitted, returns available data sources (index patterns) for observability data.`)
    ),
  field: z
    .union([z.string(), z.array(z.string()).max(10)])
    .optional()
    .describe(
      dedent(`Field(s) to get values for. Requires 'index' parameter.

        For keyword fields: returns up to 50 distinct values.
        For numeric fields: returns min/max range.
        For date fields: returns min/max date range.

        Examples:
        - "service.name" → { type: "keyword", values: ["payment", "order"] }
        - "http.response.status_code" → { type: "numeric", min: 200, max: 503 }
        - "@timestamp" → { type: "date", min: "2024-01-01T00:00:00Z", max: "2024-01-07T23:59:59Z" }`)
    ),
  userIntentDescription: z
    .string()
    .optional()
    .describe(
      dedent(`Describe the user's investigation intent to filter fields to only relevant ones. Requires "index" parameter.

        Include:
        - The symptom or problem (latency, errors, OOM, crashes)
        - Entities involved (service name, host, container, pod)
        - What aspect to analyze (performance, errors, resources, dependencies)

        Transform user questions and conversation context into intent descriptions:
        - User: "Why is checkout slow?" → "High latency in checkout service - need transaction duration and service fields"
        - User: "Pod keeps crashing" → "Pod crashes and restarts - need kubernetes, container, and error fields"
        - User: "Memory issues on prod" → "Memory pressure on production hosts - need memory metrics and host fields"`)
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
    description:
      dedent(`**IMPORTANT: Call this tool FIRST before using tools that require field names as parameters.**

        Tools like \`${OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID}\`, \`${OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID}\`, \`${OBSERVABILITY_GET_HOSTS_TOOL_ID}\`, and \`${OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID}\` accept field names in parameters like 'groupBy', 'kqlFilter', and 'aggregation.field'. Calling get_index_info first ensures you are aware of the fields that exist in the cluster and avoid using non-existent fields.

        **Three call patterns:**

        1. **get_index_info()** — Get data sources and curated fields
          Returns index patterns for observability data (logs, metrics, traces) and commonly-used fields.

        2. **get_index_info({ index, userIntentDescription? })** — Get all fields from index
          Returns fields and their type (keyword, text, long, date, etc.)
          Pass 'userIntentDescription' to filter to relevant fields only.

        3. **get_index_info({ index, field })** — Get field values
          Returns distinct values for keyword fields, or min/max range for numeric/date fields.
          Use before building filters to know valid values.

        **Examples:**
        - Before calling \`${OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID}\` with groupBy, call get_index_info() to discover which fields exist
        - Before calling \`${OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID}\` with aggregation.field, call get_index_info({ index: "metrics-*", userIntentDescription: "..." }) to find numeric fields to aggregate on`),
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
