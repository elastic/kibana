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
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { dateHistogram } from './common';
import { getMetricsIndices } from '../../utils/get_metrics_indices';
import { getChangePoints, searchChangePoints, type Bucket } from '../../utils/get_change_points';

export const OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID =
  'observability.get_metric_change_points';

type MetricType = 'min' | 'max' | 'sum' | 'count' | 'avg' | 'p95' | 'p99';

interface AggregationsResponse {
  groups?: {
    buckets?: Bucket[];
  };
}

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

  if (['min', 'max', 'sum', 'avg'].includes(type)) {
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

async function getMetricChangePoints({
  name,
  index,
  start,
  end,
  kqlFilter,
  groupBy,
  field,
  type,
  esClient,
}: {
  name: string;
  index: string;
  start: string;
  end: string;
  kqlFilter?: string;
  groupBy: string[];
  field?: string;
  type: MetricType;
  esClient: IScopedClusterClient;
}) {
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
              metric: bucketsPathMetric,
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

  const aggregations = {
    groups: {
      ...groupAgg,
      aggs: subAggs,
    },
  };

  const response = await searchChangePoints({
    esClient,
    index,
    start,
    end,
    kqlFilter,
    aggregations,
  });

  const buckets = response.aggregations?.groups?.buckets;
  if (!buckets) {
    return [];
  }

  return await getChangePoints({
    name,
    buckets,
  });
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
        index: z.string().describe('The index or index pattern to find the metrics').optional(),
        kqlFilter: z
          .string()
          .describe('A KQL filter to filter the metric documents, e.g.: my_field:foo')
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
      'Optional keyword fields to group metrics by. DO NOT UNDER ANY CIRCUMSTANCES use high cardinality fields like date or metric fields. Leave empty unless needed.'
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

        const metricIndexPatterns = await getMetricsIndices({ core, plugins, logger });

        const metricChangePoints = await Promise.all(
          metrics.map(async (metric) => {
            return await getMetricChangePoints({
              name: metric.name,
              index: metric.index || metricIndexPatterns.join(','),
              esClient,
              start,
              end,
              kqlFilter: metric.kqlFilter,
              groupBy: metric.groupBy ?? [],
              type: metric.type || 'count',
              field: metric.field,
            });
          })
        );

        const topMetricChangePoints = orderBy(metricChangePoints.flat(), [
          (item) => item.changes.p_value,
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
