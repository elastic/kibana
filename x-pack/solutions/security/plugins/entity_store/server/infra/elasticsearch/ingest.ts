/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TransportRequestOptions } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';

const BATCH_SIZE = 5 * 1024 * 1024; // 5MB

interface IngestEntitiesParams {
  esClient: ElasticsearchClient;
  esqlResponse: ESQLSearchResponse;
  esIdField: string;
  targetIndex: string;
  logger: Logger;
  abortController?: AbortController;
}

/**
 * Stores entity store documents from columnar ESQL response format using streaming bulk API.
 * It processes documents one at a time via a generator,
 * avoiding building the entire body array in memory.
 *
 * Uses helpers.bulk with a generator datasource:
 * - Processes one row at a time (minimal memory footprint)
 * - Automatic batching via flushBytes (default 5MB)
 * - No intermediate arrays or full document collections in memory
 */
export async function ingestEntities({
  esClient,
  esqlResponse,
  esIdField,
  targetIndex,
  logger,
  abortController,
}: IngestEntitiesParams) {
  const options: TransportRequestOptions = {};
  if (abortController?.signal) {
    options.signal = abortController.signal;
  }

  const { columns, values } = esqlResponse;
  if (values.length === 0) return;

  // Find the index of the identity field column
  const identityFieldIndex = columns.findIndex((col) => col.name === esIdField);
  if (identityFieldIndex === -1) {
    throw new Error(`Identity field "${esIdField}" not found in ESQL response columns`);
  }

  // Generator function that yields documents one at a time from columnar format
  async function* documentGenerator() {
    for (const row of values) {
      // Build document object on-demand, one row at a time
      const doc: Record<string, unknown> = {};
      for (let i = 0; i < row.length; i++) {
        if (
          // ignore esIdField, no need to be in the document
          columns[i].name !== esIdField &&
          // ignore null fields
          row[i] !== null
        ) {
          doc[columns[i].name] = row[i];
        }
      }
      // Attach the document ID for use in onDocument callback
      yield { _id: row[identityFieldIndex] as string, ...doc };
    }
  }

  // This processes documents one at a time and handles batching automatically
  await esClient.helpers.bulk(
    {
      datasource: documentGenerator(),
      index: targetIndex,
      refresh: true,
      flushBytes: BATCH_SIZE,
      concurrency: 1, // Process sequentially to minimize memory
      retries: 2,
      onDocument: (doc) => {
        const { _id, ...document } = doc;
        return [{ index: { _index: targetIndex, _id: _id as string } }, document];
      },
      onDrop: (dropped) => {
        // Log dropped documents but don't throw - allows bulk operation to continue
        // The helpers.bulk will return stats about failed documents
        // You can check the return value if you need to handle failures
        const errorReason = dropped.error?.reason || 'unknown error';
        logger.error(`entity dropped from bulk operation (reason: ${errorReason})`);
      },
    },
    options
  );
}
