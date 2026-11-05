/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { EsClient } from '@kbn/scout-oblt';

/** A line of the bulk file: a document's `create` action, or the document after it. */
interface BulkLine {
  create?: { _index: string; _id: string };
}

// Mock EDOT Browser data, also loadable with curl for manual testing:
// `curl -XPOST -H 'Content-Type: application/x-ndjson' <es>/_bulk --data-binary @otel_rum_data.ndjson`
const readBulkLines = (): BulkLine[] =>
  readFileSync(resolve(__dirname, 'otel_rum_data.ndjson'), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));

/** Indexes the mock EDOT Browser data, leaving the documents that already exist as they are. */
export const ingestOtelRumData = async (esClient: EsClient): Promise<void> => {
  const { errors, items } = await esClient.bulk({
    operations: readBulkLines(),
    refresh: 'wait_for',
  });
  if (!errors) {
    return;
  }

  const failures = items
    .map((item) => item.create)
    .filter((result) => result?.error && result.status !== 409);
  if (failures.length > 0) {
    throw new Error(`Could not ingest the OTel RUM data: ${JSON.stringify(failures[0])}`);
  }
};

/** Deletes the mock EDOT Browser documents by their ids, leaving the rest of the data streams. */
export const deleteOtelRumData = async (esClient: EsClient): Promise<void> => {
  const documents = readBulkLines().flatMap(({ create }) =>
    create ? [{ index: create._index, id: create._id }] : []
  );

  await esClient.deleteByQuery({
    index: [...new Set(documents.map(({ index }) => index))],
    query: { ids: { values: documents.map(({ id }) => id) } },
    refresh: true,
    ignore_unavailable: true,
  });
};
