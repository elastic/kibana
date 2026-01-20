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
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { timeRangeSchemaOptional, indexDescription } from '../../utils/tool_schemas';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { getLogCategories } from './handler';
import { getToolHandler } from './handler';
import { OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID } from '../get_correlated_logs/tool';

export interface GetLogCategoriesToolResult {
  type: ToolResultType.other;
  data: {
    highSeverityCategories: Awaited<ReturnType<typeof getLogCategories>>;
    lowSeverityCategories: Awaited<ReturnType<typeof getLogCategories>>;
  };
}

const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

export const OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID = 'observability.get_log_categories';

const getLogsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().describe(indexDescription).optional(),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'A KQL query to filter logs. Examples: service.name:"payment", host.name:"web-server-01", service.name:"payment" AND log.level:error'
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      'Additional fields to return for each log sample. "@timestamp" and the message field are always included. Example: ["service.name", "host.name"]'
    ),
  messageField: z
    .string()
    .optional()
    .describe(
      'The field containing the log message. Use "message" for ECS logs or "body.text" for OpenTelemetry logs. Defaults to "message".'
    )
    .default('message'),
});

export function createGetLogCategoriesTool({
  core,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  logger: Logger;
}): StaticToolRegistration<typeof getLogsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getLogsSchema> = {
    id: OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID,
    type: ToolType.builtin,
    description: `Compresses thousands of logs into a small set of categories to provide a high-level overview of what's being logged.

When to use:
- Getting a quick summary of log activity in a service or time range
- Identifying the types of events occurring without reading individual logs
- Discovering unexpected log patterns or new error types
- Answering "what kinds of things are happening?" rather than "what exactly happened?"

How it works:
Groups similar log messages together using pattern recognition, returning representative categories with counts.

After using this tool:
- For high-count error categories, use \`${OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID}\` to trace the sequence of events leading to those errors
- Compare error patterns across services - the origin service often has different error types than affected downstream services (e.g., "constraint violation" vs "connection timeout")
- Patterns like "timeout", "exhausted", "capacity", "limit reached" are often SYMPTOMS - look for what's causing the resource pressure
- If you see resource lifecycle logs (acquire/release, open/close), check if counts match - mismatches can indicate leaks

Do NOT use for:
- Understanding the sequence of events for a specific error (use ${OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID})
- Investigating a specific incident in detail (use ${OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID})
- Analyzing changes in log volume over time (use run_log_rate_analysis)`,
    schema: getLogsSchema,
    tags: ['observability', 'logs'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, { esClient }) => {
      const { index, start, end, kqlFilter, fields = [], messageField } = toolParams;

      try {
        const { highSeverityCategories, lowSeverityCategories } = await getToolHandler({
          core,
          logger,
          esClient,
          index,
          start,
          end,
          kqlFilter,
          fields,
          messageField,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { highSeverityCategories, lowSeverityCategories },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching log categories: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch log categories: ${error.message}`,
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
