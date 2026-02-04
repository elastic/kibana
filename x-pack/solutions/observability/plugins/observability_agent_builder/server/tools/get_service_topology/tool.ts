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
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID = 'observability.get_service_topology';

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };

export type TopologyDirection = 'downstream' | 'upstream' | 'both';

const getServiceTopologyToolSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  serviceName: z.string().min(1).describe('The name of the service to get the topology for'),
  environment: z
    .string()
    .optional()
    .describe(
      'The environment the service runs in (e.g., production, staging). Leave empty for all environments.'
    ),
  direction: z
    .enum(['downstream', 'upstream', 'both'])
    .default('downstream')
    .describe(
      'Direction of dependencies to retrieve. ' +
        '"downstream" shows what this service calls (dependencies). ' +
        '"upstream" shows what calls this service (callers). ' +
        '"both" shows both directions. Defaults to "downstream".'
    ),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'Optional KQL filter to narrow down which traces are sampled for topology discovery. ' +
        'Note: This filter affects trace selection, not connection filtering. ' +
        'All connections from sampled traces are returned. ' +
        'Available fields: service.name, service.environment, transaction.name, agent.name.'
    ),
  includeMetrics: z
    .boolean()
    .default(true)
    .describe(
      'Include health metrics (latency, error rate, throughput) for each connection. ' +
        'Set to false for faster topology-only queries. Defaults to true.'
    ),
});

export function createGetServiceTopologyTool({
  core,
  dataRegistry,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
}): StaticToolRegistration<typeof getServiceTopologyToolSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getServiceTopologyToolSchema> = {
    id: OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the service topology showing dependencies and callers for a service, with optional health metrics.

Returns:
- Number of traces sampled to build the topology
- List of connections showing source and target nodes
- For service nodes: service name, agent name, environment
- For external dependencies: resource identifier, span type/subtype
- When includeMetrics=true: error rate (0-1), latency (ms), throughput (rpm) per connection

When to use:
- Tracing cascading failures through multi-hop dependencies (direction: "downstream")
- Understanding blast radius when a service fails (direction: "upstream" to see affected callers)
- Identifying which path in the dependency chain is unhealthy
- Visualizing the full architecture around a service (direction: "both")

When NOT to use:
- For single-hop dependencies with metrics, use \`observability.get_downstream_dependencies\`
- For service-level metrics without topology, use \`observability.get_trace_metrics\``,
    schema: getServiceTopologyToolSchema,
    tags: ['observability', 'apm', 'service-map', 'topology'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, context) => {
      const { serviceName, environment, direction, kqlFilter, start, end, includeMetrics } =
        toolParams;
      const { request } = context;

      try {
        const topology = await getToolHandler({
          request,
          dataRegistry,
          serviceName,
          environment,
          direction,
          kqlFilter,
          start,
          end,
          includeMetrics,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                tracesCount: topology.tracesCount,
                connectionsCount: topology.connections.length,
                connections: topology.connections,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting service topology: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch service topology: ${error.message}`,
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
