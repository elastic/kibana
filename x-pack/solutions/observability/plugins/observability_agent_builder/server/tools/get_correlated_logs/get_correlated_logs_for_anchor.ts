/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { getTypedSearch } from '../../utils/get_typed_search';
import { timeRangeFilter } from '../../utils/dsl_filters';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import type { AnchorLog } from './types';
import { getTotalHits } from '../../utils/get_total_hits';

export async function getCorrelatedLogsForAnchor({
  esClient,
  anchorLog,
  logsIndices,
  logger,
  logSourceFields,
  maxLogsPerSequence,
}: {
  esClient: IScopedClusterClient;
  anchorLog: AnchorLog;
  logsIndices: string[];
  logger: Logger;
  logSourceFields: string[];
  maxLogsPerSequence: number;
}) {
  const search = getTypedSearch(esClient.asCurrentUser);
  const { correlation, '@timestamp': timestamp } = anchorLog;

  const start = moment(timestamp).subtract(1, 'hour').valueOf();
  const end = moment(timestamp).add(1, 'hour').valueOf();
  logger.debug(
    `Fetching correlated logs using ${correlation.field}=${correlation.value} between ${start} - ${end}`
  );

  const res = await search({
    _source: false,
    fields: logSourceFields,
    track_total_hits: maxLogsPerSequence + 1, // +1 to check if sequence is truncated
    size: maxLogsPerSequence,
    index: logsIndices,
    sort: [{ '@timestamp': { order: 'asc' } }],
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start, end }),
          { term: { [correlation.field]: correlation.value } },
        ],
      },
    },
  });

  const totalHits = getTotalHits(res);

  return {
    logs: res.hits.hits.map((hit) => unwrapEsFields(hit.fields)),
    isTruncated: totalHits > maxLogsPerSequence,
  };
}
