/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import { engineDescriptionRegistry } from '../installation/engine_description';
import { generateLatestIndex } from './latest_index';

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
export async function storeEntityStoreDocs(
  esClient: ElasticsearchClient,
  entityType: EntityType,
  namespace: string,
  esqlResponse: ESQLSearchResponse,
  logger: Logger
): Promise<void> {
  const { columns, values } = esqlResponse;
  if (values.length === 0) return;

  const { identityField } = engineDescriptionRegistry[entityType];
  const index = generateLatestIndex(entityType, namespace);

  // Find the index of the identity field column
  const identityFieldIndex = columns.findIndex((col) => col.name === identityField);
  if (identityFieldIndex === -1) {
    throw new Error(`Identity field "${identityField}" not found in ESQL response columns`);
  }

  // Generator function that yields documents one at a time from columnar format
  async function* documentGenerator() {
    for (const row of values) {
      // Build document object on-demand, one row at a time
      const doc: Record<string, unknown> = {};
      for (let i = 0; i < row.length; i++) {
        doc[columns[i].name] = row[i];
      }
      // Attach the document ID for use in onDocument callback
      yield { _id: row[identityFieldIndex] as string, ...doc };
    }
  }

  // This processes documents one at a time and handles batching automatically
  await esClient.helpers.bulk({
    datasource: documentGenerator(),
    index,
    refresh: true,
    flushBytes: 5 * 1024 * 1024, // 5MB batches
    concurrency: 1, // Process sequentially to minimize memory
    retries: 2,
    onDocument: (doc) => {
      const { _id, ...document } = doc;
      return [{ index: { _index: index, _id: _id as string } }, document];
    },
    onDrop: (dropped) => {
      // Log dropped documents but don't throw - allows bulk operation to continue
      // The helpers.bulk will return stats about failed documents
      // You can check the return value if you need to handle failures
      const errorReason = dropped.error?.reason || 'unknown error';
      logger.error(
        `[Entity Store ESQL] [${entityType}-${namespace}] entity dropped from bulk operation (reason: ${errorReason})`
      );
    },
  });
}
