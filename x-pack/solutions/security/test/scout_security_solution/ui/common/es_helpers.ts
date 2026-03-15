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
  esArchiver: { loadIfNeeded: Function },
  archiveName: string
): Promise<void> {
  await esArchiver.loadIfNeeded(archiveName);
}

/**
 * Unload an ES archive.
 * Note: Scout's EsArchiverFixture intentionally only exposes loadIfNeeded.
 * This is a no-op placeholder for migrated tests that previously relied on unload for cleanup.
 */
export async function unloadEsArchive(
  _esArchiver: { loadIfNeeded: Function },
  _archiveName: string
): Promise<void> {
  // Scout EsArchiverFixture only supports loadIfNeeded (no unload)
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

const CYPRESS_ARCHIVES_BASE =
  'x-pack/solutions/security/test/security_solution_cypress/es_archives';
const FTR_ARCHIVES_BASE = 'x-pack/test/functional/fixtures/es_archives/security_solution';
const PLATFORM_ARCHIVES_BASE = 'x-pack/platform/test/fixtures/es_archives';

export const SECURITY_ARCHIVES = {
  ALL_USERS: `${CYPRESS_ARCHIVES_BASE}/all_users`,
  AUDITBEAT_MULTIPLE: `${CYPRESS_ARCHIVES_BASE}/auditbeat_multiple`,
  BULK_PROCESS: `${CYPRESS_ARCHIVES_BASE}/bulk_process`,
  EXCEPTIONS: `${CYPRESS_ARCHIVES_BASE}/exceptions`,
  EXCEPTIONS_2: `${CYPRESS_ARCHIVES_BASE}/exceptions_2`,
  HOST_UNCOMMON_PROCESSES: `${CYPRESS_ARCHIVES_BASE}/host_uncommon_processes`,
  LINUX_PROCESS: `${CYPRESS_ARCHIVES_BASE}/linux_process`,
  NETWORK: `${CYPRESS_ARCHIVES_BASE}/network`,
  OVERVIEW: `${CYPRESS_ARCHIVES_BASE}/overview`,
  PROCESS_ANCESTRY: `${CYPRESS_ARCHIVES_BASE}/process_ancestry`,
  QUERY_ALERT: `${CYPRESS_ARCHIVES_BASE}/query_alert`,
  RANSOMWARE_DETECTION: `${CYPRESS_ARCHIVES_BASE}/ransomware_detection`,
  RANSOMWARE_PREVENTION: `${CYPRESS_ARCHIVES_BASE}/ransomware_prevention`,
  RISK_SCORES_NEW: `${CYPRESS_ARCHIVES_BASE}/risk_scores_new`,
  RISK_SCORES_NEW_COMPLETE_DATA: `${CYPRESS_ARCHIVES_BASE}/risk_scores_new_complete_data`,
  SUSPICIOUS_SOURCE_EVENT: `${CYPRESS_ARCHIVES_BASE}/suspicious_source_event`,
  THREAT_INDICATOR: `${CYPRESS_ARCHIVES_BASE}/threat_indicator`,
  TI_INDICATORS_DATA_INVALID: `${CYPRESS_ARCHIVES_BASE}/ti_indicators_data_invalid`,
  TI_INDICATORS_DATA_MULTIPLE: `${CYPRESS_ARCHIVES_BASE}/ti_indicators_data_multiple`,
  TI_INDICATORS_DATA_NO_MAPPINGS: `${CYPRESS_ARCHIVES_BASE}/ti_indicators_data_no_mappings`,
  TI_INDICATORS_DATA_SINGLE: `${CYPRESS_ARCHIVES_BASE}/ti_indicators_data_single`,
  USER_MANAGED_DATA: `${CYPRESS_ARCHIVES_BASE}/user_managed_data`,
  USERS: `${CYPRESS_ARCHIVES_BASE}/users`,
  SIEM_MIGRATIONS_RULES: `${CYPRESS_ARCHIVES_BASE}/siem_migrations/rules`,
  SIEM_MIGRATIONS_RULE_MIGRATIONS: `${CYPRESS_ARCHIVES_BASE}/siem_migrations/rule_migrations`,
  SIEM_MIGRATIONS_DASHBOARDS_ITEMS: `${CYPRESS_ARCHIVES_BASE}/siem_migrations/dashboards/items`,
  SIEM_MIGRATIONS_DASHBOARDS_MIGRATIONS: `${CYPRESS_ARCHIVES_BASE}/siem_migrations/dashboards/migrations`,

  ANOMALIES: `${FTR_ARCHIVES_BASE}/anomalies`,
  NO_AT_TIMESTAMP_FIELD: `${FTR_ARCHIVES_BASE}/no_at_timestamp_field`,

  AUDITBEAT_HOSTS: `${PLATFORM_ARCHIVES_BASE}/auditbeat/hosts`,
} as const;
