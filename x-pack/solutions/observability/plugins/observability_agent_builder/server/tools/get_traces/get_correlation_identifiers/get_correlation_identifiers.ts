/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { Correlation } from '../types';
import { getAnchors } from './get_anchors';
import { warningAndAboveLogFilter } from '../../../utils/warning_and_above_log_filter';

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
  logsIndices,
  apmIndexPatterns,
  startTime,
  endTime,
  kqlFilter,
  errorLogsOnly,
  logger,
  maxSequences,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  apmIndexPatterns: string[];
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  errorLogsOnly: boolean;
  logger: Logger;
  maxSequences: number;
}): Promise<Correlation[]> {
  const logAnchors = await getAnchors({
    esClient,
    logsIndices,
    startTime,
    endTime,
    kqlFilter,
    // filter by error severity (default) or include all logs
    query: errorLogsOnly ? [warningAndAboveLogFilter()] : [],
    correlationFields: CORRELATION_IDENTIFIER_FIELDS,
    logger,
    maxSequences,
  });

  const apmAnchors = await getAnchors({
    esClient,
    logsIndices: apmIndexPatterns,
    startTime,
    endTime,
    kqlFilter,
    correlationFields: CORRELATION_IDENTIFIER_FIELDS,
    logger,
    maxSequences,
  });

  return uniqBy(
    [...logAnchors, ...apmAnchors].map((anchor) => anchor.correlation),
    (correlation) => `${correlation.field}:${correlation.value}`
  ).slice(0, maxSequences);
}
