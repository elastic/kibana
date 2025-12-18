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
import { dateHistogram } from './common';
import { getMetricsIndices } from '../../utils/get_metrics_indices';
import { type Bucket, getChangePoints } from '../../utils/get_change_points';
import { parseDatemath } from '../../utils/time';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';
import { timeRangeSchemaRequired } from '../../utils/tool_schemas';

export const OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID =
  'observability.get_metric_change_points';

type MetricType = 'min' | 'max' | 'sum' | 'count' | 'avg' | 'p95' | 'p99';

function getMetricAggregation({
  field,
  aggregationType,
}: {
  field?: string;
  aggregationType: MetricType;
}): {
  agg: AggregationsAggregationContainer;
  buckets_path?: string;
} {
  if (aggregationType === 'count') {
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
    throw new Error(`Metric type ${aggregationType} needs a field to aggregate over`);
  }

  if (['min', 'max', 'sum', 'avg'].includes(aggregationType)) {
    return {
      agg: {
        [aggregationType]: {
          field,
        },
      } as Record<Exclude<MetricType, 'count' | 'p95' | 'p99'>, { field: string }>,
    };
  }

  const percentile = `${aggregationType.split('p')[1]}.0`;

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
  kqlFilter: kuery,
  groupBy,
  field,
  aggregationType,
  esClient,
}: {
  name: string;
  index: string;
  start: string;
  end: string;
  kqlFilter?: string;
  groupBy: string[];
  field?: string;
  aggregationType: MetricType;
  esClient: IScopedClusterClient;
}) {
  const { agg: metricAgg, buckets_path: bucketsPathMetric } = getMetricAggregation({
    aggregationType,
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
          ...kqlFilter(kuery),
        ],
      },
    },
    aggs: aggregations as Record<string, AggregationsAggregationContainer>,
  });

  const buckets = (response.aggregations as { groups?: { buckets?: Bucket[] } })?.groups?.buckets;
  if (!buckets) {
    return [];
  }

  return await getChangePoints({
    name,
    buckets,
  });
}

const getMetricChangePointsSchema = z.object({
  ...timeRangeSchemaRequired,
  metrics: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            'A descriptive label for the metric change point analysis, e.g. "Error Rate" or "Latency P95". Used to identify results in the output.'
          ),
        index: z.string().describe('The index or index pattern to find the metrics').optional(),
        kqlFilter: z
          .string()
          .describe('A KQL filter to filter the metric documents, e.g.: my_field:foo')
          .optional(),
        field: z
          .string()
          .describe(
            `Optional numeric field to aggregate and observe for changes (e.g., 'transaction.duration.us'). REQUIRED when 'aggregationType' is 'avg', 'sum', 'min', 'max', 'p95', or 'p99'.`
          )
          .optional(),
        aggregationType: z
          .enum(['count', 'avg', 'sum', 'min', 'max', 'p95', 'p99'])
          .describe(
            'The aggregation to apply to the specified field. Required when a field is provided.'
          )
          .optional(),
        groupBy: z
          .array(z.string())
          .describe(
            `Optional keyword fields to break down metrics by to identify which specific group experienced a change.
Use only low-cardinality fields. Using many fields or high-cardinality fields can cause a large number of groups and severely impact performance.
Examples: ['service.name', 'service.version'], ['service.name', 'host.name'], ['cloud.availability_zone']
`
          )
          .optional(),
      })
    )
    .describe(
      `Analyze changes in metrics. DO NOT UNDER ANY CIRCUMSTANCES use high cardinality fields like date or metric fields for groupBy, leave empty unless needed. If 'field' and 'aggregationType' are both omitted the metric to observe is throughput.`
    ),
});

export function createObservabilityGetMetricChangePointsTool({
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
  const toolDefinition: BuiltinToolDefinition<typeof getMetricChangePointsSchema> = {
    id: OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes metrics to detect statistically significant changes like spikes and dips, in specific metric patterns.

How it works:
It uses the "auto_date_histogram" aggregation to group metrics by time and then detects change points (spikes/dips) within each time bucket.`,
    schema: getMetricChangePointsSchema,
    tags: ['observability', 'metrics'],
    handler: async ({ start, end, metrics = [] }, { esClient }) => {
      try {
        if (metrics.length === 0) {
          throw new Error('No metrics found');
        }

        const metricIndexPatterns = await getMetricsIndices({ core, plugins, logger });

        const metricChangePoints = await Promise.all(
          metrics.map(
            async ({
              name,
              index = metricIndexPatterns.join(','),
              kqlFilter: kqlFilterValue,
              groupBy = [],
              field,
              aggregationType = 'count',
            }) => {
              return await getMetricChangePoints({
                name,
                index,
                esClient,
                start,
                end,
                kqlFilter: kqlFilterValue,
                groupBy,
                aggregationType,
                field,
              });
            }
          )
        );

        const topMetricChangePoints = orderBy(metricChangePoints.flat(), [
          (item) => item.changes.p_value,
        ]).slice(0, 25);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                changePoints: {
                  metrics: topMetricChangePoints,
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
