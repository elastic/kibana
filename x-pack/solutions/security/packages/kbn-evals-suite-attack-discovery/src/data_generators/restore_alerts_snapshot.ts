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

export const DEFAULT_ALERTS_SNAPSHOT_CONFIG: Required<AlertsSnapshotConfig> = {
  bucket: 'security-ai-datasets',
  basePath: 'attack-discovery/oh-my-malware/2026-03-26',
  snapshotName: 'alerts-snapshot',
};

/**
 * Resolve the alerts snapshot configuration.
 *
 * - Defaults are pinned in code for repeatability.
 * - Env vars can override for experimentation and CI variants.
 * - Returns `null` when no GCS credentials are available (to avoid failing local runs).
 */
export const resolveAlertsSnapshotConfig = (): AlertsSnapshotConfig | null => {
  if (process.env.ATTACK_DISCOVERY_ALERTS_SNAPSHOT_DISABLE === 'true') return null;

  const bucket =
    process.env.ATTACK_DISCOVERY_ALERTS_SNAPSHOT_BUCKET ?? DEFAULT_ALERTS_SNAPSHOT_CONFIG.bucket;
  const basePath =
    process.env.ATTACK_DISCOVERY_ALERTS_SNAPSHOT_BASE_PATH ??
    DEFAULT_ALERTS_SNAPSHOT_CONFIG.basePath;
  const snapshotName =
    process.env.ATTACK_DISCOVERY_ALERTS_SNAPSHOT_NAME ??
    DEFAULT_ALERTS_SNAPSHOT_CONFIG.snapshotName;

  // Snapshot restore requires Elasticsearch to have repository-gcs credentials configured.
  // In our Scout setup, that is driven by the presence of the GCS_CREDENTIALS env var.
  if (!process.env.GCS_CREDENTIALS) return null;

  return { bucket, basePath, snapshotName };
};

const ALERT_INDICES_TO_RESTORE_AND_OVERWRITE = [
  '.internal.alerts-security.alerts-default-*',
  'insights-alerts-*',
] as const;

const resolveIndicesByPattern = async (esClient: Client, pattern: string): Promise<string[]> => {
  try {
    const response = (await esClient.indices.get({
      index: pattern,
      expand_wildcards: 'all',
      ignore_unavailable: true,
      allow_no_indices: true,
    })) as unknown as Record<string, unknown>;

    // indices.get returns an object keyed by index name.
    return Object.keys(response);
  } catch {
    return [];
  }
};

const deleteExistingAlertIndices = async (esClient: Client, log: ToolingLog): Promise<void> => {
  log.info('Resolving existing alert indices to delete before restore...');
  const resolvedToDelete = (
    await Promise.all(
      ALERT_INDICES_TO_RESTORE_AND_OVERWRITE.map((pattern) =>
        resolveIndicesByPattern(esClient, pattern)
      )
    )
  ).flat();
  const uniqueToDelete = [...new Set(resolvedToDelete)];

  if (uniqueToDelete.length === 0) {
    log.info('No existing alert indices matched for deletion');
    return;
  }

  log.info(`Deleting ${uniqueToDelete.length} existing indices before restore`);
  await esClient.indices.delete({
    index: uniqueToDelete,
    ignore_unavailable: true,
    allow_no_indices: true,
  });
};

const isOpenIndexConflictError = (errors: string[]): boolean =>
  errors.some((e) => e.includes('open index with same name already exists in the cluster'));

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

  // Scout's Kibana boot will eagerly create the Security Solution alert index, which causes
  // snapshot restore conflicts. For repeatability, we delete any matching indices first.
  // This runs in a disposable eval cluster, so this is safe and expected.
  try {
    await deleteExistingAlertIndices(esClient, log);
  } catch (err) {
    log.warning(
      `Failed to delete existing alert indices (continuing with restore attempt): ${String(err)}`
    );
  }

  let result = await restoreSnapshot({
    esClient,
    log,
    repository,
    snapshotName: config.snapshotName,
    indices: [...ALERT_INDICES_TO_RESTORE_AND_OVERWRITE],
  });

  if (!result.success && isOpenIndexConflictError(result.errors)) {
    log.warning('Snapshot restore failed due to existing indices. Retrying once after deletion.');
    await deleteExistingAlertIndices(esClient, log);
    result = await restoreSnapshot({
      esClient,
      log,
      repository,
      snapshotName: config.snapshotName,
      indices: [...ALERT_INDICES_TO_RESTORE_AND_OVERWRITE],
    });
  }

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
