/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { orderBy } from 'lodash';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getMetricsIndices } from '../../utils/get_metrics_indices';
import { type Bucket, getChangePoints } from '../../utils/get_change_points';
import { parseDatemath } from '../../utils/time';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';

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

  const aggregations = {
    groups: {
      ...groupAgg,
      aggs: {
        over_time: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: 100,
          },
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

export async function getToolHandler({
  core,
  plugins,
  logger,
  esClient,
  start,
  end,
  metrics,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  metrics: {
    name: string;
    aggregationType?: MetricType;
    field?: string;
    index?: string;
    kqlFilter?: string;
    groupBy?: string[];
  }[];
}) {
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

  return orderBy(metricChangePoints.flat(), [(item) => item.changes.p_value]).slice(0, 25);
}
