/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Deterministic seed data for PCI compliance evals.
 *
 * We seed three indices covering the three most load-bearing requirement families so every
 * eval run starts from a known ground truth:
 *  - `logs-pci-auth-*` — authentication telemetry (Req 8): mixes successful logins with a
 *    burst of failures for a single actor, enough to trigger the req-8 violation query.
 *  - `logs-pci-network-*` — network + TLS metadata (Req 4): a mix of TLS 1.2/1.3 and a
 *    handful of weak legacy protocol connections the agent should flag.
 *  - `logs-pci-custom-*` — intentionally non-ECS field names (`username`, `src_ip`, …) so
 *    the `pci_field_mapper` tool has something to suggest mappings for.
 *
 * Kept intentionally small (tens of docs each) so evals are fast and reproducible.
 */

export const PCI_INDICES = {
  auth: 'logs-pci-auth-eval',
  network: 'logs-pci-network-eval',
  custom: 'logs-pci-custom-eval',
} as const;

const REFERENCE_TIMESTAMP_MS = () => Date.now() - 60_000;

type Doc = Record<string, unknown>;

async function bulkIndex(esClient: Client, index: string, docs: Doc[]): Promise<void> {
  if (docs.length === 0) return;
  const body = docs.flatMap((doc) => [{ index: { _index: index } }, doc]);
  const response = await esClient.bulk({ refresh: true, operations: body });
  if (response.errors) {
    const firstError = response.items.find((item) => {
      const op = Object.values(item)[0];
      return op && 'error' in op && op.error;
    });
    throw new Error(`Bulk indexing into ${index} failed: ${JSON.stringify(firstError, null, 2)}`);
  }
}

export async function seedPciEvalData({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> {
  log.info('Seeding PCI compliance eval data');

  const base = REFERENCE_TIMESTAMP_MS();

  // Req 8 — authentication events. 20 failed logins for one actor, plus a few successes.
  const authDocs: Doc[] = [];
  for (let i = 0; i < 20; i++) {
    authDocs.push({
      '@timestamp': new Date(base - i * 1000).toISOString(),
      event: { category: 'authentication', outcome: 'failure', action: 'login' },
      user: { name: 'eval-compromised-user' },
      source: { ip: '10.0.0.55' },
      host: { name: 'eval-host-auth' },
    });
  }
  for (let i = 0; i < 5; i++) {
    authDocs.push({
      '@timestamp': new Date(base - (i + 30) * 1000).toISOString(),
      event: { category: 'authentication', outcome: 'success', action: 'login' },
      user: { name: `eval-user-${i}` },
      source: { ip: `10.0.0.${10 + i}` },
      host: { name: 'eval-host-auth' },
    });
  }

  // Req 4 — TLS evidence. Mix of strong TLS and a couple of weak legacy protocol records.
  const networkDocs: Doc[] = [];
  for (let i = 0; i < 10; i++) {
    networkDocs.push({
      '@timestamp': new Date(base - i * 2000).toISOString(),
      event: { category: 'network' },
      network: { protocol: 'https' },
      tls: { version: '1.3' },
      source: { ip: `10.0.1.${i}` },
      destination: { ip: '10.0.1.200' },
    });
  }
  networkDocs.push(
    {
      '@timestamp': new Date(base - 500).toISOString(),
      event: { category: 'network' },
      network: { protocol: 'https' },
      tls: { version: '1.0' },
      source: { ip: '10.0.1.99' },
      destination: { ip: '10.0.1.201' },
    },
    {
      '@timestamp': new Date(base - 400).toISOString(),
      event: { category: 'network' },
      network: { protocol: 'https' },
      tls: { version: 'SSLv3' },
      source: { ip: '10.0.1.98' },
      destination: { ip: '10.0.1.202' },
    }
  );

  // Non-ECS fields so the field-mapper has something to suggest.
  const customDocs: Doc[] = [];
  for (let i = 0; i < 5; i++) {
    customDocs.push({
      '@timestamp': new Date(base - i * 3000).toISOString(),
      username: `eval-custom-user-${i}`,
      src_ip: `10.0.2.${i}`,
      hostname: 'eval-host-custom',
      result: i % 2 === 0 ? 'success' : 'failure',
    });
  }

  await bulkIndex(esClient, PCI_INDICES.auth, authDocs);
  await bulkIndex(esClient, PCI_INDICES.network, networkDocs);
  await bulkIndex(esClient, PCI_INDICES.custom, customDocs);

  log.info(
    `Seeded ${authDocs.length} auth, ${networkDocs.length} network, ${customDocs.length} custom docs`
  );
}

export async function cleanupPciEvalData({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> {
  log.info('Cleaning up PCI compliance eval data');
  const indices = Object.values(PCI_INDICES);
  try {
    await esClient.indices.delete({ index: indices, ignore_unavailable: true });
  } catch (error) {
    log.warning(
      `Failed to delete PCI eval indices ${indices.join(', ')}: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}
