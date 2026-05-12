/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';

export interface AlertsSnapshotConfig {
  bucket: string;
  basePath: string;
  snapshotName?: string;
}

const INDEX_REFRESH_WAIT_MS = 3_000;

/**
 * Shared GCS-hosted alerts snapshot. The alerts-rag suite reuses the same
 * dataset as the Attack Discovery eval suite — both exercise the security
 * agents' ability to reason over a realistic set of open detection alerts, so
 * sharing the snapshot keeps the two pipelines on a single source of truth
 * for regression baselines.
 *
 * Defaults are pinned here for repeatability; env vars override for local
 * experimentation and CI variants.
 */
export const DEFAULT_ALERTS_SNAPSHOT_CONFIG: Required<AlertsSnapshotConfig> = {
  bucket: 'security-ai-datasets',
  basePath: 'attack-discovery/oh-my-malware/2026-03-26',
  snapshotName: 'alerts-snapshot',
};

export const resolveAlertsSnapshotConfig = (): AlertsSnapshotConfig | null => {
  if (process.env.ALERTS_RAG_ALERTS_SNAPSHOT_DISABLE === 'true') return null;

  const bucket =
    process.env.ALERTS_RAG_ALERTS_SNAPSHOT_BUCKET ?? DEFAULT_ALERTS_SNAPSHOT_CONFIG.bucket;
  const basePath =
    process.env.ALERTS_RAG_ALERTS_SNAPSHOT_BASE_PATH ?? DEFAULT_ALERTS_SNAPSHOT_CONFIG.basePath;
  const snapshotName =
    process.env.ALERTS_RAG_ALERTS_SNAPSHOT_NAME ?? DEFAULT_ALERTS_SNAPSHOT_CONFIG.snapshotName;

  // Snapshot restore needs Elasticsearch to have repository-gcs creds wired up.
  // In our Scout setup that's driven by the presence of GCS_CREDENTIALS.
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
    return Object.keys(response);
  } catch {
    return [];
  }
};

const deleteExistingAlertIndices = async (esClient: Client, log: ToolingLog): Promise<void> => {
  log.info('Resolving existing alert indices to delete before restore...');
  const resolved = (
    await Promise.all(
      ALERT_INDICES_TO_RESTORE_AND_OVERWRITE.map((pattern) =>
        resolveIndicesByPattern(esClient, pattern)
      )
    )
  ).flat();
  const unique = [...new Set(resolved)];

  if (unique.length === 0) {
    log.info('No existing alert indices matched for deletion');
    return;
  }

  log.info(`Deleting ${unique.length} existing indices before restore`);
  await esClient.indices.delete({
    index: unique,
    ignore_unavailable: true,
    allow_no_indices: true,
  });
};

const isOpenIndexConflictError = (errors: string[]): boolean =>
  errors.some((e) => e.includes('open index with same name already exists in the cluster'));

/**
 * Restore the alerts snapshot from GCS into the local Scout-managed ES cluster.
 * Scout's Kibana boot will eagerly create the Security Solution alert index,
 * so we delete any matching indices first to avoid `restore` conflicts. This
 * runs in a disposable eval cluster, so deleting is safe and expected.
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

  await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));
  await esClient.indices.refresh({ index: '_all' });
};
