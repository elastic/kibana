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
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { OBSERVABILITY_LOGS_SEARCH_SIMPLE_TOOL_ID } from './constants';
import { logsSearchSimpleHandler } from './handler';

const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

const logsSearchSimpleSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().default('logs-*').describe('Log index pattern. Defaults to "logs-*".'),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'KQL filter to narrow results. Build this iteratively by adding NOT clauses to exclude noise. ' +
        'Examples: "service.name: checkout", ' +
        '"NOT message: \\"GET /health\\" AND NOT kubernetes.namespace: \\"kube-system\\"", ' +
        '"error.message: * AND NOT message: \\"Known benign warning\\"".'
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
    .default('5m')
    .describe(
      'Histogram bucket size for the time-series trend. Examples: "30s", "1m", "5m", "1h". Defaults to "5m".'
    ),
  breakdownField: z
    .string()
    .optional()
    .describe(
      'Optional field to break down the histogram by. ' +
        'Examples: "log.level", "service.name", "kubernetes.namespace". ' +
        'Adds a second dimension to the trend for richer analysis.'
    ),
});

export function createLogsSearchSimpleTool({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): StaticToolRegistration<typeof logsSearchSimpleSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof logsSearchSimpleSchema> = {
    id: OBSERVABILITY_LOGS_SEARCH_SIMPLE_TOOL_ID,
    type: ToolType.builtin,
    description: `Searches and filters logs, returning a histogram trend, total count, and compact log samples in a single query.

When to use:
- Investigating log spikes, errors, or anomalies by iteratively narrowing down with KQL filters
- Getting an overview of log volume and trends for a time window
- Drilling into specific services, hosts, or containers during incident investigation

How to use (the "funnel" workflow):
1. Start with a broad filter (or no kqlFilter) to see the landscape
2. Review the totalCount and samples — identify noise (health checks, cron jobs, verbose info logs)
3. Call again with NOT clauses added to kqlFilter to exclude noise
4. Repeat 3-5 times until samples show the root cause
5. Use breakdownField (e.g. "log.level") to slice the histogram for richer trend analysis

When NOT to use:
- For log pattern grouping/categorization, use get_log_groups
- For log rate spike/dip correlation analysis, use run_log_rate_analysis
- For metrics or traces, use the dedicated metric/trace tools`,
    schema: logsSearchSimpleSchema,
    tags: ['observability', 'logs', 'investigation'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, { esClient }) => {
      try {
        const result = await logsSearchSimpleHandler({
          esClient: esClient.asCurrentUser,
          params: {
            start: toolParams.start,
            end: toolParams.end,
            index: toolParams.index,
            kqlFilter: toolParams.kqlFilter,
            limit: toolParams.limit,
            bucketSize: toolParams.bucketSize,
            breakdownField: toolParams.breakdownField,
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
        logger.error(`logs_search_simple failed: ${error.message}`);
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

export { OBSERVABILITY_LOGS_SEARCH_SIMPLE_TOOL_ID };
