/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type {
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
    .describe('Optionally filter the services by their health status.'),
});

export function createGetServicesTool({
  core,
  dataRegistry,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
}): StaticToolRegistration<typeof getServicesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getServicesSchema> = {
    id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Retrieves a list of monitored APM services, including their health status, active alert counts, and key performance metrics: latency, transaction error rate, and throughput. Useful for high-level system overview, identifying unhealthy services, and quantifying performance issues.',
    schema: getServicesSchema,
    tags: ['observability', 'services'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ start, end, environment, healthStatus }, context) => {
      const { request } = context;

      try {
        const { services, maxCountExceeded, serviceOverflowCount } = await getToolHandler({
          request,
          dataRegistry,
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
