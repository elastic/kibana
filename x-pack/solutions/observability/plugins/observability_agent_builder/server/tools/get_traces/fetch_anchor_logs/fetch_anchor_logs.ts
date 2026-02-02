/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { AnchorLog } from '../types';
import { getAnchorLogById } from './fetch_anchor_log_by_id';
import { getAnchorLogsForTimeRange } from './get_anchor_logs_for_time_range';

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

export async function getAnchorLogs({
  esClient,
  logsIndices,
  startTime,
  endTime,
  kqlFilter,
  errorLogsOnly,
  logger,
  logId,
  maxSequences,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  errorLogsOnly: boolean;
  logger: Logger;
  logId?: string;
  maxSequences: number;
}): Promise<AnchorLog[]> {
  if (logId) {
    const anchor = await getAnchorLogById({
      esClient,
      logsIndices,
      logId,
      correlationFields: CORRELATION_IDENTIFIER_FIELDS,
      logger,
    });
    return anchor ? [anchor] : [];
  }

  return getAnchorLogsForTimeRange({
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
}
