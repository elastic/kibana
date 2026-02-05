/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy, first, get } from 'lodash';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlFilter as buildKqlFilter, timeRangeFilter } from '../../../utils/dsl_filters';
import type { AnchorLog } from '../types';

export async function getCorrelationIdentifierTraceDocs({
  apmEventClient,
  startTime,
  endTime,
  kqlFilter,
  correlationFields,
  maxSequences,
}: {
  apmEventClient: APMEventClient;
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  correlationFields: string[];
  maxSequences: number;
}): Promise<AnchorLog[]> {
  const response = await apmEventClient.search('observability_agent_builder_get_trace_docs', {
    apm: {
      events: [ProcessorEvent.transaction, ProcessorEvent.span, ProcessorEvent.error],
    },
    size: Math.max(100, maxSequences * 10), // Oversample
    track_total_hits: false,
    _source: false,
    fields: ['@timestamp', ...correlationFields],
    sort: [{ '@timestamp': { order: 'desc' } }],
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...buildKqlFilter(kqlFilter),
          {
            bool: {
              should: correlationFields.map((field) => ({ exists: { field } })),
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    // aggs: buildDiversifiedSamplerAggregations(correlationFields, maxSequences),
  });

  // const anchorLogs = parseAnchorLogsFromAggregations(
  //   response.aggregations as CorrelationFieldAggregations | undefined,
  //   correlationFields
  // );

  // return anchorLogs.slice(0, maxSequences);

  const hits = response.hits.hits as Array<{
    _id: string;
    fields?: Record<string, unknown>;
  }>;

  const anchors = hits
    .map((hit): AnchorLog | undefined => {
      return getAnchorFromHit(hit as SearchHit, correlationFields);
    })
    .filter((anchor): anchor is AnchorLog => anchor != null);

  return uniqBy(anchors, (a) => `${a!.correlation.field}:${a!.correlation.value}`).slice(
    0,
    maxSequences
  );
}

function getAnchorFromHit(hit: SearchHit, correlationFields: string[]): AnchorLog | undefined {
  if (!hit) return undefined;

  const correlationIdentifier = correlationFields
    .map((correlationField) => {
      const timestamp = first(hit.fields?.['@timestamp']) as string;
      const value = first(get(hit.fields, correlationField)) as string;
      const anchorId = hit._id as string;

      return {
        '@timestamp': timestamp,
        correlation: { field: correlationField, value, anchorLogId: anchorId },
      };
    })
    .find(({ correlation }) => correlation.value != null);

  return correlationIdentifier;
}
