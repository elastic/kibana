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
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler, type GetExitSpanErrorsResult } from './handler';

export interface GetExitSpanErrorsToolResult {
  type: ToolResultType.other;
  data: GetExitSpanErrorsResult;
}

const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

export const OBSERVABILITY_GET_EXIT_SPAN_ERRORS_TOOL_ID = 'observability.get_exit_span_errors';

const getExitSpanErrorsSchema = z.object({
  serviceName: z.string().describe('The service name to get exit span errors for (service.name).'),
  serviceEnvironment: z
    .string()
    .optional()
    .describe('The service environment to filter by (service.environment).'),
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of destination services to return. Defaults to 10.'),
});

export function createGetExitSpanErrorsTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getExitSpanErrorsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getExitSpanErrorsSchema> = {
    id: OBSERVABILITY_GET_EXIT_SPAN_ERRORS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves failed exit spans (outgoing calls) for a service, showing which downstream dependencies are returning errors.

When to use:
- Investigating why a service has high error rates
- Identifying which downstream service or external dependency is failing
- Understanding the impact of a downstream outage on upstream services
- Answering "which external calls are failing?" for a service

How it works:
Groups failed exit spans by destination service and span name, returning counts and sample details.

Do NOT use for:
- Getting exceptions/errors thrown within the service itself (use apmErrors)
- Understanding overall service health (use get_services)
- Analyzing latency without failures (use get_downstream_dependencies)`,
    schema: getExitSpanErrorsSchema,
    tags: ['observability', 'apm', 'traces'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, { esClient }) => {
      const {
        serviceName,
        serviceEnvironment,
        start = DEFAULT_TIME_RANGE.start,
        end = DEFAULT_TIME_RANGE.end,
        limit,
      } = toolParams;

      try {
        const result = await getToolHandler({
          core,
          plugins,
          logger,
          esClient,
          serviceName,
          serviceEnvironment,
          start,
          end,
          limit,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { ...result },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching exit span errors: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch exit span errors: ${error.message}`,
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
