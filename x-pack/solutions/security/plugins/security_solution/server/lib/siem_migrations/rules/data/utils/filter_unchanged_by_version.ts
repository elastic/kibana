/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

interface FilterUnchangedByVersionParams<T> {
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger;
  items: T[];
  /** Returns the document `_id` and the source version of an item */
  getItemDetails: (item: T) => { id: string; version: string };
}

/**
 * Returns the items that need to be (re)indexed: those not yet indexed, indexed without a `version`,
 * or indexed with a different `version`. Skipping the rest avoids re-running ELSER inference
 * on `semantic_text` fields for unchanged documents.
 * If the stored versions can't be read, all items are returned so indexing still succeeds.
 */
export const filterUnchangedByVersion = async <T>({
  esClient,
  index,
  logger,
  items,
  getItemDetails,
}: FilterUnchangedByVersionParams<T>): Promise<T[]> => {
  if (items.length === 0) {
    return [];
  }

  const indexedVersions = new Map<string, string>();
  try {
    const { docs } = await esClient.mget<{ version?: string }>({
      index,
      ids: items.map((item) => getItemDetails(item).id),
      _source: ['version'],
    });
    for (const doc of docs) {
      if ('found' in doc && doc.found && doc._source?.version) {
        indexedVersions.set(doc._id, doc._source.version);
      }
    }
  } catch (error) {
    logger.warn(
      `Failed to read indexed versions from ${index}, re-indexing all ${items.length} documents: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return items;
  }

  const changedItems = items.filter((item) => {
    const { id, version } = getItemDetails(item);
    return indexedVersions.get(id) !== version;
  });
  logger.debug(
    `${index}: ${changedItems.length} documents to index, ${
      items.length - changedItems.length
    } unchanged skipped`
  );
  return changedItems;
};
