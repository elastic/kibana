/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlFilter as buildKqlFilter, timeRangeFilter } from '../../../utils/dsl_filters';
import type { Correlation } from '../types';
import {
  buildDiversifiedSamplerAggregations,
  parseAnchorLogsFromAggregations,
} from './get_anchor_logs';
import type { CorrelationFieldAggregations } from './types';

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
}): Promise<Correlation[]> {
  const response = await apmEventClient.search('observability_agent_builder_get_trace_docs', {
    apm: {
      events: [ProcessorEvent.transaction, ProcessorEvent.span, ProcessorEvent.error],
    },
    size: 0,
    track_total_hits: false,
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
    aggs: buildDiversifiedSamplerAggregations(correlationFields, maxSequences),
  });

  const anchorLogs = parseAnchorLogsFromAggregations(
    response.aggregations as CorrelationFieldAggregations | undefined,
    correlationFields
  );
  return anchorLogs.slice(0, maxSequences).map((anchor) => anchor.correlation);
}
