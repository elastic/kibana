/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsAutoDateHistogramAggregation,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { ChangePointType } from '@kbn/es-types/src';

interface DateHistogramBucket {
  key: string | number;
  key_as_string?: string;
  doc_count: number;
}

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

interface CategorizeTextBucket {
  key: string;
  doc_count: number;
  regex: string;
  over_time: {
    buckets: DateHistogramBucket[];
  };
  changes: ChangePointResult;
}

interface SamplerAggregation {
  groups?: {
    buckets: CategorizeTextBucket[];
  };
}

interface LogChangesAggregations {
  sampler?: SamplerAggregation;
}

interface LogChangePoint {
  time: string;
  type: string;
  [key: string]: any;
}

interface LogChangeResult {
  key: string;
  pattern: string;
  over_time: Array<{
    x: number;
    y: number;
  }>;
  changes: { type: ChangePointType } | LogChangePoint;
}

export async function getLogChangePoint({
  index,
  filters,
  field,
  esClient,
  dateHistogram,
}: {
  index: string;
  filters: QueryDslQueryContainer[];
  field: string;
  esClient: IScopedClusterClient;
  dateHistogram: AggregationsAutoDateHistogramAggregation;
}): Promise<LogChangeResult[]> {
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

  const response = await esClient.asCurrentUser.search<unknown, LogChangesAggregations>({
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

  return buckets.map((group: CategorizeTextBucket): LogChangeResult => {
    const changes = group.changes;

    const isIndeterminable =
      !changes || changes.type?.indeterminable === true || !changes.bucket?.key;

    return {
      key: group.key,
      pattern: group.regex,
      over_time: group.over_time.buckets.map((bucket: DateHistogramBucket) => ({
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
