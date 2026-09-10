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
import { parseDatemath } from '../../utils/time';
import {
  emitLogExplorationAttachment,
  getLoopState,
  injectAttachmentIds,
  resolveRange,
  resolveSource,
} from '../../attachments/emit_log_exploration_attachment';
import { applyAgentKqlFilter } from '../../utils/log_exploration_refinements';
import { getLogVolumeComparison } from './handler';

export const OBSERVABILITY_EXPLORE_LOG_VOLUME_COMPARISON_TOOL_ID =
  'observability.explore_log_volume_comparison';

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };
const DEFAULT_MESSAGE_FIELD = 'message';

const exploreLogVolumeComparisonSchema = z.object({
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
  baselineStart: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .describe(
      'Start of the prior epoch to compare against, using date math. Defaults to the window immediately preceding the current range.'
    )
    .optional(),
  baselineEnd: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .describe('End of the prior epoch to compare against, using date math.')
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
      'A KQL query to filter the log documents. It is shown to the user as a removable filter and stays applied until you pass a different one or they remove it, so omit it to keep the current filter.'
    )
    .optional(),
});

export function createExploreLogVolumeComparisonTool({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof exploreLogVolumeComparisonSchema> = {
    id: OBSERVABILITY_EXPLORE_LOG_VOLUME_COMPARISON_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Compare Log Volume Against A Baseline',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: `Charts log volume over the current time range overlaid against an earlier baseline epoch, and renders it as an interactive histogram the user can re-baseline directly.

When to use:
- The user asks whether log volume is unusual, higher or lower than before, or wants to compare now against an earlier period.

How it works:
Runs two ES|QL BUCKET queries over a shared interval so the epochs are directly comparable, then emits the result as an interactive attachment. The series are NOT returned to you — the result contains only attachment_ids. Render it with <render_attachment id="..." />.

The user changes the range and re-baselines the chart themselves, so the message that renders it must not restate the time range or the baseline — say "the selected window", "the chosen baseline". The chart is displayed to the user; spend the message on what it does not state. A later reply may name the range and baseline it was computed from, but only above a re-render of the view, never below one.`,
    schema: exploreLogVolumeComparisonSchema,
    tags: ['observability', 'logs'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { start, end, baselineStart, baselineEnd, index, kqlFilter },
      { esClient, attachments }
    ) => {
      try {
        const logIndexPatterns = await getLogsIndices({ core, logger });

        const loopState = getLoopState(attachments);
        const source = resolveSource({ start, end, index }, loopState.source, {
          index: logIndexPatterns.join(','),
          messageField: DEFAULT_MESSAGE_FIELD,
          timeRange: DEFAULT_TIME_RANGE,
        });
        const refinements = applyAgentKqlFilter(loopState.refinements ?? [], kqlFilter);

        const durationMs =
          parseDatemath(source.timeRange.end, { roundUp: true }) -
          parseDatemath(source.timeRange.start);
        const defaultBaseline = {
          start: new Date(parseDatemath(source.timeRange.start) - durationMs).toISOString(),
          end: source.timeRange.start,
        };
        const baselineEpoch = resolveRange(
          { start: baselineStart, end: baselineEnd },
          loopState.baselineEpoch,
          defaultBaseline
        );

        const histogram = await getLogVolumeComparison({
          esClient,
          index: source.index,
          messageField: source.messageField,
          refinements,
          start: source.timeRange.start,
          end: source.timeRange.end,
          baselineStart: baselineEpoch.start,
          baselineEnd: baselineEpoch.end,
        });

        const attachmentId = await emitLogExplorationAttachment(attachments, {
          source,
          refinements,
          view: { type: 'volume-comparison', baselineEpoch },
          result: {
            type: 'volume-comparison',
            histogram,
            generatedAt: new Date().toISOString(),
          },
        });

        return injectAttachmentIds(
          {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  timeRange: source.timeRange,
                  baselineEpoch,
                  bucketCount: histogram.current.length,
                },
              },
            ],
          },
          [attachmentId]
        );
      } catch (error) {
        logger.error(`Error comparing log volume: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error comparing log volume: ${error.message}`,
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
