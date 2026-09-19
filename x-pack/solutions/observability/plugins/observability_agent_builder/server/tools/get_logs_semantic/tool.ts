/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import {
  ToolResultType,
  type OtherResult,
  type ErrorResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import {
  MAX_INDEX_PATTERN_LENGTH,
  MAX_KQL_FILTER_LENGTH,
  MAX_SHORT_STRING_LENGTH,
} from '../../utils/schema_limits';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { OBSERVABILITY_GET_LOGS_TOOL_ID } from '../get_logs/constants';
import type { GetLogsSemanticResult } from './handler';
import { getLogsSemanticHandler } from './handler';

export const OBSERVABILITY_GET_LOGS_SEMANTIC_TOOL_ID = 'observability.get_logs_semantic';

export type GetLogsSemanticToolSuccessResult = OtherResult<GetLogsSemanticResult>;
type GetLogsSemanticHandlerResult = GetLogsSemanticToolSuccessResult | ErrorResult;

const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

const getLogsSemanticSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  index: z.string().max(MAX_INDEX_PATTERN_LENGTH).describe('Log index pattern').optional(),
  semanticFilter: z
    .string()
    .trim()
    .min(1)
    .max(MAX_SHORT_STRING_LENGTH)
    .describe(
      dedent(`Natural language query for logs. Finds and ranks log patterns by semantic relevance.
        Examples: "connection failures", "authentication errors", "timeout issues", "database connection problems".`)
    ),
  kqlFilter: z
    .string()
    .max(MAX_KQL_FILTER_LENGTH)
    .optional()
    .describe(
      dedent(`Optional KQL filter to scope the corpus before ranking.
        Examples:
         - "service.name: checkout",
         - "service.name: payment AND log.level: error".`)
    ),
  maxPatterns: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10)
    .describe('Maximum number of ranked message patterns to return (1-20). Defaults to 10.'),
});

export function createGetLogsSemanticTool({
  core,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
}): StaticToolRegistration<typeof getLogsSemanticSchema, GetLogsSemanticHandlerResult> {
  const toolDefinition: BuiltinToolDefinition<
    typeof getLogsSemanticSchema,
    GetLogsSemanticHandlerResult
  > = {
    id: OBSERVABILITY_GET_LOGS_SEMANTIC_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Get Logs (Semantic)',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: dedent(
      `Ranks log message patterns by semantic relevance to a natural language query.

      When to use:
      - You have a paraphrased or conceptual question about logs (for example "connection failures" or "authentication errors") and want the matching message patterns, ranked by relevance
      - You already know what you are looking for and do not need to iterate

      How to use:
      - Set semanticFilter to the natural language question. The ranking is the answer; do not iterate.
      - Combine with kqlFilter to scope the corpus (for example semanticFilter: "timeout errors" and kqlFilter: "service.name: payment").
      - If no patterns are found, retry at most once with a different time range or a narrower KQL scope.
      - Follow warnings exactly. Do not retry unavailable, cancelled, or execution failures, and do not silently present keyword results as semantic results.

      Response structure:
      - patterns: ranked message patterns, each with count, firstSeen, lastSeen, and a sample document
      - totalCount: sum of the pattern counts, not a document count of the index
      - semanticQuery: the query that was ranked
      - warnings: empty on success

      When NOT to use:
      - Exploring log volume, trends, or iteratively excluding noise — use \`${OBSERVABILITY_GET_LOGS_TOOL_ID}\` (the funnel workflow)
      - Listing recurring groups without a semantic question — use \`observability.get_log_groups\`
      - Log rate spike/dip analysis — use run_log_rate_analysis`
    ),
    schema: getLogsSemanticSchema,
    tags: ['observability', 'logs', 'investigation', 'semantic'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, { esClient }) => {
      try {
        const [, pluginsStart] = await core.getStartServices();
        const logIndexPatterns = await getLogsIndices({ core, logger });
        const semanticLogSearch = pluginsStart.logsDataAccess.services.semanticLogSearch;

        const result = await getLogsSemanticHandler({
          esClient: esClient.asCurrentUser,
          params: {
            start: toolParams.start,
            end: toolParams.end,
            index: toolParams.index ?? logIndexPatterns.join(','),
            semanticFilter: toolParams.semanticFilter,
            kqlFilter: toolParams.kqlFilter,
            maxPatterns: toolParams.maxPatterns,
          },
          semanticLogSearch,
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`get_logs_semantic failed: ${errorMessage}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'Semantic log search failed unexpectedly.',
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
