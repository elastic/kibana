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
import type { ErrorLogDoc, AnchorLog } from './types';

export async function getCorrelatedLogsForAnchor({
  esClient,
  errorAnchor,
  logsIndices,
  logger,
  fields,
}: {
  esClient: IScopedClusterClient;
  errorAnchor: AnchorLog;
  logsIndices: string[];
  logger: Logger;
  fields: string[];
}) {
  const search = getTypedSearch(esClient.asCurrentUser);
  const { correlation, '@timestamp': timestamp } = errorAnchor;

  const start = moment(timestamp).subtract(3, 'minute').valueOf();
  const end = moment(timestamp).add(1, 'minute').valueOf();
  logger.debug(
    `Fetching correlated logs using ${correlation.field}=${correlation.value} between ${start} - ${end}`
  );

  const res = await search<ErrorLogDoc, any>({
    _source: fields,
    track_total_hits: false,
    index: logsIndices,
    size: 100,
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

  return res.hits.hits.map((hit) => hit._source!);
}
