/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';

/**
 * Load an ES archive using esArchiver.
 * Use with the esArchiver fixture from Scout.
 */
export async function loadEsArchive(
  esArchiver: { loadIfNeeded: (name: string) => Promise<void> },
  archiveName: string
): Promise<void> {
  await esArchiver.loadIfNeeded(archiveName);
}

/**
 * Unload an ES archive.
 */
export async function unloadEsArchive(
  esArchiver: { unload: (name: string) => Promise<void> },
  archiveName: string
): Promise<void> {
  await esArchiver.unload(archiveName);
}

/**
 * Index a document directly into Elasticsearch.
 */
export async function indexDocument(
  esClient: EsClient,
  index: string,
  body: Record<string, unknown>
): Promise<void> {
  await esClient.index({
    index,
    refresh: 'wait_for',
    body,
  });
}

/**
 * Delete a data stream.
 */
export async function deleteDataStream(esClient: EsClient, dataStreamName: string): Promise<void> {
  try {
    await esClient.indices.deleteDataStream({ name: dataStreamName });
  } catch {
    // Ignore if stream does not exist
  }
}

/**
 * Delete an index.
 */
export async function deleteIndex(esClient: EsClient, indexName: string): Promise<void> {
  try {
    await esClient.indices.delete({ index: indexName });
  } catch {
    // Ignore if index does not exist
  }
}
