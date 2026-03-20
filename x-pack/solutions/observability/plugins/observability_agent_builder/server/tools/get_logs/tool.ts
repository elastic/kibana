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
  index: z.string().describe('Log index pattern').optional(),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      dedent(`KQL filter to narrow results. Build this iteratively by adding NOT clauses to exclude noise.
        Examples:
         - "service.name: checkout",
         - "NOT message: \\"GET /health\\" AND NOT kubernetes.namespace: \\"kube-system\\"",
         - "error.message: * AND NOT message: \\"Known benign warning\\"".`)
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
    .optional()
    .describe(
      `Histogram bucket size for the time-series trend. Examples: "30s", "1m", "5m", "1h". If not provided, automatically calculated from the time range to produce ~30 buckets.`
    ),
  groupBy: z
    .string()
    .optional()
    .describe(
      `Field to group the histogram by. Examples: "log.level", "service.name", "kubernetes.namespace". Adds a second dimension to the trend for richer analysis.`
    ),
  fields: z
    .array(z.string())
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
    description: dedent(
      `Searches and filters logs, returning a histogram trend, total count, compact log samples, and message pattern categories in a single query.

      When to use:
      - Investigating log spikes, errors, or anomalies by iteratively narrowing down with KQL filters
      - Getting an overview of log volume and trends for a time window
      - Drilling into specific services, hosts, or containers during incident investigation

      How to use (the "funnel" workflow):
      1. Start with a broad filter (or no kqlFilter) to see the landscape
      2. Review the totalCount, categories, and samples — identify noise (health checks, cron jobs, verbose info logs)
      3. Call again with NOT clauses added to kqlFilter to exclude noise
      4. Repeat until categories shows fewer than 20 distinct patterns or samples show the root cause
      5. Use groupBy (e.g. "log.level") to slice the histogram for richer trend analysis

      Response structure:
      - histogram: time-series buckets [{bucket, count, group?}]. Controlled by bucketSize (bucket width) and groupBy (adds a "group" field to each bucket).
      - totalCount: total number of matching logs.
      - samples: the most recent log documents, controlled by limit (max count) and fields (which fields to include).
      - categories: top message patterns by frequency. This provides a quick overview of the most common log patterns.
      - topValues: top 10 values for fixed key fields: log.level, service.name, service.environment, host.name, agent.name, error.exception.type, kubernetes.namespace, kubernetes.node.name, kubernetes.pod.name, kubernetes.container.name. Not affected by groupBy or fields. Use these exact values when building kqlFilter or choosing a groupBy field — do not guess field values.

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
        const logIndexPatterns = await getLogsIndices({ core, logger });

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
            limit: toolParams.limit,
            bucketSize,
            groupBy: toolParams.groupBy,
            fields: toolParams.fields,
          },
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
