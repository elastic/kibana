/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0", and the "Server Side Public License v 1"; you may not use this file
 * except in compliance with, at your election, the "Elastic License 2.0",
 * the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { CHECKPOINT_INDEX } from './constants';
import type { CheckpointDoc } from './constants';
import { checkpointMappings } from './mappings';

const isAlreadyExists = (error: unknown): boolean =>
  (error as { body?: { error?: { type?: string } } })?.body?.error?.type ===
  'resource_already_exists_exception';

/** Creates the checkpoint index, or brings an existing one's mapping up to date. */
export const ensureCheckpointIndex = async (es: ElasticsearchClient): Promise<void> => {
  try {
    await es.indices.create({
      index: CHECKPOINT_INDEX,
      settings: { hidden: true, number_of_shards: 1, auto_expand_replicas: '0-1' },
      mappings: checkpointMappings,
    });
    return;
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
  }
  await es.indices.putMapping({ index: CHECKPOINT_INDEX, ...checkpointMappings });
};

/** Reads every release checkpoint in one request; a missing release has none. */
export const readCheckpoints = async (
  es: ElasticsearchClient
): Promise<Map<string, CheckpointDoc>> => {
  const checkpoints = new Map<string, CheckpointDoc>();
  let searchAfter: string[] | undefined;
  for (;;) {
    const response = await es.search<CheckpointDoc>({
      index: CHECKPOINT_INDEX,
      ignore_unavailable: true,
      size: 1000,
      ...(searchAfter ? { search_after: searchAfter } : {}),
      sort: [{ release: 'asc' }],
    });
    for (const hit of response.hits.hits) {
      if (hit._source) checkpoints.set(hit._source.release, hit._source);
    }
    if (response.hits.hits.length < 1000) return checkpoints;
    const last = response.hits.hits[response.hits.hits.length - 1].sort;
    if (!last) return checkpoints;
    searchAfter = last as string[];
  }
};

/** Writes one release's checkpoint under its release key (idempotent overwrite). */
export const writeCheckpoint = async (
  es: ElasticsearchClient,
  doc: CheckpointDoc
): Promise<void> => {
  await es.index({ index: CHECKPOINT_INDEX, id: doc.release, document: doc, refresh: false });
};

/** {@link ScanDeps.readCheckpoints} default: read every checkpoint from ES (absent index is empty). */
export const defaultReadCheckpoints =
  (es: ElasticsearchClient) => (): Promise<Map<string, CheckpointDoc>> =>
    readCheckpoints(es);

/** {@link ScanDeps.writeCheckpoint} default: write the checkpoint to ES, failure only warned. */
export const defaultWriteCheckpoint =
  (es: ElasticsearchClient, logger: { warn: (message: string) => void }) =>
  async (doc: CheckpointDoc): Promise<void> => {
    try {
      await writeCheckpoint(es, doc);
    } catch (error) {
      logger.warn(
        `Could not write the ${doc.release} refresh checkpoint: ${
          error instanceof Error ? error.message : String(error)
        }. The next refresh will rematch this release.`
      );
    }
  };
