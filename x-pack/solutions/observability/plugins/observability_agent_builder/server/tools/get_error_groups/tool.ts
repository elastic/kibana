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
import { getErrorGroups, type ErrorGroup } from './handler';
import { OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID } from '../get_correlated_logs/tool';
import { OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID } from '../get_log_categories/tool';

export const OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID = 'observability.get_error_groups';

export interface GetErrorGroupsToolResult {
  type: typeof ToolResultType.other;
  data: {
    errorGroups: ErrorGroup[];
  };
}

const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

const getErrorGroupsSchema = z.object({
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

export function createGetErrorGroupsTool({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getErrorGroupsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getErrorGroupsSchema> = {
    id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Retrieves error groups (exceptions and APM errors) with occurrence counts and sample details.

      When to use:
      - Get a quick overview of what errors are occurring across services
      - Identify which exception types are generating the most errors
      - Find the most frequent error patterns
      - Determine if errors are recently introduced or long-standing

      How it works:
      Groups errors by their error.grouping_key (unique identifier per error pattern), returning counts and a sample error for each group. Use kqlFilter to scope to specific services or error types.

      After using this tool:
      - To understand the sequence of events leading to an error, use \`${OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID}\` with a trace.id from the sample
      - For log message pattern analysis (not exceptions), use \`${OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID}\`

      Example workflows:
      1. get_error_groups() → See all errors across services
      2. get_error_groups(kqlFilter='service.name: "payment"') → Errors for a specific service
      3. get_error_groups(kqlFilter='error.exception.type: "NullPointerException"') → Specific exception type

      Returns: Array of error groups with groupId, count, lastSeen, and sample error details using ECS field names (error.grouping_key, error.exception.type, service.name, trace.id, etc.).
    `,
    schema: getErrorGroupsSchema,
    tags: ['observability', 'errors', 'apm', 'exceptions'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ start, end, kqlFilter, includeStackTrace, includeFirstSeen }, context) => {
      const { request } = context;

      try {
        const errorGroups = await getErrorGroups({
          core,
          plugins,
          request,
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
              data: {
                errorGroups,
              },
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
