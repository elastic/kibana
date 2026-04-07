/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import moment from 'moment';
import type { EntityType } from '../../../common/domain/definitions/entity_schema';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import {
  buildLogsPerCycleCapProbeQuery,
  CAP_TS_COLUMN,
  ROW_COUNT_COLUMN,
} from './logs_cap_probe_query_builder';

export interface ResolveCappedTimeWindowParams {
  esClient: ElasticsearchClient;
  abortController?: AbortController;
  indexPatterns: string[];
  type: EntityType;
  fromDateISO: string;
  toDateISO: string;
  recoveryId?: string;
  maxLogsPerCycle: number;
}

function esqlDatetimeToIso(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return moment.utc(value).toISOString();
  }

  return undefined;
}

/**
 * Runs the cheap ES|QL probe for `maxLogsPerCycle` and returns the extraction upper bound (ISO string).
 * Used to lock the extraction to a max amount of logs and support performance management.
 *
 * This is returning a limit for after filtered documents. If we are still easily hitting performance issues, we can
 * consider moving this probe to before filter and have a hard limit of how many logs we are processing (filtered or not)
 *
 * LIMITATION: this is not an exact limit because the log extraction will process logs with same
 * timestamp as the last seen timestamp. It's considered acceptable because it's a very rare case
 * to have a lot of logs with the same timestamp.
 */
export async function resolveCappedTimeWindow(
  params: ResolveCappedTimeWindowParams
): Promise<string> {
  const { maxLogsPerCycle, toDateISO, indexPatterns } = params;
  if (maxLogsPerCycle < 1 || indexPatterns.length === 0) {
    return toDateISO;
  }

  const query = buildLogsPerCycleCapProbeQuery({
    indexPatterns: params.indexPatterns,
    type: params.type,
    fromDateISO: params.fromDateISO,
    toDateISO: params.toDateISO,
    recoveryId: params.recoveryId,
    maxLogsPerCycle,
  });

  const esqlResponse = await executeEsqlQuery({
    esClient: params.esClient,
    query,
    abortController: params.abortController,
  });

  if (esqlResponse.values.length === 0) {
    return toDateISO;
  }

  const row = esqlResponse.values[0];
  const rowCountIdx = esqlResponse.columns.findIndex((c) => c.name === ROW_COUNT_COLUMN);
  const capTsIdx = esqlResponse.columns.findIndex((c) => c.name === CAP_TS_COLUMN);
  if (rowCountIdx === -1 || capTsIdx === -1) {
    return toDateISO;
  }

  const rowCount = Number(row[rowCountIdx]);
  const capTsRaw = row[capTsIdx];
  if (rowCount !== maxLogsPerCycle) {
    return toDateISO;
  }

  const capTsIso = esqlDatetimeToIso(capTsRaw);
  if (capTsIso === undefined) {
    return toDateISO;
  }

  return capTsIso;
}
