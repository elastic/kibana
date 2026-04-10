/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UploadWatchlistCsvResponse,
  WatchlistCsvUploadResponseItem,
} from '../../../../../../common/api/entity_analytics/watchlists/csv_upload/csv_upload.gen';
import { getIndexForWatchlist } from '../../entities/utils';
import { CSV_BATCH_SIZE } from './constants';
import type { CsvUploadOpts } from './types';
import { createCsvStream, validateCsvHeader } from './parse';
import { processBatch } from './process_batch';

export type { UploadWatchlistCsvResponse as CsvUploadResponse };

const summarise = (results: WatchlistCsvUploadResponseItem[]): UploadWatchlistCsvResponse => {
  const total = results.length;
  const successful = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'failure').length;
  const unmatched = results.filter((r) => r.status === 'unmatched').length;
  return { total, successful, failed, unmatched, items: results };
};

export const csvUpload = async (opts: CsvUploadOpts): Promise<UploadWatchlistCsvResponse> => {
  const {
    entityStoreClient,
    esClient,
    fileStream,
    logger,
    watchlist,
    namespace,
    batchSize = CSV_BATCH_SIZE,
  } = opts;

  const watchlistWithIndex = { ...watchlist, index: getIndexForWatchlist(namespace) };
  const results: WatchlistCsvUploadResponseItem[] = [];
  const parsedStream = createCsvStream(fileStream);

  const next = (batch: Array<Record<string, unknown>>, index: number) =>
    processBatch({
      entityStoreClient,
      esClient,
      batch,
      logger,
      results,
      startIndex: index,
      watchlist: watchlistWithIndex,
    });

  let headersValidated = false;
  let batch: Array<Record<string, unknown>> = [];
  let startIndex = 0;
  for await (const untypedRow of parsedStream) {
    const row = untypedRow as Record<string, unknown>;

    if (!headersValidated) {
      validateCsvHeader(Object.keys(row));
      headersValidated = true;
    }

    batch.push(row);

    if (batch.length >= batchSize) {
      await next(batch, startIndex);
      startIndex += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await next(batch, startIndex);
  }

  return summarise(results);
};
