/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniqBy } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TRACE_ID,
} from '@kbn/apm-types/es_fields';
import { timeRangeFilter } from '../../utils/dsl_filters';
import { getEsField } from '../../utils/unwrap_es_fields';
import type { ApmEventClient } from './types';

interface LogGroupSample {
  sample: {
    'trace.id'?: string;
    'service.name'?: string;
    [key: string]: unknown;
  };
}

/**
 * Creates a unique key for a trace + service combination.
 */
function getTraceServiceKey(traceId: string, serviceName: string): string {
  return `${traceId}:${serviceName}`;
}

/**
 * Fetches failed downstream dependencies for logs/exceptions.
 * Looks for failed outbound spans to identify which external services are contributing to errors.
 *
 * Returns a Map keyed by "traceId:serviceName" -> downstream service resource name
 */
export async function getFailedDownstreamDependencies({
  apmEventClient,
  logGroups,
  startMs,
  endMs,
  logger,
}: {
  apmEventClient: ApmEventClient;
  logGroups: LogGroupSample[];
  startMs: number;
  endMs: number;
  logger: Logger;
}): Promise<Map<string, string>> {
  const samples = compact(
    logGroups.map(({ sample }) => {
      const traceId = sample['trace.id'];
      const serviceName = sample['service.name'];
      if (traceId && serviceName) {
        return { traceId, serviceName };
      }
    })
  );

  // Deduplicate by traceId + serviceName to avoid redundant queries
  const uniqueSamples = uniqBy(samples, ({ traceId, serviceName }) =>
    getTraceServiceKey(traceId, serviceName)
  );

  if (uniqueSamples.length === 0) {
    return new Map();
  }

  logger.debug(
    `Fetching downstream service resource for ${uniqueSamples.length} trace/service pairs`
  );

  const { responses } = await apmEventClient.msearch(
    'get_downstream_service_resource',
    ...uniqueSamples.map(({ traceId, serviceName }) => ({
      apm: {
        sources: [
          {
            documentType: ApmDocumentType.SpanEvent,
            rollupInterval: RollupInterval.None,
          },
        ],
      },
      terminate_after: 1,
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [EVENT_OUTCOME]: 'failure' } },
            { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
            ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
          ],
        },
      },
      fields: [SPAN_DESTINATION_SERVICE_RESOURCE],
      sort: [{ '@timestamp': 'desc' as const }],
    }))
  );

  // msearch returns responses in the same order as the input queries,
  // so responses[i] corresponds to uniqueSamples[i]
  const entries = compact(
    responses.map((response, i) => {
      const { traceId, serviceName } = uniqueSamples[i];
      const hit = response.hits?.hits?.[0];
      if (!hit?.fields) {
        return null;
      }

      const resource = getEsField<string>(hit.fields, SPAN_DESTINATION_SERVICE_RESOURCE);
      if (!resource) {
        return null;
      }

      const key = getTraceServiceKey(traceId, serviceName);
      return [key, resource] as const;
    })
  );

  return new Map(entries);
}

/**
 * Looks up the downstream dependency for a log group from the pre-fetched map.
 */
export function lookupDownstreamDependency(
  group: LogGroupSample,
  downstreamServiceMap: Map<string, string>
): string | undefined {
  const traceId = group.sample['trace.id'];
  const serviceName = group.sample['service.name'];

  if (typeof traceId === 'string' && typeof serviceName === 'string') {
    const key = getTraceServiceKey(traceId, serviceName);
    return downstreamServiceMap.get(key);
  }
}
