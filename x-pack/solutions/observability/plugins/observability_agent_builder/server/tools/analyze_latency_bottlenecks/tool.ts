/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';
import { OBSERVABILITY_GET_SERVICES_TOOL_ID, OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID } from '..';

export const OBSERVABILITY_ANALYZE_LATENCY_BOTTLENECKS_TOOL_ID =
  'observability.analyze_latency_bottlenecks';

const analyzeLatencyBottlenecksSchema = z.object({
  ...timeRangeSchemaRequired,
  serviceName: z
    .string()
    .describe('The name of the APM service to analyze for latency bottlenecks.'),
  serviceEnvironment: z
    .string()
    .optional()
    .describe(
      'Optional service environment to filter by (e.g., "production", "staging"). If not provided, analyzes all environments.'
    ),
  transactionType: z
    .string()
    .optional()
    .describe(
      'Optional transaction type to filter by (e.g., "request", "page-load"). If not provided, analyzes all transaction types.'
    ),
});

export function createAnalyzeLatencyBottlenecksTool({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof analyzeLatencyBottlenecksSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof analyzeLatencyBottlenecksSchema> = {
    id: OBSERVABILITY_ANALYZE_LATENCY_BOTTLENECKS_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes a service's latency bottlenecks by examining transaction groups, downstream dependencies, and performance metrics to identify the root causes of high latency.

This tool provides:
1. **Summary metrics**: Overall service latency (avg, p95), throughput, and error rate
2. **Transaction bottlenecks**: Ranked list of transactions by impact (time contribution), with latency and error metrics
3. **Dependency bottlenecks**: Ranked list of external dependencies (databases, APIs, caches) by latency and impact
4. **Actionable insights**: Automatically generated recommendations based on detected patterns

When to use this tool:
- After identifying a service with high latency using ${OBSERVABILITY_GET_SERVICES_TOOL_ID}
- When investigating performance degradation or SLO breaches
- To find specific transactions or dependencies causing latency issues
- Before making optimization decisions to identify highest-impact areas

The analysis identifies:
- **Slowest transactions**: Transactions with highest average latency
- **Highest impact transactions**: Transactions consuming the most total time (high throughput × latency)
- **Slow dependencies**: External services, databases, or APIs with high latency
- **High error rate transactions**: Transactions with elevated failure rates (which often cause latency due to retries)

Example workflow:
1. Use ${OBSERVABILITY_GET_SERVICES_TOOL_ID} to identify services with latency issues
2. Use this tool to analyze latency bottlenecks for the problematic service
3. Use ${OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID} to drill down into specific transactions or hosts

Returns structured analysis with summary metrics, ranked bottlenecks, and prioritized recommendations.`,
    schema: analyzeLatencyBottlenecksSchema,
    tags: ['observability', 'apm', 'latency', 'performance', 'analysis', 'bottleneck'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ serviceName, serviceEnvironment, start, end, transactionType }, context) => {
      const { request } = context;

      try {
        const analysis = await getToolHandler({
          core,
          plugins,
          request,
          logger,
          serviceName,
          serviceEnvironment,
          start,
          end,
          transactionType,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: analysis,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error analyzing latency bottlenecks: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to analyze latency bottlenecks for service "${serviceName}": ${error.message}`,
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
