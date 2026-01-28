/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import {
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  HTTP_REQUEST_METHOD,
  HTTP_RESPONSE_STATUS_CODE,
  SERVICE_ENVIRONMENT,
  SERVICE_LANGUAGE_NAME,
  SERVICE_NAME,
  SPAN_ID,
  TRACE_ID,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_PAGE_URL,
  URL_FULL,
} from '@kbn/observability-shared-plugin/common';
import { ERROR_STACK_TRACE } from '@kbn/apm-types/es_fields';
import { ERROR_GROUP_ID as ERROR_GROUP_ID_MD } from '@kbn/observability-shared-plugin/common';
import { timeRangeFilter, kqlFilter as buildKqlFilter } from '../../utils/dsl_filters';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import type { ApmEventClient } from './types';
import { getFirstSeenPerGroup } from './get_first_seen_per_group';
import { getDownstreamServicePerGroup } from './get_downstream_service_resource';

export type ErrorGroupSample = Awaited<ReturnType<typeof getErrorGroupSamples>>[number];

// Span exceptions captured by Otel agents are represented as APM error documents
// This function thus returns both APM error groups and Otel span exceptions
export async function getApplicationExceptionGroups({
  apmEventClient,
  startMs,
  endMs,
  kqlFilter,
  includeStackTrace,
  includeFirstSeen,
  size,
  logger,
}: {
  apmEventClient: ApmEventClient;
  startMs: number;
  endMs: number;
  kqlFilter: string | undefined;
  includeStackTrace: boolean;
  includeFirstSeen: boolean;
  size: number;
  logger: Logger;
}) {
  const errorGroups = await getErrorGroupSamples({
    apmEventClient,
    startMs,
    endMs,
    kqlFilter,
    includeStackTrace,
    size,
    logger,
  });

  const [firstSeenMap, downstreamServiceMap] = await Promise.all([
    includeFirstSeen
      ? getFirstSeenPerGroup({ apmEventClient, errorGroups, endMs, logger })
      : new Map<string, string>(),
    getDownstreamServicePerGroup({ apmEventClient, errorGroups, startMs, endMs, logger }),
  ]);

  return errorGroups.map((errorGroup) => {
    const groupId = errorGroup.sample[ERROR_GROUP_ID_MD];
    const downstreamServiceResource = downstreamServiceMap.get(groupId);
    const firstSeen = firstSeenMap.get(groupId);

    return { ...errorGroup, firstSeen, downstreamServiceResource };
  });
}

async function getErrorGroupSamples({
  apmEventClient,
  startMs,
  endMs,
  kqlFilter,
  includeStackTrace,
  size,
  logger,
}: {
  apmEventClient: ApmEventClient;
  startMs: number;
  endMs: number;
  kqlFilter: string | undefined;
  includeStackTrace: boolean;
  size: number;
  logger: Logger;
}) {
  logger.debug(`Fetching error groups, kqlFilter: ${kqlFilter ?? 'none'}`);

  const response = await apmEventClient.search('get_error_groups', {
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
      error_groups: {
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
              fields: [
                '_index',
                // Error fields
                ERROR_CULPRIT,
                ERROR_EXC_HANDLED,
                ERROR_EXC_MESSAGE,
                ERROR_EXC_TYPE,
                ERROR_GROUP_ID,
                ERROR_LOG_MESSAGE,

                // Service fields
                SERVICE_ENVIRONMENT,
                SERVICE_LANGUAGE_NAME,
                SERVICE_NAME,

                // Trace fields
                SPAN_ID,
                TRACE_ID,
                TRANSACTION_ID,
                TRANSACTION_NAME,

                // HTTP fields
                HTTP_REQUEST_METHOD,
                HTTP_RESPONSE_STATUS_CODE,
                TRANSACTION_PAGE_URL,
                URL_FULL,

                // Stack trace if requested
                ...(includeStackTrace ? [ERROR_STACK_TRACE] : []),
              ],
              sort: [{ '@timestamp': 'desc' as const }],
            },
          },
        },
      },
    },
  });

  const buckets = response.aggregations?.error_groups?.buckets ?? [];

  return buckets.map((bucket) => {
    const sample = unwrapEsFields(bucket.sample?.hits?.hits?.[0]?.fields) as {
      [ERROR_GROUP_ID]: string;
      [TRACE_ID]: string | undefined;
      [SERVICE_NAME]: string | undefined;
      [key: string]: unknown;
    };
    const lastSeen = bucket.last_seen?.value
      ? new Date(bucket.last_seen?.value).toISOString()
      : undefined;

    const count = bucket.doc_count;

    return { count, lastSeen, sample };
  });
}
