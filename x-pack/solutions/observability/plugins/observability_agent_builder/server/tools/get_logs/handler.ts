/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { orderBy, uniq } from 'lodash';
import moment from 'moment';
import { ERROR_EXC_MESSAGE } from '@kbn/apm-types';
import { computeSamplingProbability } from '../../utils/compute_sampling_probability';
import { timeRangeFilter, kqlFilter as kqlFilterToDsl } from '../../utils/dsl_filters';
import type { TypedSearch } from '../../utils/get_typed_search';
import { getTypedSearch } from '../../utils/get_typed_search';
import { getTotalHits } from '../../utils/get_total_hits';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import { parseDatemath } from '../../utils/time';
import { FACET_FIELDS, MAX_FIELD_VALUE_LENGTH } from './constants';

export function getDefaultBucketSize(startMs: number, endMs: number): string {
  const duration = moment.duration(endMs - startMs, 'ms');
  const bucketSizeSeconds = Math.max(calculateAuto.near(30, duration)?.asSeconds() ?? 0, 1);
  return `${bucketSizeSeconds}s`;
}

interface GetLogsParams {
  start: string;
  end: string;
  index: string;
  kqlFilter?: string;
  limit: number;
  bucketSize: string;
  groupBy?: string;
  fields: string[];
}

export interface GetLogsResult {
  histogram: Array<{ bucket: string; count: number; group?: string }>;
  totalCount: number;
  samples: Array<{ _id?: string; _index?: string; [key: string]: unknown }>;
  categories: Array<{
    type: 'log' | 'exception';
    pattern: string;
    count: number;
    sample: { _id?: string; _index?: string; [key: string]: unknown };
  }>;
  topValues: Record<string, Array<{ value: string; count: number }>>;
}

export async function getLogsHandler({
  esClient,
  params,
}: {
  esClient: ElasticsearchClient;
  params: GetLogsParams;
}): Promise<GetLogsResult> {
  const { start, end, index, kqlFilter, limit, bucketSize, groupBy: groupByField, fields } = params;

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });
  if (!startMs || !endMs) {
    throw new Error(`Invalid date range: start="${start}", end="${end}"`);
  }

  const searchClient = getTypedSearch(esClient);
  const baseFilter = [
    ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
    ...kqlFilterToDsl(kqlFilter),
  ];

  const countResponse = await searchClient({
    index,
    size: 0,
    track_total_hits: true,
    query: { bool: { filter: baseFilter } },
  });

  const totalCount = getTotalHits(countResponse);

  if (totalCount === 0) {
    return { histogram: [], totalCount: 0, samples: [], categories: [], topValues: {} };
  }

  const samplingProbability = computeSamplingProbability({
    totalHits: totalCount,
    targetSampleSize: 10_000,
  });

  const sampleFields = uniq(['@timestamp', ...fields]);

  const response = await searchLogs(searchClient, {
    index,
    limit,
    sampleFields,
    bucketSize,
    groupByField,
    samplingProbability,
    baseFilter,
  });

  const histogram = parseHistogram(response);
  const samples = parseSamples(response);
  const categories = parseCategories(response);
  const topValues = parseTopValues(response);

  return { histogram, totalCount, samples, categories, topValues };
}

async function searchLogs(
  searchClient: TypedSearch,
  params: {
    index: string;
    limit: number;
    sampleFields: string[];
    bucketSize: string;
    groupByField?: string;
    samplingProbability: number;
    baseFilter: QueryDslQueryContainer[];
  }
) {
  const { index, limit, sampleFields, bucketSize, groupByField, samplingProbability, baseFilter } =
    params;

  const categorizeTextAgg = (field: string) => ({
    categorize_text: {
      field,
      size: 30,
      min_doc_count: 1,
    },
    aggs: {
      sample: {
        top_hits: {
          size: 1,
          _source: false,
          fields: sampleFields,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        },
      },
    },
  });

  return searchClient({
    index,
    size: limit,
    track_total_hits: false,
    _source: false,
    fields: sampleFields,
    sort: [{ '@timestamp': { order: 'desc' as const } }],
    query: { bool: { filter: baseFilter } },
    aggregations: {
      histogram: {
        date_histogram: {
          field: '@timestamp' as const,
          fixed_interval: bucketSize,
          min_doc_count: 0,
        },
        ...(groupByField ? { aggs: { groups: { terms: { field: groupByField, size: 10 } } } } : {}),
      },
      sampler: {
        random_sampler: { probability: samplingProbability, seed: 1 },
        aggs: {
          logCategories: {
            filter: { exists: { field: 'message' } },
            aggs: {
              patterns: categorizeTextAgg('message'),
            },
          },
          exceptionCategories: {
            filter: {
              bool: {
                must: [{ exists: { field: ERROR_EXC_MESSAGE } }],
                must_not: [{ exists: { field: 'message' } }],
              },
            },
            aggs: {
              patterns: categorizeTextAgg(ERROR_EXC_MESSAGE),
            },
          },
        },
      },
      ...Object.fromEntries(FACET_FIELDS.map((field) => [field, { terms: { field, size: 10 } }])),
    },
  });
}

type LogSearchResponse = Awaited<ReturnType<typeof searchLogs>>;

function parseHistogram(response: LogSearchResponse) {
  const buckets = response.aggregations?.histogram?.buckets ?? [];

  return buckets.flatMap((b) => {
    const groupBuckets = b.groups?.buckets ?? [];

    // no `groupBy` supplied
    if (!groupBuckets.length) {
      return [{ bucket: b.key_as_string, count: b.doc_count }];
    }

    // `groupBy` supplied
    const entries = groupBuckets.map((gb) => ({
      bucket: b.key_as_string,
      count: gb.doc_count,
      group: String(gb.key),
    }));

    const sumOther = b.groups?.sum_other_doc_count ?? 0;
    if (sumOther > 0) {
      entries.push({ bucket: b.key_as_string, count: sumOther, group: '_other' });
    }

    return entries;
  });
}

function parseSamples(response: LogSearchResponse) {
  return (response.hits?.hits ?? []).map((hit) => {
    const hitFields = Object.fromEntries(
      Object.entries(unwrapEsFields(hit.fields))
        .filter(([, value]) => value != null)
        .map(([name, value]) => [name, truncateFieldValue(value)])
    );
    return { _id: hit._id, _index: hit._index, ...hitFields };
  });
}

function parseCategories(response: LogSearchResponse) {
  const sampler = response.aggregations?.sampler;

  const parseBuckets = (
    buckets: typeof logBuckets,
    type: GetLogsResult['categories'][number]['type']
  ) =>
    buckets.map((bucket) => {
      const hit = bucket.sample?.hits?.hits?.[0];
      const hitFields = Object.fromEntries(
        Object.entries(unwrapEsFields(hit.fields))
          .filter(([, value]) => value != null)
          .map(([name, value]) => [name, truncateFieldValue(value)])
      );

      return {
        type,
        pattern: bucket.key,
        count: bucket.doc_count,
        sample: { _id: hit?._id, _index: hit?._index, ...hitFields },
      };
    });

  const logBuckets = sampler?.logCategories?.patterns?.buckets ?? [];
  const exceptionBuckets = sampler?.exceptionCategories?.patterns?.buckets ?? [];

  return orderBy(
    [...parseBuckets(logBuckets, 'log'), ...parseBuckets(exceptionBuckets, 'exception')],
    'count',
    'desc'
  );
}

function parseTopValues(response: LogSearchResponse) {
  const aggs = response.aggregations as
    | Record<string, { buckets: Array<{ key: string; doc_count: number }> }>
    | undefined;

  const topValues: GetLogsResult['topValues'] = {};
  for (const field of FACET_FIELDS) {
    const termsBuckets = aggs?.[field]?.buckets ?? [];
    if (termsBuckets.length > 0) {
      topValues[field] = termsBuckets.map((b) => ({
        value: String(b.key),
        count: b.doc_count,
      }));
    }
  }

  return topValues;
}

function truncateFieldValue(value: unknown): unknown {
  if (typeof value === 'string' && value.length > MAX_FIELD_VALUE_LENGTH) {
    return value.slice(0, MAX_FIELD_VALUE_LENGTH) + '...';
  }
  return value;
}
