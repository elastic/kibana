/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { AggregateOf, AggregateOfMap, ChangePointType } from '@kbn/es-types/src/search';
import { orderBy } from 'lodash';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { dateHistogram, getFilters } from './common';

export const OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID =
  'observability.get_metric_change_points';

type MetricType = 'min' | 'max' | 'sum' | 'count' | 'avg' | 'p95' | 'p99';

function getMetricAggregation({ field, type }: { field?: string; type: MetricType }): {
  agg: AggregationsAggregationContainer;
  buckets_path?: string;
} {
  if (type === 'count') {
    return field
      ? {
          agg: {
            value_count: {
              field,
            },
          },
        }
      : {
          agg: {
            filter: {
              match_all: {},
            },
          },
          buckets_path: '_count',
        };
  }

  if (!field) {
    throw new Error(`Metric type ${type} needs a field to aggregate over`);
  }

  if (type === 'min' || 'max' || 'sum' || 'avg') {
    return {
      agg: {
        [type]: {
          field,
        },
      } as Record<Exclude<MetricType, 'count' | 'p95' | 'p99'>, { field: string }>,
    };
  }

  const percentile = `${type.split('p')[1]}.0`;

  return {
    agg: {
      percentiles: {
        field,
        percents: [Number(percentile)],
        keyed: true,
      },
    },
    buckets_path: percentile,
  };
}

function getGroupingAggregation(groupingFields: string[]) {
  if (groupingFields.length === 0) {
    return {
      filters: {
        filters: [
          {
            match_all: {},
          },
        ],
      },
    };
  }

  if (groupingFields.length === 1) {
    return { terms: { field: groupingFields[0] } };
  }

  return {
    multi_terms: {
      terms: groupingFields.map((groupingField) => ({ field: groupingField })),
      size: 10,
    },
  };
}

export async function getMetricChangePoints({
  index,
  filters,
  groupBy,
  field,
  type,
  esClient,
}: {
  index: string;
  filters: QueryDslQueryContainer[];
  groupBy: string[];
  field?: string;
  type: MetricType;
  esClient: IScopedClusterClient;
}) {
  try {
    const { agg: metricAgg, buckets_path: metricBucketsPath } = getMetricAggregation({
      type,
      field,
    });

    const groupAgg = getGroupingAggregation(groupBy);

    const subAggs = {
      over_time: {
        auto_date_histogram: dateHistogram,
        aggs: {
          metric: metricAgg,
          value: {
            bucket_script: {
              buckets_path: {
                metric: `metric${metricBucketsPath ? `>${metricBucketsPath}` : ''}`,
              },
              script: 'params.metric',
            },
          },
        },
      },
      changes: {
        change_point: {
          buckets_path: 'over_time>value',
        },
        // elasticsearch@9.0.0 change_point aggregation is missing in the types: https://github.com/elastic/elasticsearch-specification/issues/3671
      } as AggregationsAggregationContainer,
    };

    const response = await esClient.asCurrentUser.search({
      index,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        groups: {
          ...groupAgg,
          aggs: subAggs,
        },
      },
    });

    const groups = (
      response.aggregations?.groups && 'buckets' in response.aggregations.groups
        ? response.aggregations.groups.buckets || []
        : []
    ) as Array<AggregateOfMap<typeof subAggs, unknown> & { key?: string; key_as_string?: string }>;

    const series = groups.map((group) => {
      const key = group.key ?? 'all';

      const changes = group.changes as AggregateOf<
        { change_point: { buckets_path: string } },
        unknown
      >;

      return {
        key,
        over_time: group.over_time.buckets.map((bucket) => {
          return {
            x: new Date(bucket.key_as_string).getTime(),
            y: bucket.value?.value as number | null,
          };
        }),
        changes:
          changes.type.indeterminable || !changes.bucket?.key
            ? { type: 'indeterminable' as ChangePointType }
            : {
                time: new Date(changes.bucket.key).toISOString(),
                type: Object.keys(changes.type)[0] as keyof typeof changes.type,
                ...Object.values(changes.type)[0],
              },
      };
    });

    return series;
  } catch (error) {
    throw error;
  }
}

const getMetricChangePointsSchema = z.object({
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
  metrics: z
    .array(
      z.object({
        name: z.string().describe('The name of the set of metrics'),
        index: z.string().describe('The index or index pattern to find the metrics'),
        kqlFilter: z
          .string()
          .describe('A KQL filter to filter the log documents, e.g.: my_field:foo')
          .optional(),
        field: z
          .string()
          .describe(
            'Metric field that contains the metric. Only use if the metric aggregation type is not `count`.'
          )
          .optional(),
        type: z
          .enum(['count', 'avg', 'sum', 'min', 'max', 'p95', 'p99'])
          .describe('The type of metric aggregation to perform. Defaults to `count`')
          .optional(),
        groupBy: z
          .array(z.string())
          .describe('Optional keyword fields to group metrics by.')
          .optional(),
      })
    )
    .describe(
      'Analyze changes in metrics. DO NOT UNDER ANY CIRCUMSTANCES use date or metric fields for groupBy. Leave empty unless needed.'
    ),
});

export function createObservabilityGetMetricChangePointsTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof getMetricChangePointsSchema> = {
    id: OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
    type: ToolType.builtin,
    description: 'Return change points such as spikes and dips for metrics.',
    schema: getMetricChangePointsSchema,
    tags: ['observability', 'metrics'],
    handler: async ({ start, end, metrics = [] }, { esClient }) => {
      try {
        if (metrics.length === 0) {
          throw new Error('No metrics found');
        }

        const metricChangePoints = await Promise.all([
          ...metrics.map(async (metric) => {
            const changePoints = await getMetricChangePoints({
              index: metric.index,
              esClient,
              filters: getFilters({ start, end, kqlFilter: metric.kqlFilter }),
              groupBy: metric.groupBy ?? [],
              type: metric.type || 'count',
              field: metric.field,
            });

            return changePoints.map((change) => ({
              name: metric.name,
              ...change,
            }));
          }),
        ]);

        const allMetricChangePoints = orderBy(metricChangePoints.flat(), [
          (item) => ('p_value' in item.changes ? item.changes.p_value : Number.POSITIVE_INFINITY),
        ]).slice(0, 25);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                changes: {
                  metrics: allMetricChangePoints,
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting metric change points: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error getting metric change points: ${error.message}`,
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
