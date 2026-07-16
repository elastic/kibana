/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';
import type { RuleDataSnapshotConfig } from './config';

const INDEX_REFRESH_WAIT_MS = 3_000;

const INDICES_TO_RESTORE = [
  // Integration data streams
  'logs-o365.audit-default*',
  'logs-azure.auditlogs-default*',
  'logs-gcp.audit-default*',
  'logs-windows.sysmon_operational-default*',
  'logs-network_traffic.http-default*',
  'logs-network_traffic.flow-default*',
  'logs-aws.cloudtrail-default*',
  'logs-google_workspace.admin-default*',
  'logs-okta.system-default*',
  'logs-windows.powershell_operational-default*',
  // Endpoint events
  'logs-endpoint.events.file-default*',
  'logs-endpoint.events.process-default*',
  'logs-endpoint.events.network-default*',
  'logs-endpoint.events.registry-default*',
  // Security alerts
  '.internal.alerts-security.alerts-default-*',
];

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

const deleteExistingIndices = async (esClient: Client, log: ToolingLog): Promise<void> => {
  log.info('[rule-data] resolving existing indices to delete before restore...');
  const resolved = (
    await Promise.all(
      INDICES_TO_RESTORE.map((pattern) => resolveIndicesByPattern(esClient, pattern))
    )
  ).flat();
  const unique = Array.from(new Set(resolved));

  if (unique.length === 0) {
    log.info('[rule-data] no existing indices matched for deletion');
    return;
  }

  log.info(`[rule-data] deleting ${unique.length} existing indices before restore`);
  await esClient.indices.delete({
    index: unique,
    ignore_unavailable: true,
    allow_no_indices: true,
  });
};

const isOpenIndexConflictError = (errors: string[]): boolean =>
  errors.some((e) => e.includes('open index with same name already exists in the cluster'));

/**
 * Restore the shared security rule-data snapshot from GCS into the local
 * Scout-managed ES cluster.
 *
 * Scout's Kibana boot eagerly creates the Security Solution alert index, so
 * we delete any matching indices before restore to avoid conflicts. This is
 * safe in the disposable eval cluster (and only there).
 *
 * If restore fails with an open-index conflict, we delete and retry once.
 */
export const restoreRuleDataSnapshot = async ({
  esClient,
  log,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  config: RuleDataSnapshotConfig;
}): Promise<void> => {
  const repository = createGcsRepository({
    bucket: config.bucket,
    basePath: config.basePath,
  });

  log.info(
    `[rule-data] Restoring from gs://${config.bucket}/${config.basePath}${
      config.snapshotName ? ` (snapshot: ${config.snapshotName})` : ' (latest)'
    }`
  );

  try {
    await deleteExistingIndices(esClient, log);
  } catch (err) {
    log.warning(`[rule-data] failed to delete existing indices (continuing): ${String(err)}`);
  }

  let result = await restoreSnapshot({
    esClient,
    log,
    repository,
    snapshotName: config.snapshotName,
    indices: [...INDICES_TO_RESTORE],
  });

  if (!result.success && isOpenIndexConflictError(result.errors)) {
    log.warning('[rule-data] conflict; retrying once after deletion');
    await deleteExistingIndices(esClient, log);
    result = await restoreSnapshot({
      esClient,
      log,
      repository,
      snapshotName: config.snapshotName,
      indices: [...INDICES_TO_RESTORE],
    });
  }

  if (!result.success) {
    throw new Error(`[rule-data] restore failed: ${result.errors.join('; ')}`);
  }

  log.info(`[rule-data] restored ${result.restoredIndices.length} indices`);

  await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));
  await esClient.indices.refresh({ index: '_all' });
};
