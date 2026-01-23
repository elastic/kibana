/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TRACE_ID,
} from '@kbn/observability-shared-plugin/common';
import { timeRangeFilter } from '../../utils/dsl_filters';
import { getEsField } from '../../utils/unwrap_es_fields';
import type { ApmEventClient } from './types';
// Inner error group bucket type - has sample with top_hits
interface ErrorGroupBucket {
  key: string | number;
  doc_count: number;
  last_seen?: { value: number | null };
  sample?: {
    hits?: {
      hits?: Array<{ fields?: Record<string, unknown[] | undefined> }>;
    };
  };
}

/**
 * Fetches downstream service resources for errors that occurred during outbound calls.
 * Uses parallel queries (msearch) with terminate_after for efficiency.
 * Each query is scoped to the specific (traceId, serviceName) pair from the error.
 */
export async function getDownstreamServicePerGroup({
  apmEventClient,
  errorGroups,
  startMs,
  endMs,
  logger,
}: {
  apmEventClient: ApmEventClient;
  errorGroups: ErrorGroupBucket[];
  startMs: number;
  endMs: number;
  logger: Logger;
}): Promise<Map<string, string>> {
  const errorSamples = compact(
    errorGroups.map((errorGroup) => {
      const fields = errorGroup.sample?.hits?.hits?.[0]?.fields;
      const traceId = getEsField<string>(fields, TRACE_ID);
      const serviceName = getEsField<string>(fields, SERVICE_NAME);
      if (traceId && serviceName) {
        return { traceId, serviceName };
      }
    })
  );

  if (errorSamples.length === 0) {
    return new Map();
  }

  logger.debug(`Fetching downstream service resources for ${errorSamples.length} error samples`);

  const { responses } = await apmEventClient.msearch(
    'get_error_groups_downstream_resources',
    ...errorSamples.map(({ traceId, serviceName }) => ({
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
  // so responses[i] corresponds to errorSamples[i]
  const entries = compact(
    responses.map((response, i) => {
      const { traceId } = errorSamples[i];
      const hit = response.hits?.hits?.[0];
      if (!hit?.fields) {
        return null;
      }

      const resource = getEsField(hit.fields, SPAN_DESTINATION_SERVICE_RESOURCE);
      if (typeof resource !== 'string') {
        return null;
      }

      return [traceId, resource] as const;
    })
  );

  return new Map(entries);
}
