/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { getTypedSearch } from '../../utils/get_typed_search';
import { getTotalHits } from '../../utils/get_total_hits';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { parseDatemath } from '../../utils/time';
import { warningAndAboveLogFilter } from '../../utils/ecs_otel_fields';

export async function getToolHandler({
  core,
  logger,
  esClient,
  index,
  start,
  end,
  kqlFilter: kuery,
  fields,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
  esClient: IScopedClusterClient;
  index?: string;
  start: string;
  end: string;
  kqlFilter?: string;
  fields: string[];
}) {
  const logsIndices = index?.split(',') ?? (await getLogsIndices({ core, logger }));
  const boolFilters = [
    ...timeRangeFilter('@timestamp', {
      start: parseDatemath(start),
      end: parseDatemath(end, { roundUp: true }),
    }),
    ...kqlFilter(kuery),
    { exists: { field: 'message' } },
  ];

  const [highSeverityCategories, lowSeverityCategories] = await Promise.all([
    getLogCategories({
      esClient,
      logsIndices,
      boolQuery: { filter: boolFilters, must: [warningAndAboveLogFilter()] },
      logger,
      categoryCount: 20,
      fields,
      field: 'message',
    }),
    getLogCategories({
      esClient,
      logsIndices,
      boolQuery: { filter: boolFilters, must_not: [warningAndAboveLogFilter()] },
      logger,
      categoryCount: 10,
      fields,
      field: 'message',
    }),
  ]);

  return { highSeverityCategories, lowSeverityCategories };
}

export async function getLogCategories({
  esClient,
  logsIndices,
  boolQuery,
  logger,
  categoryCount,
  fields,
  field = 'message',
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  boolQuery: QueryDslBoolQuery;
  logger: Logger;
  categoryCount: number;
  fields: string[];
  field?: string;
}) {
  const search = getTypedSearch(esClient.asCurrentUser);

  // Count total documents to determine sampling probability
  const countResponse = await search({
    index: logsIndices,
    size: 0,
    track_total_hits: true,
    query: { bool: boolQuery },
  });

  const totalHits = getTotalHits(countResponse);
  if (totalHits === 0) {
    logger.debug(
      `No log documents found for field "${field}", filter: ${JSON.stringify(boolQuery)}`
    );
    return undefined;
  }

  // Calculate sampling probability to get ~10,000 samples
  const targetSampleSize = 10000;
  const rawSamplingProbability = targetSampleSize / totalHits;
  const samplingProbability = rawSamplingProbability < 0.5 ? rawSamplingProbability : 1; // probability must be between 0.0 and 0.5 or exactly 1.0

  logger.debug(
    `Total log documents: ${totalHits}, using sampling probability: ${samplingProbability.toFixed(
      4
    )} for field "${field}", filter: ${JSON.stringify(boolQuery)}`
  );

  const response = await search({
    index: logsIndices,
    size: 0,
    track_total_hits: false,
    query: { bool: boolQuery },
    aggregations: {
      sampler: {
        random_sampler: { probability: samplingProbability, seed: 1 },
        aggs: {
          categories: {
            categorize_text: {
              field,
              size: categoryCount,
              min_doc_count: 1,
            },
            aggs: {
              sample: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: [field, '@timestamp', ...fields],
                  sort: {
                    '@timestamp': { order: 'desc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const categories =
    response.aggregations?.sampler?.categories?.buckets?.map((bucket) => ({
      pattern: bucket.key,
      regex: bucket.regex,
      count: bucket.doc_count,
      sample: bucket.sample?.hits?.hits?.[0]?.fields,
    })) ?? [];

  return { categories, totalHits, samplingProbability };
}
