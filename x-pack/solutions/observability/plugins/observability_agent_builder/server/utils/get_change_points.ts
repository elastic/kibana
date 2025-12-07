/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types/src';
import { getTypedSearch } from './get_typed_search';
import { timeRangeFilter, kqlFilter } from './dsl_filters';

interface ChangePointDetails {
  change_point?: number;
  r_value?: number;
  trend?: string;
  p_value?: number;
}

interface ChangePointResult {
  type: Record<ChangePointType, ChangePointDetails>;
  bucket?: {
    key: string | number;
    key_as_string?: string;
  };
}

export interface Bucket {
  key: string | number | Array<string | number>;
  regex?: string;
  changes?: ChangePointResult;
  over_time: {
    buckets: Array<{
      key: string | number;
      key_as_string?: string;
      doc_count: number;
    }>;
  };
}

export interface ChangePoint {
  name: string;
  key: string | number | Array<string | number>;
  pattern?: string;
  over_time: Array<{ x: number; y: number }>;
  changes: ChangePointDetails & {
    time: string;
    type: ChangePointType;
  };
}

export async function searchChangePoints({
  esClient,
  index,
  start,
  end,
  kqlFilter: kuery,
  aggregations,
}: {
  esClient: IScopedClusterClient;
  index: string;
  start: string;
  end: string;
  kqlFilter?: string;
  aggregations: Record<string, AggregationsAggregationContainer>;
}) {
  const rangeFilters = timeRangeFilter('@timestamp', { start, end });
  const kqlFilters = kqlFilter(kuery);

  const search = getTypedSearch(esClient.asCurrentUser);

  return await search({
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [...rangeFilters, ...kqlFilters],
      },
    },
    aggs: aggregations,
  });
}

export async function getChangePoints({
  name,
  buckets,
}: {
  name: string;
  buckets: Bucket[];
}): Promise<ChangePoint[]> {
  const series = buckets
    .filter(
      // filter out indeterminable changes
      (bucket) => bucket.changes && !bucket.changes.type?.indeterminable
    )
    .map((bucket) => {
      const changes = bucket.changes!;
      const [changeType, value] = Object.entries(changes.type)[0];
      return {
        name,
        key: bucket.key,
        pattern: bucket.regex,
        over_time: bucket.over_time.buckets.map((group) => ({
          x: new Date(group.key).getTime(),
          y: group.doc_count,
        })),
        changes: {
          time: changes.bucket?.key ? new Date(changes.bucket.key).toISOString() : undefined,
          type: changeType,
          ...value,
        },
      };
    });

  return series;
}
