/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MitreAttackArtifact, MitreEntity } from '@kbn/security-mitre-attack-common';

const STAMP_META_KEY = 'mitre_attack_stamp';
const BULK_BATCH_SIZE = 500;

interface ReadStoredStampParams {
  esClient: ElasticsearchClient;
  indexName: string;
  logger: Logger;
}

/**
 * Read the artifact stamp from the index `_meta` field. Returns `undefined` if
 * the index has not yet been hydrated (or the `_meta` value is absent).
 */
export const readStoredStamp = async ({
  esClient,
  indexName,
  logger,
}: ReadStoredStampParams): Promise<string | undefined> => {
  try {
    const response = await esClient.indices.getMapping({ index: indexName });
    const indexMapping = response[indexName];
    const meta = indexMapping?.mappings?._meta as Record<string, unknown> | undefined;
    const stamp = meta?.[STAMP_META_KEY];
    return typeof stamp === 'string' ? stamp : undefined;
  } catch (err) {
    if (err?.meta?.statusCode === 404) return undefined;
    logger.warn(
      `Failed to read MITRE ATT&CK stamp from ${indexName}: ${err.message ?? String(err)}`
    );
    return undefined;
  }
};

interface WriteStoredStampParams {
  esClient: ElasticsearchClient;
  indexName: string;
  stamp: string;
  logger: Logger;
}

const writeStoredStamp = async ({
  esClient,
  indexName,
  stamp,
  logger,
}: WriteStoredStampParams): Promise<void> => {
  try {
    await esClient.indices.putMapping({
      index: indexName,
      _meta: { [STAMP_META_KEY]: stamp },
    });
  } catch (err) {
    logger.error(
      `Failed to write MITRE ATT&CK stamp to ${indexName}: ${err.message ?? String(err)}`
    );
    throw err;
  }
};

const buildDocId = (entity: MitreEntity): string => `${entity.framework}:${entity.id}`;

interface BulkIndexEntitiesParams {
  esClient: ElasticsearchClient;
  indexName: string;
  entities: MitreEntity[];
  logger: Logger;
}

/**
 * Idempotent bulk-index of all entities. Uses deterministic doc ids so re-runs
 * overwrite in place; no `delete-by-query` step, so there is never an empty
 * window during refresh.
 */
const bulkIndexEntities = async ({
  esClient,
  indexName,
  entities,
  logger,
}: BulkIndexEntitiesParams): Promise<void> => {
  for (let offset = 0; offset < entities.length; offset += BULK_BATCH_SIZE) {
    const slice = entities.slice(offset, offset + BULK_BATCH_SIZE);
    const operations = slice.flatMap((entity) => [
      { index: { _index: indexName, _id: buildDocId(entity) } },
      entity,
    ]);

    const response = await esClient.bulk({
      operations,
      refresh: false,
    });

    if (response.errors) {
      const failed = response.items.filter((item) => {
        const op = Object.values(item)[0];
        return op?.error != null;
      });
      const firstError = Object.values(failed[0] ?? {})[0]?.error;
      logger.error(
        `MITRE ATT&CK bulk index reported ${failed.length} failures (first error: ${
          firstError?.type ?? 'unknown'
        }: ${firstError?.reason ?? 'unknown'})`
      );
      throw new Error(
        `Failed to bulk-index ${failed.length} MITRE ATT&CK entities into ${indexName}`
      );
    }
  }
};

export interface HydrateIndexParams {
  esClient: ElasticsearchClient;
  indexName: string;
  artifact: MitreAttackArtifact;
  logger: Logger;
}

/**
 * Compare the cluster-stored stamp against the bundled artifact's stamp and
 * re-hydrate when they differ. No-op when the index already has the matching
 * stamp.
 */
export const hydrateIndex = async ({
  esClient,
  indexName,
  artifact,
  logger,
}: HydrateIndexParams): Promise<{ hydrated: boolean; entityCount: number }> => {
  const storedStamp = await readStoredStamp({ esClient, indexName, logger });
  if (storedStamp === artifact.stamp) {
    logger.debug(
      `MITRE ATT&CK index ${indexName} already at stamp ${artifact.stamp}; skipping hydration`
    );
    return { hydrated: false, entityCount: artifact.entities.length };
  }

  logger.info(
    `Hydrating MITRE ATT&CK index ${indexName} ${
      storedStamp ? `from stamp ${storedStamp}` : '(empty)'
    } to stamp ${artifact.stamp} (${artifact.entities.length} entities)`
  );

  await bulkIndexEntities({ esClient, indexName, entities: artifact.entities, logger });

  // Refresh once at the end so reads can immediately see the new docs.
  await esClient.indices.refresh({ index: indexName });

  await writeStoredStamp({ esClient, indexName, stamp: artifact.stamp, logger });

  logger.info(`Hydrated MITRE ATT&CK index ${indexName} to stamp ${artifact.stamp}`);
  return { hydrated: true, entityCount: artifact.entities.length };
};
