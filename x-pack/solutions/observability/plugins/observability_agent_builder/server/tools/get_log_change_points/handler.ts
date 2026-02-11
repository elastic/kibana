/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { orderBy } from 'lodash';
import { getTotalHits } from '../../utils/get_total_hits';
import { type Bucket, getChangePoints } from '../../utils/get_change_points';
import { parseDatemath } from '../../utils/time';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { getTypedSearch } from '../../utils/get_typed_search';

function getProbability(totalHits: number): number {
  const probability = Math.min(1, 500_000 / totalHits);
  return probability > 0.5 ? 1 : probability;
}

async function getLogChangePoint({
  index,
  start,
  end,
  kqlFilter: kqlFilterValue,
  messageField,
  esClient,
}: {
  index: string;
  start: string;
  end: string;
  kqlFilter?: string;
  messageField: string;
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
            field: messageField,
            size: 1000,
          },
          aggs: {
            time_series: {
              auto_date_histogram: {
                field: '@timestamp',
                buckets: 100,
              },
            },
            changes: {
              change_point: {
                buckets_path: 'time_series>_count',
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
    buckets: buckets as Bucket[],
  });
}

export async function getToolHandler({
  esClient,
  start,
  end,
  index,
  kqlFilter: kqlFilterValue,
  messageField,
}: {
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index: string;
  kqlFilter?: string;
  messageField: string;
}) {
  const logChangePoints = await getLogChangePoint({
    index,
    esClient,
    start,
    end,
    kqlFilter: kqlFilterValue,
    messageField,
  });

  return orderBy(logChangePoints.flat(), [(item) => item.changes.p_value]).slice(0, 25);
}
