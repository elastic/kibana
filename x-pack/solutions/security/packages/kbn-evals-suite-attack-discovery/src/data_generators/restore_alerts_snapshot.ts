/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { restoreSnapshot, createGcsRepository } from '@kbn/es-snapshot-loader';

export interface AlertsSnapshotConfig {
  bucket: string;
  basePath: string;
  snapshotName?: string;
}

const INDEX_REFRESH_WAIT_MS = 3_000;

/**
 * Reads snapshot config from environment variables.
 * Returns `null` if the required env vars are not set.
 */
export const getAlertsSnapshotConfigFromEnv = (): AlertsSnapshotConfig | null => {
  const bucket = process.env.ATTACK_DISCOVERY_ALERTS_SNAPSHOT_BUCKET;
  const basePath = process.env.ATTACK_DISCOVERY_ALERTS_SNAPSHOT_BASE_PATH;
  if (!bucket || !basePath) {
    return null;
  }
  return {
    bucket,
    basePath,
    snapshotName: process.env.ATTACK_DISCOVERY_ALERTS_SNAPSHOT_NAME,
  };
};

/**
 * Restores an alerts snapshot from GCS into the local ES cluster,
 * then waits briefly for refresh.
 */
export const restoreAlertsSnapshot = async ({
  esClient,
  log,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  config: AlertsSnapshotConfig;
}): Promise<void> => {
  const repository = createGcsRepository({
    bucket: config.bucket,
    basePath: config.basePath,
  });

  log.info(
    `Restoring alerts snapshot from gs://${config.bucket}/${config.basePath}${
      config.snapshotName ? ` (snapshot: ${config.snapshotName})` : ' (latest)'
    }`
  );

  const result = await restoreSnapshot({
    esClient,
    log,
    repository,
    snapshotName: config.snapshotName,
  });

  if (!result.success) {
    throw new Error(`Snapshot restore failed: ${result.errors.join('; ')}`);
  }

  log.info(
    `Restored ${result.restoredIndices.length} indices: ${result.restoredIndices.join(', ')}`
  );

  log.debug('Waiting for restored indices to refresh');
  await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

  await esClient.indices.refresh({ index: '_all' });
};
