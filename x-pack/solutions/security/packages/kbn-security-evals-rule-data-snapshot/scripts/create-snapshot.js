/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One-off script to create and publish a GCS snapshot of pre-seeded eval data.
 *
 * Prerequisites:
 *   - A running Elasticsearch cluster on localhost:9220
 *   - Eval data already seeded via the eval suite's global.setup.ts
 *   - GCS_CREDENTIALS env var set to a service account JSON blob
 *
 * Usage:
 *   GCS_CREDENTIALS=$(cat /path/to/service-account.json | jq -c) \
 *     node x-pack/solutions/security/packages/kbn-security-evals-rule-data-snapshot/scripts/create-snapshot.js
 */

/* eslint-disable no-console */

const { Client } = require('@elastic/elasticsearch');

// Load kbn-es-snapshot-loader via Node resolution from repo root
const esSnapshotLoader = require(require.resolve(
  '@kbn/es-snapshot-loader',
  { paths: [process.cwd()] }
));

const { createGcsRepository, createSnapshot } = esSnapshotLoader;

const gcsCreds = process.env.GCS_CREDENTIALS;
if (!gcsCreds) {
  console.error('ERROR: GCS_CREDENTIALS env var is required');
  process.exit(1);
}

const BUCKET = process.env.SNAPSHOT_BUCKET ?? 'security-ai-datasets';
const BASE_PATH = process.env.SNAPSHOT_BASE_PATH ?? `rule-data/${new Date().toISOString().slice(0, 10)}`;
const SNAPSHOT_NAME = process.env.SNAPSHOT_NAME ?? 'security-ai-rules-v1';

async function main() {
  const esClient = new Client({ node: 'http://localhost:9220' });

  // Basic logger satisfying ToolingLog shape
  const log = {
    info: (msg) => console.log(`[info] ${msg}`),
    warning: (msg) => console.warn(`[warn] ${msg}`),
    error: (msg) => console.error(`[err] ${msg}`),
    debug: () => {},
    trace: () => {},
    fatal: (msg) => console.error(`[fatal] ${msg}`),
  };

  // Verify data exists before snapshotting
  const { count: o365Count } = await esClient.count({ index: 'logs-o365.audit-default' }).catch(() => ({ count: 0 }));
  if (o365Count === 0) {
    console.error('ERROR: No data found in logs-o365.audit-default. Seed data first (e.g. run eval setup).');
    process.exit(1);
  }

  console.log(`[create-snapshot] found ${o365Count} docs in logs-o365.audit-default (data looks seeded)`);

  const repository = createGcsRepository({
    bucket: BUCKET,
    basePath: BASE_PATH,
  });

  console.log(`[create-snapshot] creating snapshot ${SNAPSHOT_NAME} in gs://${BUCKET}/${BASE_PATH}...`);

  const result = await createSnapshot({
    esClient,
    log,
    repository,
    snapshotName: SNAPSHOT_NAME,
    indices: [
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
      'logs-endpoint.events.file-default*',
      'logs-endpoint.events.process-default*',
      'logs-endpoint.events.network-default*',
      'logs-endpoint.events.registry-default*',
    ],
  });

  if (!result.success) {
    console.error(`[create-snapshot] failed: ${result.errors.join('; ')}`);
    process.exit(1);
  }

  console.log(`[create-snapshot] success — indices: ${result.snapshotIndices?.join(', ') ?? 'n/a'}`);
  console.log(`[create-snapshot] If this is the new canonical snapshot, update DEFAULT_RULE_DATA_SNAPSHOT_CONFIG:`);
  console.log(`  basePath: "${BASE_PATH}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
