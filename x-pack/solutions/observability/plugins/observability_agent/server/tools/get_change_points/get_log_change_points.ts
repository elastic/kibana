/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { ChangePointType } from '@kbn/es-types/src';
import { omit, orderBy } from 'lodash';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { getFilters, dateHistogram } from './common';
import { getTypedSearch } from '../../utils/get_typed_search';

export const OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID = 'observability.get_log_change_points';

interface ChangePointResult {
  type: {
    indeterminable?: boolean;
    [key: string]: any;
  };
  bucket?: {
    key: string | number;
    key_as_string?: string;
  };
}

export async function getLogChangePoint({
  index,
  filters,
  field,
  esClient,
}: {
  index: string;
  filters: QueryDslQueryContainer[];
  field: string;
  esClient: IScopedClusterClient;
}) {
  const countDocumentsResponse = await esClient.asCurrentUser.search({
    size: 0,
    track_total_hits: true,
    index,
    query: {
      bool: {
        filter: filters,
      },
    },
  });

  const totalHits =
    typeof countDocumentsResponse.hits.total === 'number'
      ? countDocumentsResponse.hits.total
      : countDocumentsResponse.hits.total?.value ?? 0;

  if (totalHits === 0) {
    return [];
  }

  const probability = Math.min(1, 500_000 / totalHits);

  const search = getTypedSearch(esClient.asCurrentUser);

  const response = await search({
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: filters,
      },
    },
    aggs: {
      sampler: {
        random_sampler: {
          probability: probability > 0.5 ? 1 : probability,
        },
        aggs: {
          groups: {
            categorize_text: {
              field,
              size: 1000,
            },
            aggs: {
              over_time: {
                auto_date_histogram: dateHistogram,
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
    },
  });

  const buckets = response.aggregations?.sampler?.groups?.buckets;

  if (!buckets || !Array.isArray(buckets)) {
    return [];
  }

  return buckets.map((group) => {
    const changes = group.changes as ChangePointResult;

    const isIndeterminable =
      !changes || changes.type?.indeterminable === true || !changes.bucket?.key;

    return {
      key: group.key,
      pattern: group.regex,
      over_time: group.over_time.buckets.map((bucket) => ({
        x: new Date(bucket.key).getTime(),
        y: bucket.doc_count,
      })),
      changes: isIndeterminable
        ? { type: 'indeterminable' as ChangePointType }
        : {
            time: new Date(changes.bucket!.key).toISOString(),
            type: Object.keys(changes.type)[0] as string,
            ...(Object.values(changes.type)[0] as Record<string, any>),
          },
    };
  });
}

const getLogChangePointsSchema = z.object({
  start: z
    .string()
    .describe(
      'The beginning of the time range, in Elasticsearch datemath, like `now-24h`, or an ISO timestamp'
    ),
  end: z
    .string()
    .describe(
      'The end of the time range, in Elasticsearch datemath, like `now`, or an ISO timestamp'
    ),
  logs: z
    .array(
      z.object({
        name: z.string().describe('The name of the set of logs'),
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
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof getLogChangePointsSchema> = {
    id: OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
    type: ToolType.builtin,
    description: 'Return change points such as spikes and dips for logs.',
    schema: getLogChangePointsSchema,
    tags: ['observability', 'logs'],
    handler: async ({ start, end, logs = [] }, { esClient }) => {
      try {
        if (logs.length === 0) {
          throw new Error('No logs found');
        }

        const [coreStart, pluginsStart] = await core.getStartServices();
        const savedObjectsClient = new SavedObjectsClient(
          coreStart.savedObjects.createInternalRepository()
        );

        const logSourcesService =
          await pluginsStart.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
            savedObjectsClient
          );

        const logsIndexPattern = await logSourcesService.getFlattenedLogSources();

        const logChangePoints = await Promise.all([
          ...logs.map(async (log) => {
            const changePoints = await getLogChangePoint({
              index: log.index || logsIndexPattern,
              esClient,
              filters: getFilters({ start, end, kqlFilter: log.kqlFilter }),
              field: log.field ?? 'message',
            });
            return changePoints.map((changePoint) => ({
              name: log.name,
              ...changePoint,
            }));
          }),
        ]);

        const allLogChangePoints = orderBy(logChangePoints.flat(), [
          (item) => ('p_value' in item.changes ? item.changes.p_value : Number.POSITIVE_INFINITY),
        ]).slice(0, 25);

        const allLogChangePointsWithoutTimeseries = allLogChangePoints
          .flat()
          .map((logChangePoint) => {
            return omit(logChangePoint, 'over_time');
          });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                content: {
                  description: `For each item, the user can see the type of change (dip or spike), the impact, the timestamp, the trend, and the label.
                  Do not regurgitate these results back to the user.
                  Instead, focus on the interesting changes, mention possible correlations or root causes, and suggest next steps to the user.
                  "indeterminate" means that the system could not detect any changes.`,
                  changes: {
                    logs: allLogChangePointsWithoutTimeseries,
                  },
                },
                data: {
                  changePoints: {
                    logs: allLogChangePoints,
                  },
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
