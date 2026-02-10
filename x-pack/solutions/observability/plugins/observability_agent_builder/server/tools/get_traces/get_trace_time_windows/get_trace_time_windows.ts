/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { TraceTimeWindow } from '../types';
import { getTraceIds } from './get_trace_ids';

export async function getTraceTimeWindows({
  esClient,
  indices,
  startTime,
  endTime,
  kqlFilter,
  logger,
  maxTraceSize,
}: {
  esClient: IScopedClusterClient;
  indices: string[];
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  logger: Logger;
  maxTraceSize: number;
}): Promise<TraceTimeWindow[]> {
  const traceIds = await getTraceIds({
    esClient,
    indices,
    startTime,
    endTime,
    kqlFilter,
    logger,
    maxTraceSize,
  });

  return traceIds.map((traceIdSample) => {
    const { traceId, timestamp } = traceIdSample;
    const start = moment(timestamp).subtract(1, 'hour').valueOf();
    const end = moment(timestamp).add(1, 'hour').valueOf();
    return {
      traceId,
      start,
      end,
    };
  });
}
