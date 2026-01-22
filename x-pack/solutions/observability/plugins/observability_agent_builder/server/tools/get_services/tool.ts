/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_SERVICES_TOOL_ID = 'observability.get_services';

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };

const getServicesSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  environment: z
    .string()
    .min(1)
    .optional()
    .describe('Optionally filter the services by the environments that they are running in.'),
  healthStatus: z
    .array(z.enum(['unknown', 'healthy', 'warning', 'critical']))
    .optional()
    .describe(
      'Optional list of health statuses to filter services by (e.g., ["healthy", "warning"]). Valid values: "unknown", "healthy", "warning", "critical".'
    ),
});

export function createGetServicesTool({
  core,
  plugins,
  dataRegistry,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
}): StaticToolRegistration<typeof getServicesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getServicesSchema> = {
    id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves a list of services from APM, logs, and metrics data sources.
    
For APM services, includes health status, active alert counts, and key performance metrics (latency, transaction error rate, throughput).
For services found only in logs or metrics, basic information like service name and environment is returned.

When to use:
- Getting a high-level overview of system health from a service perspective
- Identifying key metrics for services like latency, error rate, throughput, anomalies and alert counts
- Answering "which services are having problems?"
- Discovering services that may not be instrumented with APM but appear in logs or metrics`,
    schema: getServicesSchema,
    tags: ['observability', 'services'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, context) => {
      const { start, end, environment, healthStatus } = toolParams;
      const { request, esClient } = context;

      try {
        const { services, maxCountExceeded, serviceOverflowCount } = await getToolHandler({
          core,
          plugins,
          request,
          esClient,
          dataRegistry,
          logger,
          start,
          end,
          environment,
          healthStatus,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: services.length,
                services,
                maxCountExceeded,
                serviceOverflowCount,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting services: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch services: ${error.message}`,
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
