/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import dedent from 'dedent';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_EXIT_SPAN_CHANGE_POINTS_TOOL_ID =
  'observability.get_exit_span_change_points';

const getExitSpanChangePointsSchema = z.object({
  ...timeRangeSchemaRequired,
  kqlFilter: z
    .string()
    .optional()
    .describe(
      dedent(`KQL filter scoped to the emitting service (and optional environment), e.g.
      'service.name: "checkout" AND service.environment: "production"'. Results are always grouped by span.destination.service.resource (each dependency).`)
    ),
});

export function createGetExitSpanChangePointsTool({
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
}) {
  const toolDefinition: BuiltinToolDefinition<typeof getExitSpanChangePointsSchema> = {
    id: OBSERVABILITY_GET_EXIT_SPAN_CHANGE_POINTS_TOOL_ID,
    type: ToolType.builtin,
    description:
      dedent(`Detects statistically significant change points in egress traffic from a service to its dependencies: latency (avg), throughput (calls per minute), and failure rate, grouped by dependency (span.destination.service.resource). This reflects outbound calls the service makes.

      When to use:
      - Sudden shifts in downstream dependency performance (latency spike, throughput drop, error rate increase).
      - Correlating a service incident with a specific external or internal dependency.

      When NOT to use:
      - Incoming request behavior to the service itself — use observability.get_trace_change_points (transaction / ingress metrics) instead.

      You may call both tools in the same investigation to compare ingress vs egress patterns.`),
    schema: getExitSpanChangePointsSchema,
    tags: ['observability', 'traces'],
    handler: async ({ start, end, kqlFilter }, { request }) => {
      try {
        const changePoints = await getToolHandler({
          core,
          plugins,
          request,
          logger,
          start,
          end,
          kqlFilter,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                changePoints,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting exit span change points: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error getting exit span change points: ${error.message}`,
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
