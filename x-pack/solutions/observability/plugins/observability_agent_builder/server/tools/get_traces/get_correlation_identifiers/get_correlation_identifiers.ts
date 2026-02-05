/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { Correlation } from '../types';
import { getAnchorLogs } from './get_anchor_logs';
import { getCorrelationIdentifierTraceDocs } from './get_correlation_identifiers_trace';

// Correlation identifier fields in priority order
const CORRELATION_IDENTIFIER_FIELDS = [
  'trace.id',
  'x-trace-id',
  'request.id',
  'request_id',
  'x_request_id',
  'transaction.id',
  'correlation.id',
  'correlation_id',
  'x-correlation-id',
  'http.request.id',
  'session.id',
  'session_id',
  'event.id',
  'cloud.trace_id',
  'parent.id',
  'span.id',
  'process.pid',
];

export async function getCorrelationIdentifiers({
  esClient,
  apmEventClient,
  logsIndices,
  startTime,
  endTime,
  kqlFilter,
  errorLogsOnly,
  logger,
  maxSequences,
}: {
  esClient: IScopedClusterClient;
  apmEventClient: APMEventClient;
  logsIndices: string[];
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  errorLogsOnly: boolean;
  logger: Logger;
  maxSequences: number;
}): Promise<Correlation[]> {
  const anchorLogs = await getAnchorLogs({
    esClient,
    logsIndices,
    startTime,
    endTime,
    kqlFilter,
    errorLogsOnly,
    correlationFields: CORRELATION_IDENTIFIER_FIELDS,
    logger,
    maxSequences,
  });

  const apmCorrelations = await getCorrelationIdentifierTraceDocs({
    apmEventClient,
    startTime,
    endTime,
    kqlFilter,
    correlationFields: CORRELATION_IDENTIFIER_FIELDS,
    maxSequences,
  });

  // Merge and de-dupe correlations to avoid redundant downstream queries.
  // - De-dupe by field+value since that is what later queries are keyed on.
  // - Preserve order (log anchors first), so `uniqBy` keeps the earliest occurrence.
  const merged = uniqBy(
    [...anchorLogs, ...apmCorrelations],
    (c) => `${c.correlation.field}:${c.correlation.value}`
  ).slice(0, maxSequences);

  return merged.map((anchor) => {
    const { correlation } = anchor;
    return {
      identifier: {
        field: correlation.field,
        value: correlation.value,
      },
      start: startTime,
      end: endTime,
    };
  });
}
