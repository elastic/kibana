/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import dedent from 'dedent';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { getToolHandler } from './handler';
import { OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID } from '../get_correlated_logs/tool';
import { OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID } from '../get_log_categories/tool';

export const OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID = 'observability.get_exceptions';

const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

const getExceptionsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      dedent`KQL filter to scope errors. Examples:
        - 'service.name: "payment"'
        - 'error.exception.type: "NullPointerException"'
        - 'service.name: "checkout" AND error.exception.handled: false'`
    ),
  includeStackTrace: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      dedent`Include error stack traces in the response. Stack traces can be large, so only enable when needed for debugging.`
    ),
  includeFirstSeen: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      dedent`Include firstSeen timestamp for each error group. This requires an additional query with a 14-day lookback window, so only enable when needed.`
    ),
});

export function createGetExceptionsTool({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getExceptionsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getExceptionsSchema> = {
    id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Retrieves error groups with occurrence counts and sample details.
      Returns both span exceptions and log exceptions. Note that the same exception might appear in both groups if captured by both methods.

      When to use:
      - Get an overview of what exceptions are being thrown across services
      - Identify which exception types are generating the most errors
      - Find the most frequent error patterns with stack traces

      After using this tool:
      - To understand the sequence of events leading to an error, use \`${OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID}\` with a trace.id from the sample
      - For general log message patterns (not exceptions), use \`${OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID}\`

      Do NOT use for:
      - Unstructured error-level logs (use \`${OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID}\`)
    `,
    schema: getExceptionsSchema,
    tags: ['observability', 'errors', 'exceptions'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ start, end, kqlFilter, includeStackTrace, includeFirstSeen }, context) => {
      const { request, esClient } = context;

      try {
        const result = await getToolHandler({
          core,
          plugins,
          request,
          esClient,
          logger,
          start,
          end,
          kqlFilter,
          includeStackTrace,
          includeFirstSeen,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: result,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching error groups: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch error groups: ${error.message}`,
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
