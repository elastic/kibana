/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import { getTypedSearch } from '../../utils/get_typed_search';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import { getTotalHits } from '../../utils/get_total_hits';

export async function getSamplingProbability({
  esClient,
  index,
  boolQuery,
}: {
  esClient: IScopedClusterClient;
  index: string[];
  boolQuery: QueryDslBoolQuery;
}) {
  const search = getTypedSearch(esClient.asCurrentUser);

  const countResponse = await search({
    index,
    size: 0,
    track_total_hits: true,
    query: { bool: boolQuery },
  });

  const totalHits = getTotalHits(countResponse);

  // Calculate sampling probability to get ~10,000 samples
  const targetSampleSize = 10000;
  const rawSamplingProbability = targetSampleSize / totalHits;
  // probability must be between 0.0 and 0.5 or exactly 1.0
  const samplingProbability = rawSamplingProbability < 0.5 ? rawSamplingProbability : 1;

  return { samplingProbability, totalHits };
}

export async function getCategorizedLogs({
  esClient,
  index,
  boolQuery,
  samplingProbability,
  size,
  fields,
  messageField,
  type,
}: {
  esClient: IScopedClusterClient;
  index: string[];
  boolQuery: QueryDslBoolQuery;
  samplingProbability: number;
  size: number;
  fields: string[];
  messageField: string;
  type: 'log' | 'logException';
}) {
  const search = getTypedSearch(esClient.asCurrentUser);

  const response = await search({
    index,
    size: 0,
    track_total_hits: false,
    query: { bool: boolQuery },
    aggregations: {
      sampler: {
        random_sampler: { probability: samplingProbability, seed: 1 },
        aggs: {
          categories: {
            categorize_text: {
              field: messageField,
              size,
              min_doc_count: 1,
            },
            aggs: {
              last_seen: { max: { field: '@timestamp' } },
              sample: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields,
                  sort: [{ '@timestamp': { order: 'desc' as const } }],
                },
              },
            },
          },
        },
      },
    },
  });

  const buckets = response.aggregations?.sampler?.categories?.buckets ?? [];

  return buckets.map((bucket) => {
    const sampleFields = unwrapEsFields(bucket.sample?.hits?.hits?.[0]?.fields);

    const lastSeen = bucket.last_seen?.value
      ? new Date(bucket.last_seen.value).toISOString()
      : undefined;

    return {
      type,
      pattern: bucket.key,
      count: bucket.doc_count,
      lastSeen,
      sample: sampleFields,
    };
  });
}
