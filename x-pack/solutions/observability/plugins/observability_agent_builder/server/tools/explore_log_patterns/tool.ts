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
import type { Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import {
  MAX_INDEX_PATTERN_LENGTH,
  MAX_KQL_FILTER_LENGTH,
  MAX_SHORT_STRING_LENGTH,
} from '../../utils/schema_limits';
import { getLogsIndices } from '../../utils/get_logs_indices';
import {
  emitLogExplorationAttachment,
  getLoopState,
  injectAttachmentIds,
  readCurrentData,
  resolveSource,
} from '../../attachments/emit_log_exploration_attachment';
import {
  excludedPatterns,
  MAX_PATTERNS,
  mergeFetchedPatterns,
} from '../../../common/log_exploration';
import { applyAgentKqlFilter } from '../../utils/log_exploration_refinements';
import { getLogPatterns } from './handler';

export const OBSERVABILITY_EXPLORE_LOG_PATTERNS_TOOL_ID = 'observability.explore_log_patterns';

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };
const DEFAULT_MESSAGE_FIELD = 'message';

const exploreLogPatternsSchema = z.object({
  start: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .describe(
      'Start of the query window using date math, e.g. "now-24h". Omit to keep the range the user currently has selected in the view.'
    )
    .optional(),
  end: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .describe(
      'End of the query window using date math, e.g. "now". Omit to keep the user\'s range.'
    )
    .optional(),
  index: z
    .string()
    .max(MAX_INDEX_PATTERN_LENGTH)
    .describe('The index or index pattern to find the logs')
    .optional(),
  kqlFilter: z
    .string()
    .max(MAX_KQL_FILTER_LENGTH)
    .describe(
      "A KQL query to filter the log documents. Examples: 'log.level: error', 'service.name: \"my-service\"'. It is shown to the user as a removable filter and stays applied until you pass a different one or they remove it, so omit it to keep the current filter."
    )
    .optional(),
  messageField: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .describe(
      'The unstructured text field to categorize logs on. Omit to keep the field already in use.'
    )
    .optional(),
});

export function createExploreLogPatternsTool({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof exploreLogPatternsSchema> = {
    id: OBSERVABILITY_EXPLORE_LOG_PATTERNS_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Explore Log Patterns',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: `Groups logs into message patterns with a count and a trend sparkline for each, and renders the largest ${MAX_PATTERNS} of them as an interactive table the user can filter directly.

When to use:
- The user wants to see what kinds of log messages exist, find noisy patterns, or start narrowing down a large volume of logs.

How it works:
Runs an ES|QL query using CATEGORIZE and SPARKLINE, then emits the result as an interactive attachment. The full table is NOT returned to you — the result contains only attachment_ids. Render it with <render_attachment id="..." />.

The query is LIMIT ${MAX_PATTERNS}, so the table is a top-N cut by document count, not the complete set of patterns in the logs. Say so when you describe it, and do not present these counts as covering every document.

The user re-runs this view themselves by changing the range or the filters in it, so the message that renders it must not restate the time range or the filters — say "the selected window". The table is displayed to the user; do not read its rows back to them. A later reply may name the range and filters it was computed from, but only above a re-render of the view, never below one.`,
    schema: exploreLogPatternsSchema,
    tags: ['observability', 'logs'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ start, end, index, kqlFilter, messageField }, { esClient, attachments }) => {
      try {
        const logIndexPatterns = await getLogsIndices({ core, logger });

        // The user's own filter state wins unless the model explicitly asked for something else.
        const loopState = getLoopState(attachments);
        const source = resolveSource({ start, end, index, messageField }, loopState.source, {
          index: logIndexPatterns.join(','),
          messageField: DEFAULT_MESSAGE_FIELD,
          timeRange: DEFAULT_TIME_RANGE,
        });
        const refinements = applyAgentKqlFilter(loopState.refinements ?? [], kqlFilter);

        const fetched = await getLogPatterns({
          esClient,
          start: source.timeRange.start,
          end: source.timeRange.end,
          index: source.index,
          messageField: source.messageField,
          refinements,
        });
        const current = readCurrentData(attachments);
        const patterns = mergeFetchedPatterns(
          current?.result.type === 'pattern-table' ? current.result.patterns : undefined,
          fetched,
          excludedPatterns(refinements)
        );

        const attachmentId = await emitLogExplorationAttachment(attachments, {
          source,
          refinements,
          view: { type: 'pattern-table' },
          result: {
            type: 'pattern-table',
            patterns,
            generatedAt: new Date().toISOString(),
          },
        });

        return injectAttachmentIds(
          {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  patternCount: fetched.length,
                  refinementCount: refinements.length,
                  timeRange: source.timeRange,
                },
              },
            ],
          },
          [attachmentId]
        );
      } catch (error) {
        logger.error(`Error getting log patterns: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error getting log patterns: ${error.message}`,
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
