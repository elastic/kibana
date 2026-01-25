/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_ID,
  TRACE_ID,
} from '@kbn/observability-shared-plugin/common';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { getTypedSearch } from '../../utils/get_typed_search';
import { getTotalHits } from '../../utils/get_total_hits';
import { timeRangeFilter, kqlFilter } from '../../utils/dsl_filters';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';

// OTel exception fields (not in ECS, specific to OTel semantic conventions)
// See: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
const EXCEPTION_TYPE = 'exception.type';
const EXCEPTION_MESSAGE = 'exception.message';
const EXCEPTION_STACKTRACE = 'exception.stacktrace';
const OTEL_EVENT_NAME = 'event.name';

export type LogExceptionGroup = Awaited<ReturnType<typeof getLogExceptionGroups>>[number];

async function getSamplingProbability({
  esClient,
  index,
  boolQuery,
}: {
  esClient: IScopedClusterClient;
  index: string[];
  boolQuery: Record<string, unknown>;
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

async function getExceptionCategories({
  esClient,
  index,
  boolQuery,
  samplingProbability,
  includeStackTrace,
}: {
  esClient: IScopedClusterClient;
  index: string[];
  boolQuery: Record<string, unknown>;
  samplingProbability: number;
  includeStackTrace?: boolean;
}) {
  const search = getTypedSearch(esClient.asCurrentUser);

  const sampleFields = [
    '@timestamp',
    '_index',
    EXCEPTION_TYPE,
    EXCEPTION_MESSAGE,
    SERVICE_NAME,
    SERVICE_ENVIRONMENT,
    TRACE_ID,
    SPAN_ID,
    ...(includeStackTrace ? [EXCEPTION_STACKTRACE] : []),
  ];

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
              field: EXCEPTION_MESSAGE,
              size: 50,
              min_doc_count: 1,
            },
            aggs: {
              last_seen: { max: { field: '@timestamp' } },
              sample: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: sampleFields,
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
    const hit = bucket.sample?.hits?.hits?.[0];
    const fields = unwrapEsFields(hit?.fields as Record<string, unknown[]>);

    // Include the index from the hit metadata
    const hitIndex = hit?._index;
    if (hitIndex) {
      fields._index = hitIndex;
    }

    const lastSeen = bucket.last_seen?.value
      ? new Date(bucket.last_seen.value).toISOString()
      : undefined;

    return {
      pattern: bucket.key as string,
      count: bucket.doc_count,
      lastSeen,
      sample: fields,
    };
  });
}

/**
 * Queries log indices for exceptions that haven't been processed into error format.
 * Uses categorize_text aggregation to group similar exception messages.
 *
 * Exceptions in logs are identified by:
 * - event.name: "exception" (per OTel semantic conventions)
 * - OR exception.type field exists
 * - AND processor.event does NOT exist (not processed into error format)
 */
export async function getLogExceptionGroups({
  core,
  esClient,
  startMs,
  endMs,
  kqlFilter: kqlFilterValue,
  includeStackTrace,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  esClient: IScopedClusterClient;
  startMs: number;
  endMs: number;
  kqlFilter?: string;
  includeStackTrace?: boolean;
  logger: Logger;
}) {
  const logsIndices = await getLogsIndices({ core, logger });

  if (logsIndices.length === 0) {
    logger.debug('No log indices configured, skipping OTel log exceptions query');
    return [];
  }

  const boolQuery = {
    filter: [
      ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
      ...kqlFilter(kqlFilterValue),
    ],
    // Match OTel exception events: either event.name is "exception" or exception.type exists
    should: [{ term: { [OTEL_EVENT_NAME]: 'exception' } }, { exists: { field: EXCEPTION_TYPE } }],
    minimum_should_match: 1,
    // Exclude documents already processed by APM (they have processor.event field)
    must_not: [{ exists: { field: PROCESSOR_EVENT } }],
  };

  const { samplingProbability, totalHits } = await getSamplingProbability({
    esClient,
    index: logsIndices,
    boolQuery,
  });

  if (totalHits === 0) {
    logger.debug('No OTel log exceptions found');
    return [];
  }

  logger.debug(
    `OTel log exceptions: ${totalHits} total, sampling probability: ${samplingProbability.toFixed(
      4
    )}`
  );

  return getExceptionCategories({
    esClient,
    index: logsIndices,
    boolQuery,
    samplingProbability,
    includeStackTrace,
  });
}
