/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import {
  ToolResultType,
  type OtherResult,
  type ErrorResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import {
  MAX_INDEX_PATTERN_LENGTH,
  MAX_KQL_FILTER_LENGTH,
  MAX_SHORT_STRING_LENGTH,
} from '../../utils/schema_limits';
import { parseDatemath } from '../../utils/time';
import { DEFAULT_SAMPLE_FIELDS, OBSERVABILITY_GET_LOGS_TOOL_ID } from './constants';
import type { GetLogsResult } from './handler';
import { getDefaultBucketSize, getLogsHandler } from './handler';
import { getLogsIndices } from '../../utils/get_logs_indices';

export type GetLogsToolSuccessResult = OtherResult<GetLogsResult>;
type GetLogsHandlerResult = GetLogsToolSuccessResult | ErrorResult;

const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

const getLogsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().max(MAX_INDEX_PATTERN_LENGTH).describe('Log index pattern').optional(),
  kqlFilter: z
    .string()
    .max(MAX_KQL_FILTER_LENGTH)
    .optional()
    .describe(
      dedent(`KQL filter to narrow results. When using WITHOUT semanticFilter, build iteratively by adding NOT clauses to exclude noise.
        Examples:
         - "service.name: checkout"
         - "log.level: error"
         - "NOT message: \\"GET /health\\"" (exclude noise)
         - "error.message: * AND service.name: payment"`)
    ),
  semanticFilter: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .optional()
    .describe(
      dedent(`Natural language filter for logs. Finds and ranks log patterns by semantic relevance to your query.
        Examples: "connection failures", "authentication errors", "timeout issues", "database connection problems".
        Combine with kqlFilter for scoped searches (e.g., semanticFilter: "timeout errors" + kqlFilter: "service.name: payment").`)
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Maximum number of log samples to return. Defaults to 10.'),
  bucketSize: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .optional()
    .describe(
      `Histogram bucket size for the time-series trend. Examples: "30s", "1m", "5m", "1h". If not provided, automatically calculated from the time range to produce ~30 buckets.`
    ),
  groupBy: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .optional()
    .describe(
      `Field to group the histogram by. Examples: "log.level", "service.name", "kubernetes.namespace". Adds a second dimension to the trend for richer analysis.`
    ),
  fields: z
    .array(z.string().max(MAX_SHORT_STRING_LENGTH))
    .default(DEFAULT_SAMPLE_FIELDS)
    .describe(
      'Fields to include in log samples and category samples. Overrides the default fields when provided.'
    ),
});

export function createGetLogsTool({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): StaticToolRegistration<typeof getLogsSchema, GetLogsHandlerResult> {
  const toolDefinition: BuiltinToolDefinition<typeof getLogsSchema, GetLogsHandlerResult> = {
    id: OBSERVABILITY_GET_LOGS_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Get Logs',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: dedent(
      `Searches and filters logs, returning a histogram trend, total count, log samples, and message pattern categories.

      When to use:
      - Investigating log errors, anomalies, or specific issues
      - Getting an overview of log volume and trends for a time window
      - Finding relevant log patterns using natural language (semanticFilter)

      Two search modes:

      **With semanticFilter (recommended for known issues):**
      - Semantic search ranks patterns by relevance to your natural language query
      - Combine with kqlFilter to scope (e.g., semanticFilter: "timeout errors" + kqlFilter: "service.name: payment")
      - Do NOT iterate - the ranking already surfaces the most relevant patterns
      - One call is enough when you know what you're looking for

      **With kqlFilter only (for exploration):**
      - Use the funnel workflow: start broad, identify noise, add NOT clauses
      - Review categories and samples to identify noise (health checks, cron jobs, verbose info logs)
      - Call again with NOT clauses to exclude noise
      - Repeat until categories shows <20 patterns or you find the root cause
      - Use groupBy (e.g., "log.level") for richer trend analysis

      Response structure:
      - histogram: time-series buckets [{bucket, count, group?}]
      - totalCount: total matching logs
      - samples: recent log documents
      - categories: top message patterns by frequency
      - topValues: top 10 values for key fields (log.level, service.name, host.name, etc.). Use these values in kqlFilter.

      When NOT to use:
      - For log rate spike/dip correlation analysis, use run_log_rate_analysis
      - For metrics or traces, use the dedicated metric/trace tools`
    ),
    schema: getLogsSchema,
    tags: ['observability', 'logs', 'investigation'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, { esClient }) => {
      try {
        const [, pluginsStart] = await core.getStartServices();
        const logIndexPatterns = await getLogsIndices({ core, logger });
        const semanticLogSearch = pluginsStart.logsDataAccess.services.semanticLogSearch;

        const startMs = parseDatemath(toolParams.start)!;
        const endMs = parseDatemath(toolParams.end, { roundUp: true })!;
        const bucketSize = toolParams.bucketSize ?? getDefaultBucketSize(startMs, endMs);

        const result = await getLogsHandler({
          esClient: esClient.asCurrentUser,
          params: {
            start: toolParams.start,
            end: toolParams.end,
            index: toolParams.index ?? logIndexPatterns.join(','),
            kqlFilter: toolParams.kqlFilter,
            semanticFilter: toolParams.semanticFilter,
            limit: toolParams.limit,
            bucketSize,
            groupBy: toolParams.groupBy,
            fields: toolParams.fields,
          },
          semanticLogSearch,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: result,
            },
          ],
        };
      } catch (error) {
        logger.error(`get_logs failed: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Log search failed: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}

export { OBSERVABILITY_GET_LOGS_TOOL_ID };
