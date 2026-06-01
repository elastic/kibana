/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { getToolHandler } from './handler';
import type { ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';

export const OBSERVABILITY_GET_APM_TIMESERIES_TOOL_ID = 'observability.get_apm_timeseries';

const getApmTimeseriesSchema = z.object({
  ...timeRangeSchemaRequired,
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'KQL filter to scope to a specific service and environment. Example: \'service.name: "frontend" AND service.environment: "production"\''
    ),
  metric: z
    .enum(['latency', 'failedTransactionRate', 'throughput'])
    .describe(
      'Which metric to plot over time. Use "latency" for transaction_duration alerts, "failedTransactionRate" for error_rate or transaction_error_rate alerts, "throughput" for traffic volume.'
    ),
  latencyType: z
    .enum(['avg', 'p95', 'p99'])
    .default('avg')
    .describe('Aggregation type for latency. Ignored for non-latency metrics.'),
});

export function createGetApmTimeseriesTool({
  core,
  plugins,
  logger,
  dataRegistry,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): StaticToolRegistration<typeof getApmTimeseriesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getApmTimeseriesSchema> = {
    id: OBSERVABILITY_GET_APM_TIMESERIES_TOOL_ID,
    type: ToolType.builtin,
    description: `Returns time-bucketed APM metrics (latency, failed transaction rate, or throughput) for a service over a time range. Each data point has a timestamp and a value. Use this to show how a metric changed over time — for example, to visualise the onset of a latency spike or the duration of an error rate increase. Auto-selects bucket interval based on the requested time range (1m for ≤2h, 5m for ≤12h, 15m for ≤48h, 1h otherwise).

Returns:
- dataPoints: array of { timestamp (epoch ms), value (ms for latency, % for failedTransactionRate, rpm for throughput) }
- metric: the requested metric name
- unit: 'ms' | '%' | 'rpm'`,
    schema: getApmTimeseriesSchema,
    tags: ['observability', 'apm', 'timeseries', 'latency', 'metrics'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ start, end, kqlFilter, metric, latencyType }, context) => {
      try {
        const result = await getToolHandler({
          core,
          plugins,
          request: context.request,
          logger,
          start,
          end,
          kqlFilter,
          metric,
          latencyType,
        });
        return {
          type: ToolResultType.Data,
          data: result,
        };
      } catch (error) {
        logger.error(`get_apm_timeseries error: ${error}`);
        return {
          type: ToolResultType.Error,
          error: String(error),
        };
      }
    },
  };

  return {
    definition: toolDefinition,
  };
}
