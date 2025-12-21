/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { orderBy } from 'lodash';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { getTotalHits } from '../../utils/get_total_hits';
import { type Bucket, getChangePoints } from '../../utils/get_change_points';
import { parseDatemath } from '../../utils/time';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';

export const OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID = 'observability.get_log_change_points';

function getProbability(totalHits: number): number {
  const probability = Math.min(1, 500_000 / totalHits);
  return probability > 0.5 ? 1 : probability;
}

async function getLogChangePoint({
  name,
  index,
  start,
  end,
  kqlFilter: kqlFilterValue,
  field,
  esClient,
}: {
  name: string;
  index: string;
  start: string;
  end: string;
  kqlFilter?: string;
  field: string;
  esClient: IScopedClusterClient;
}) {
  const countDocumentsResponse = await esClient.asCurrentUser.search({
    size: 0,
    track_total_hits: true,
    index,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', {
            start: parseDatemath(start),
            end: parseDatemath(end),
          }),
          ...kqlFilter(kqlFilterValue),
        ],
      },
    },
  });

  const totalHits = getTotalHits(countDocumentsResponse);

  if (totalHits === 0) {
    return [];
  }

  const aggregations = {
    sampler: {
      random_sampler: {
        probability: getProbability(totalHits),
      },
      aggs: {
        groups: {
          categorize_text: {
            field,
            size: 1000,
          },
          aggs: {
            over_time: {
              auto_date_histogram: {
                field: '@timestamp',
                buckets: 100,
              },
            },
            changes: {
              change_point: {
                buckets_path: 'over_time>_count',
              },
              // elasticsearch@9.0.0 change_point aggregation is missing in the types: https://github.com/elastic/elasticsearch-specification/issues/3671
            } as AggregationsAggregationContainer,
          },
        },
      },
    },
  };

  const search = getTypedSearch(esClient.asCurrentUser);

  const response = await search({
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', {
            start: parseDatemath(start),
            end: parseDatemath(end),
          }),
          ...kqlFilter(kqlFilterValue),
        ],
      },
    },
    aggs: aggregations,
  });

  const buckets = response.aggregations?.sampler?.groups?.buckets;

  if (!buckets) {
    return [];
  }

  return await getChangePoints({
    name,
    buckets: buckets as Bucket[],
  });
}

const getLogChangePointsSchema = z.object({
  ...timeRangeSchemaRequired,
  logs: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            'A descriptive label for the log change point analysis, e.g. "Error Logs" or "API Requests". Used to identify results in the output.'
          ),
        index: z.string().describe('The index or index pattern to find the logs').optional(),
        kqlFilter: z
          .string()
          .describe('A KQL filter to filter the log documents, e.g.: my_field:foo')
          .optional(),
        field: z
          .string()
          .describe(
            'The text field that contains the message to be analyzed, usually `message`. ONLY use field names from the conversation.'
          )
          .optional(),
      })
    )
    .describe(
      'Analyze changes in log patterns. If no index is given, the default logs index pattern will be used'
    ),
});

export function createObservabilityGetLogChangePointsTool({
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
  const toolDefinition: BuiltinToolDefinition<typeof getLogChangePointsSchema> = {
    id: OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes log messages to detect statistically significant changes like spikes and dips, in specific log patterns.

How it works:
It uses the "categorize_text" aggregation to group similar unstructured messages into categories and then detects change points (spikes/dips) within each cateogory.`,
    schema: getLogChangePointsSchema,
    tags: ['observability', 'logs'],
    handler: async ({ start, end, logs = [] }, { esClient }) => {
      try {
        if (logs.length === 0) {
          throw new Error('No logs found');
        }

        const logIndexPatterns = await getLogsIndices({ core, logger });

        const logChangePoints = await Promise.all(
          logs.map(async (log) => {
            return await getLogChangePoint({
              name: log.name,
              index: log.index || logIndexPatterns.join(','),
              esClient,
              start,
              end,
              kqlFilter: log.kqlFilter,
              field: log.field ?? 'message',
            });
          })
        );

        const allLogChangePoints = orderBy(logChangePoints.flat(), [
          (item) => item.changes.p_value ?? Number.POSITIVE_INFINITY,
        ]).slice(0, 25);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                changePoints: {
                  logs: allLogChangePoints,
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting log change points: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error getting log change points: ${error.message}`,
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
