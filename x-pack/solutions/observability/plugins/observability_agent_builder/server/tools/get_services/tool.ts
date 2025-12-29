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
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_SERVICES_TOOL_ID = 'observability.get_services';

const getServicesSchema = z.object({
  ...timeRangeSchemaRequired,
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

Each service includes a 'sources' array indicating where it was found: 'apm', 'logs', and/or 'metrics'.

Useful for:
- Getting a high-level system overview of all services
- Identifying unhealthy APM services
- Discovering services that may not be instrumented with APM but appear in logs or metrics
- Understanding which observability signals are available for each service`,
    schema: getServicesSchema,
    tags: ['observability', 'services'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ start, end, environment, healthStatus }, context) => {
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
