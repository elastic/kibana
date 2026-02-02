/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { orderBy } from 'lodash';
import { type Bucket, getChangePoints } from '../../utils/get_change_points';
import { parseDatemath } from '../../utils/time';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';

type MetricType = 'min' | 'max' | 'sum' | 'count' | 'avg' | 'p95' | 'p99';

interface AggregationConfig {
  field: string;
  type: MetricType;
}

function getMetricAggregation(aggregation: AggregationConfig | undefined): {
  agg: AggregationsAggregationContainer;
  buckets_path: string;
} {
  if (!aggregation) {
    return {
      agg: {
        filter: {
          match_all: {},
        },
      },
      buckets_path: '_count',
    };
  }

  if (['min', 'max', 'sum', 'avg'].includes(aggregation.type)) {
    return {
      agg: {
        [aggregation.type]: {
          field: aggregation.field,
        },
      } as Record<Exclude<MetricType, 'count' | 'p95' | 'p99'>, { field: string }>,
      buckets_path: 'metric',
    };
  }

  const percentile = `${aggregation.type.split('p')[1]}.0`;

  return {
    agg: {
      percentiles: {
        field: aggregation.field,
        percents: [Number(percentile)],
        keyed: true,
      },
    },
    buckets_path: 'metric',
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
  index,
  start,
  end,
  kqlFilter: kuery,
  groupBy,
  aggregation,
  esClient,
}: {
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index: string;
  aggregation: AggregationConfig | undefined;
  kqlFilter?: string;
  groupBy: string[];
}) {
  const { agg: metricAgg, buckets_path: bucketsPathMetric } = getMetricAggregation(aggregation);

  const groupAgg = getGroupingAggregation(groupBy);

  const aggregations = {
    groups: {
      ...groupAgg,
      aggs: {
        time_series: {
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
            buckets_path: 'time_series>value',
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
    buckets,
  });
}

export async function getToolHandler({
  esClient,
  start,
  end,
  index,
  aggregation,
  kqlFilter: kqlFilterValue,
  groupBy,
}: {
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index: string;
  aggregation: AggregationConfig | undefined;
  kqlFilter?: string;
  groupBy: string[];
}) {
  const metricChangePoints = await getMetricChangePoints({
    esClient,
    index,
    start,
    end,
    aggregation,
    kqlFilter: kqlFilterValue,
    groupBy,
  });
  return orderBy(metricChangePoints.flat(), [(item) => item.changes.p_value]).slice(0, 25);
}
