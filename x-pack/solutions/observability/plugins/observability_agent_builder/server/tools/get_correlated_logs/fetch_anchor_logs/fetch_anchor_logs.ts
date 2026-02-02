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

export async function getAnchorLogs({
  esClient,
  logsIndices,
  startTime,
  endTime,
  kqlFilter,
  errorLogsOnly,
  correlationFields,
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
  correlationFields: string[];
  logger: Logger;
  logId?: string;
  maxSequences: number;
}): Promise<AnchorLog[]> {
  if (logId) {
    const anchor = await getAnchorLogById({
      esClient,
      logsIndices,
      logId,
      correlationFields,
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
    correlationFields,
    logger,
    maxSequences,
  });
}
