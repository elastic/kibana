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
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID =
  'observability.get_downstream_dependencies';

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };

const getDownstreamDependenciesToolSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  serviceName: z.string().min(1).describe('The name of the service'),
  serviceEnvironment: z
    .string()
    .optional()
    .describe(
      'The environment that the service is running in. Leave empty to query for all environments.'
    ),
});

export function createDownstreamDependenciesTool({
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
}): StaticToolRegistration<typeof getDownstreamDependenciesToolSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getDownstreamDependenciesToolSchema> = {
    id: OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
    type: ToolType.builtin,
    description: `Identifies downstream dependencies (other services, databases, external APIs) for a specific service.

When to use:
- Showing the topology for a service
- Investigating if a dependency is causing issues
- Understanding the blast radius of a failing service`,
    schema: getDownstreamDependenciesToolSchema,
    tags: ['observability', 'apm', 'dependencies'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, context) => {
      const { serviceName, serviceEnvironment, start, end } = toolParams;
      const { request } = context;

      try {
        const { dependencies } = await getToolHandler({
          request,
          dataRegistry,
          serviceName,
          serviceEnvironment,
          start,
          end,
        });

        const total = dependencies?.length ?? 0;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total,
                dependencies,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting APM downstream dependencies: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch downstream dependencies: ${error.message}`,
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
