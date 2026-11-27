/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType, ToolResultType, type EsqlResults } from '@kbn/agent-builder-common';
import type { EsqlResultsData } from '@kbn/agent-builder-common/tools/tool_result';
import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { BuiltinToolDefinition, ToolHandlerResult } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const alertsSchema = lazySchema(() =>
  z.object({
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
    detail: z
      .enum(['summary', 'full'])
      .optional()
      .describe(
        'How much to return for each alert. "summary" returns a few key fields (time, alert id, rule, severity, risk score, status, host, user, IPs, reason) for up to 100 alerts. Use it when the user only wants to see or list alerts. "full" (the default) returns all essential fields for about 25 alerts. Use it when you need to analyze alert content such as process, file or network fields.'
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
  })
);

export const SECURITY_ALERTS_TOOL_ID = securityTool('alerts');

type AlertDetail = 'summary' | 'full';

// The most raw alert rows handed to the model for each detail level. An uncapped list-style query
// returned 100 alerts with all fields, and about 160k tokens of context.
export const MAX_FULL_ALERT_ROWS = 25;
export const MAX_SUMMARY_ALERT_ROWS = 100;

// The most estimated tokens of rows handed to the model. The platform replaces a tool result above
// 20,000 estimated tokens with a preview and a read_file path, and the model then spends extra steps on it.
export const MAX_RESULT_TOKENS = 15_000;

// The few fields that a plain list of alerts needs.
export const SUMMARY_ALERT_FIELDS = [
  '@timestamp',
  'kibana.alert.uuid',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'kibana.alert.workflow_status',
  'host.name',
  'user.name',
  'source.ip',
  'destination.ip',
  'kibana.alert.reason',
];

const getMaxRows = (detail?: AlertDetail): number =>
  detail === 'summary' ? MAX_SUMMARY_ALERT_ROWS : MAX_FULL_ALERT_ROWS;

// One row more than the most rows shown for any detail level. The query generator writes `LIMIT <this>`
// when the user gives no number, for raw rows and for grouped (STATS) results alike. Getting this many
// rows back shows that more rows exist. It is the same for both detail levels, so that a grouped query
// keeps a limit of 101 groups, and capAlertRows then cuts raw rows to the maximum for the detail level.
const QUERY_ROW_LIMIT = MAX_SUMMARY_ALERT_ROWS + 1;

// `_id` duplicates `kibana.alert.uuid`, and `_index` is a metadata field that fails ES|QL validation in KEEP.
const KEEP_EXCLUDED_METADATA_FIELDS = new Set(['_id', '_index']);

/**
 * Enhances the natural language query with instructions to use KEEP clause for alert searches.
 * This ensures the LLM generates ES|QL queries that filter to only essential fields.
 * Additionally, for count queries, ensures optimal count query generation.
 */
const enhanceQueryForAlerts = (
  nlQuery: string,
  isCount?: boolean,
  detail?: AlertDetail
): string => {
  const fieldsList = (
    detail === 'summary'
      ? SUMMARY_ALERT_FIELDS
      : ESSENTIAL_ALERT_FIELDS.filter((field) => !KEEP_EXCLUDED_METADATA_FIELDS.has(field))
  )
    .map((field) => `\`${field}\``)
    .join(', ');
  let instruction = ` IMPORTANT: When generating ES|QL queries, you MUST include a KEEP clause to limit results to only these essential fields: ${fieldsList}. This reduces context window usage by filtering out unnecessary nested data like DLL lists, call stacks, and memory regions. Add the KEEP clause before any LIMIT clause, or at the end if there's no LIMIT.`;

  // For count queries, add specific instructions to ensure optimal count query generation
  if (isCount) {
    instruction += ` CRITICAL: This is a count query. You MUST generate an ES|QL query that returns ONLY a count result, not individual document rows. Use STATS count = COUNT(*) to return a single number. If grouping is needed (e.g., "count by severity"), use STATS count = COUNT(*) BY [field] but ensure the result is aggregated counts, not individual document rows. Do NOT include a LIMIT clause for count queries unless grouping is used.`;
  }

  return `${nlQuery}${instruction}`;
};

const isEsqlResult = (result: ToolHandlerResult): result is ToolHandlerResult<EsqlResults> =>
  result.type === ToolResultType.esqlResults;

// Quoted values, quoted identifiers and comments, so that a word inside them is not read as a command.
const QUOTED_OR_COMMENT =
  /"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|`(?:[^`]|``)*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

// Aggregated results (STATS) have small rows and the user may have asked for a number of them, so they are not cut.
// Only a `| STATS` command counts: the word can also appear in a value, a name or a comment.
const isAggregation = (query: string): boolean =>
  /\|\s*STATS\b/i.test(query.replace(QUOTED_OR_COMMENT, ' '));

const buildNote = (message: string): ToolHandlerResult => ({
  tool_result_id: getToolResultId(),
  type: ToolResultType.other,
  data: { message },
});

// How many of the first rows fit the token budget. At least one row is kept, so that a very large row is not lost.
const countRowsWithinBudget = (
  { query, columns, values }: EsqlResultsData,
  maxRows: number
): number => {
  let tokens = estimateTokens({ query, columns });
  let kept = 0;
  for (const row of values.slice(0, maxRows)) {
    tokens += estimateTokens(row);
    if (kept > 0 && tokens > MAX_RESULT_TOKENS) {
      break;
    }
    kept += 1;
  }
  return kept;
};

const capAlertRows = (results: ToolHandlerResult[], detail?: AlertDetail): ToolHandlerResult[] =>
  results.flatMap((result) => {
    if (!isEsqlResult(result)) {
      return [result];
    }
    const { query, values } = result.data;
    if (isAggregation(query)) {
      // At the default limit, the generator may have cut the groups. Say so, and do not cut more.
      return values.length === QUERY_ROW_LIMIT
        ? [
            result,
            buildNote(
              `The query returned ${values.length} grouped rows, which is the default limit, so there may be more groups. Ask for a larger number explicitly or narrow the query to see them.`
            ),
          ]
        : [result];
    }
    const shown = countRowsWithinBudget(result.data, getMaxRows(detail));
    if (shown >= values.length) {
      return [result];
    }
    return [
      { ...result, data: { ...result.data, values: values.slice(0, shown) } },
      buildNote(
        `Showing the first ${shown} of at least ${values.length} matching rows. This is the most that fits in one result. Tell the user that more rows exist, and offer to narrow the question (shorter time window, severity, host or rule). Do not run more queries to list the rest.`
      ),
    ];
  });

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
      `List-style results are limited to fit the context, and a note says when rows were cut. When the user only wants to see or list alerts, set detail to "summary" to get a few key fields for up to ${MAX_SUMMARY_ALERT_ROWS} alerts. When you need to analyze alert content (process, file or network fields), or the question names specific fields to return, use detail "full" (the default), which returns about ${MAX_FULL_ALERT_ROWS} alerts. Narrow the question (shorter time window, severity, host or rule) to see more. Grouped (STATS) results are not cut, and a note says when they may be limited by the query. ` +
      'When the user asks for a count, set isCount to true.',
    schema: alertsSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { query: nlQuery, isCount, detail, time_window_hours: timeWindowHours },
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

      const enhancedQuery = enhanceQueryForAlerts(nlQuery, isCount, detail);

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
        rowLimit: QUERY_ROW_LIMIT,
      });

      return { results: capAlertRows(results, detail) };
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
