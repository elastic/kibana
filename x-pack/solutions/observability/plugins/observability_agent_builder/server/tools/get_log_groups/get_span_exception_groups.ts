/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import { ERROR_GROUP_ID } from '@kbn/apm-types/es_fields';
import { timeRangeFilter, kqlFilter as buildKqlFilter } from '../../utils/dsl_filters';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import type { ApmEventClient } from './types';
import { getFirstSeenPerGroup } from './get_first_seen_per_group';

export type SpanExceptionSample = Awaited<ReturnType<typeof getSpanExceptionSamples>>[number];

// Span exceptions captured by Otel agents are represented as APM error documents
// This function thus returns both APM error groups and Otel span exceptions
export async function getSpanExceptionGroups({
  apmEventClient,
  startMs,
  endMs,
  kqlFilter,
  includeFirstSeen,
  size,
  logger,
  fields,
}: {
  apmEventClient: ApmEventClient;
  startMs: number;
  endMs: number;
  kqlFilter: string | undefined;
  includeFirstSeen: boolean;
  size: number;
  logger: Logger;
  fields: string[];
}) {
  const spanExceptionSamples = await getSpanExceptionSamples({
    apmEventClient,
    startMs,
    endMs,
    kqlFilter,
    size,
    logger,
    fields,
  });

  const firstSeenMap = includeFirstSeen
    ? await getFirstSeenPerGroup({
        apmEventClient,
        spanExceptionSamples,
        endMs,
        logger,
      })
    : new Map<string, string>();

  return spanExceptionSamples.map((sample) => {
    const groupId = sample.sample[ERROR_GROUP_ID];
    const firstSeen = firstSeenMap.get(groupId);

    return {
      type: 'spanException' as const,
      ...sample,
      ...(firstSeen && { firstSeen }),
    };
  });
}

async function getSpanExceptionSamples({
  apmEventClient,
  startMs,
  endMs,
  kqlFilter,
  size,
  logger,
  fields,
}: {
  apmEventClient: ApmEventClient;
  startMs: number;
  endMs: number;
  kqlFilter: string | undefined;
  size: number;
  logger: Logger;
  fields: string[];
}) {
  logger.debug(`Fetching span exception samples, kqlFilter: ${kqlFilter ?? 'none'}`);

  const response = await apmEventClient.search('get_span_exceptions', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
          ...buildKqlFilter(kqlFilter),
        ],
      },
    },
    aggs: {
      span_exception_groups: {
        terms: {
          field: ERROR_GROUP_ID,
          size,
          order: { _count: 'desc' as const },
        },
        aggs: {
          last_seen: { max: { field: '@timestamp' } },
          sample: {
            top_hits: {
              size: 1,
              _source: false,
              fields,
              sort: [{ '@timestamp': 'desc' as const }],
            },
          },
        },
      },
    },
  });

  const buckets = response.aggregations?.span_exception_groups?.buckets ?? [];

  return buckets.map((bucket) => {
    const sample = unwrapEsFields(bucket.sample?.hits?.hits?.[0]?.fields) as {
      [ERROR_GROUP_ID]: string;
      [key: string]: unknown;
    };
    const lastSeen = bucket.last_seen?.value
      ? new Date(bucket.last_seen?.value).toISOString()
      : undefined;

    const count = bucket.doc_count;

    return { count, lastSeen, sample };
  });
}
