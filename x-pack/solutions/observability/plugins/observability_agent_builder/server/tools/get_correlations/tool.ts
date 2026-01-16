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
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';

export const OBSERVABILITY_GET_CORRELATIONS_TOOL_ID = 'observability.get_correlations';

const getCorrelationsSchema = z.object({
  ...timeRangeSchemaRequired,
  kqlFilter: z.string().optional().describe('Optional KQL query to filter the trace documents'),
  serviceName: z
    .string()
    .describe(
      'Service name to analyze correlations for. Example: "my-service", "frontend", "checkout-api"'
    ),
  transactionName: z
    .string()
    .describe('Transaction name to analyze. Example: "POST /api/cart", "GET /api/products"'),
  transactionType: z.string().describe('Transaction type to filter by'),
  type: z
    .enum(['latency', 'failures'])
    .describe(
      'Type of correlation analysis: "latency" finds field-value pairs correlated with slow transactions, "failures" finds field-value pairs correlated with failed transactions'
    ),
  environment: z
    .string()
    .optional()
    .describe(
      "Optional filter the services by the environments that they are running in. e.g., production. Defaults to 'ENVIRONMENT_ALL'"
    ),
});

export function createGetCorrelationsTool({
  core,
  dataRegistry,
  plugins,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getCorrelationsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getCorrelationsSchema> = {
    id: OBSERVABILITY_GET_CORRELATIONS_TOOL_ID,
    type: ToolType.builtin,
    description: `Identifies statistically significant field-value pairs correlated with latency or failures in APM transactions.`,
    schema: getCorrelationsSchema,
    tags: ['observability'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        start,
        end,
        kqlFilter,
        type,
        serviceName,
        transactionName,
        transactionType,
        environment = 'ENVIRONMENT_ALL',
      },
      { request }
    ) => {
      try {
        const correlations = await getToolHandler({
          core,
          plugins,
          request,
          dataRegistry,
          logger,
          start,
          end,
          kqlFilter,
          type,
          serviceName,
          transactionName,
          transactionType,
          environment,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                correlations,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting correlations: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch correlations: ${error.message}`,
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
