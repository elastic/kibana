/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const alertsSchema = z.object({
  query: z
    .string()
    .max(4000)
    .describe('A natural language query expressing the search request for security alerts'),
  isCount: z
    .boolean()
    .optional()
    .describe(
      'Set to true when the user is asking for a count of alerts (e.g., "how many alerts", "count alerts", "total number of alerts"). When true, the query will be optimized to return a count result instead of individual alert documents.'
    ),
  time_window_hours: z
    .number()
    .int()
    .min(1)
    .max(168)
    .optional()
    .describe(
      'How many hours back from now to search (1-168, default 24). Increase (e.g. 72 or 168) when the user asks about a longer period or a 24h search returns no alerts.'
    ),
});

export const SECURITY_ALERTS_TOOL_ID = securityTool('alerts');

/**
 * Enhances the natural language query with instructions to use KEEP clause for alert searches.
 * This ensures the LLM generates ES|QL queries that filter to only essential fields.
 * Additionally, for count queries, ensures optimal count query generation.
 */
const enhanceQueryForAlerts = (nlQuery: string, isCount?: boolean): string => {
  const fieldsList = ESSENTIAL_ALERT_FIELDS.map((field) => `\`${field}\``).join(', ');
  let instruction = ` IMPORTANT: When generating ES|QL queries, you MUST include a KEEP clause to limit results to only these essential fields: ${fieldsList}. This reduces context window usage by filtering out unnecessary nested data like DLL lists, call stacks, and memory regions. Add the KEEP clause before any LIMIT clause, or at the end if there's no LIMIT.`;

  // For count queries, add specific instructions to ensure optimal count query generation
  if (isCount) {
    instruction += ` CRITICAL: This is a count query. You MUST generate an ES|QL query that returns ONLY a count result, not individual document rows. Use STATS count = COUNT(*) to return a single number. If grouping is needed (e.g., "count by severity"), use STATS count = COUNT(*) BY [field] but ensure the result is aggregated counts, not individual document rows. Do NOT include a LIMIT clause for count queries unless grouping is used.`;
  }

  return `${nlQuery}${instruction}`;
};

export const alertsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof alertsSchema> => {
  return {
    id: SECURITY_ALERTS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Do NOT use platform.core.generate_esql, platform.core.execute_esql, or platform.core.search for Security alert counts, lists, or summaries — those can cross Kibana spaces via patterns like .alerts-security.alerts-*. ' +
      'This is THE tool for finding, counting, aggregating, or summarizing Security detection alerts in the current Kibana space ' +
      '(e.g. "how many alerts", "high/critical alerts in last 24h", "summarize open alerts"). ' +
      "Always searches the current space's exact alerts alias only. " +
      'When the user asks for a count, set isCount to true.',
    schema: alertsSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { query: nlQuery, isCount, time_window_hours: timeWindowHours },
      { esClient, modelProvider, spaceId, events }
    ) => {
      // Always use the current space's exact alerts alias. Cross-space patterns such as
      // `.alerts-security.alerts-*` (and prefix wildcards like `-<space>*`) are not accepted
      // because they can return alerts from other spaces.
      const searchIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

      // Check with the internal user: analysts often lack `view_index_metadata`, so
      // asCurrentUser.indices.exists can falsely report missing. A missing space alias
      // must return a successful 0-alert result (not an error), otherwise the model
      // retries and may fall back to platform search tools against another space's index.
      const indexExists = await esClient.asInternalUser.indices.exists({ index: searchIndex });
      if (!indexExists) {
        logger.debug(
          `alerts tool: space alerts alias ${searchIndex} does not exist; returning 0 alerts`
        );
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                message: `There are 0 security alerts in this Kibana space (${spaceId}). The alerts index for this space does not exist yet.`,
                count: 0,
                index: searchIndex,
                spaceId,
              },
            },
          ],
        };
      }

      const enhancedQuery = enhanceQueryForAlerts(nlQuery, isCount);

      // When a window is requested, bind the ES|QL ?_tstart/?_tend params to it.
      // Left undefined, runSearchTool keeps its existing default (last 24h).
      const timeRange =
        timeWindowHours != null ? { from: `now-${timeWindowHours}h`, to: 'now' } : undefined;

      logger.debug(
        `alerts tool called with query: ${nlQuery}, index: ${searchIndex}, isCount: ${
          isCount ?? false
        }, timeWindowHours: ${timeWindowHours ?? 'default'}`
      );
      const results = await runSearchTool({
        nlQuery: enhancedQuery,
        index: searchIndex,
        esClient: esClient.asCurrentUser,
        modelProvider,
        events,
        logger,
        timeRange,
      });

      return { results };
    },
    tags: ['security', 'alerts'],
    annotations: {
      title: 'Get Security Alerts',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  };
};
