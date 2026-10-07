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
 * Index names are **randomized per test run** (e.g. `logs-a7f3b2-auth`) so the
 * PCI skill cannot rely on predictable names and must use ECS field caps / scope
 * discovery to identify the right data. This ensures the evals validate real
 * skill behaviour rather than name-pattern matching.
 *
 * Five indices covering the core PCI DSS v4.0.1 requirement families:
 *
 *  - auth — Authentication / IAM events (Req 2, 8):
 *      12 failed logins for "jdoe" (brute-force trigger, exceeds PCI 8.3.4
 *      threshold of 10), successful logins for "admin" and "root"
 *      (default-account violation), plus password_change and mfa_enroll.
 *
 *  - network — Network + TLS metadata (Req 1, 4):
 *      TLS 1.3, 1.2 (good), TLS 1.0 + 1.1 (weak), plain HTTP (no TLS).
 *
 *  - vuln — Vulnerability + IDS events (Req 6, 11):
 *      Critical/high CVEs and intrusion detection alerts.
 *
 *  - endpoint — Endpoint / malware events (Req 5):
 *      Malware detection and suspicious process execution.
 *
 *  - custom — Non-ECS legacy fields for field-mapper tests:
 *      Flat field names (username, src_ip, hostname, cve, severity, program).
 *
 * Timestamps use `Date.now()` offsets so data always falls within lookback windows.
 * Kept intentionally small (tens of docs each) so evals are fast and reproducible.
 */

const RANDOM_PREFIX = Math.random().toString(36).substring(2, 8);

export const PCI_INDICES = {
  auth: `logs-${RANDOM_PREFIX}-auth`,
  network: `logs-${RANDOM_PREFIX}-network`,
  vuln: `logs-${RANDOM_PREFIX}-vuln`,
  endpoint: `logs-${RANDOM_PREFIX}-endpoint`,
  custom: `logs-${RANDOM_PREFIX}-custom`,
} as const;

const MINUTE = 60_000;
const recentTimestamp = (offsetMinutes: number) =>
  new Date(Date.now() - offsetMinutes * MINUTE).toISOString();

type Doc = Record<string, unknown>;

async function bulkIndex(esClient: Client, index: string, docs: Doc[]): Promise<void> {
  if (docs.length === 0) return;
  const body = docs.flatMap((doc) => [{ create: { _index: index } }, doc]);
  const response = await esClient.bulk({ refresh: true, operations: body });
  if (response.errors) {
    const firstError = response.items.find((item) => {
      const op = Object.values(item)[0];
      return op && 'error' in op && op.error;
    });
    throw new Error(`Bulk indexing into ${index} failed: ${JSON.stringify(firstError, null, 2)}`);
  }
}

function buildAuthDocs(): Doc[] {
  const docs: Doc[] = [];

  // 12 failed logins for "jdoe" from the same IP — exceeds PCI 8.3.4 lockout threshold of 10.
  // Placed 5–16 min ago so they're solidly within any "last hour" query window.
  for (let i = 0; i < 12; i++) {
    docs.push({
      '@timestamp': recentTimestamp(5 + i),
      event: { category: 'authentication', outcome: 'failure', action: 'user_login' },
      user: { name: 'jdoe' },
      source: { ip: '192.168.1.100' },
    });
  }

  // Successful logins — "admin" and "root" trigger default-account violation (Req 2.2.4).
  // Placed 20–23 min ago.
  docs.push(
    {
      '@timestamp': recentTimestamp(20),
      event: { category: 'authentication', outcome: 'success', action: 'user_login' },
      user: { name: 'admin' },
      source: { ip: '10.0.0.5' },
    },
    {
      '@timestamp': recentTimestamp(21),
      event: { category: 'authentication', outcome: 'success', action: 'user_login' },
      user: { name: 'root' },
      source: { ip: '10.0.0.6' },
    },
    {
      '@timestamp': recentTimestamp(22),
      event: { category: 'authentication', outcome: 'success', action: 'user_login' },
      user: { name: 'alice' },
      source: { ip: '10.0.0.7' },
    },
    {
      '@timestamp': recentTimestamp(23),
      event: { category: 'authentication', outcome: 'success', action: 'user_login' },
      user: { name: 'bob' },
      source: { ip: '10.0.0.8' },
    }
  );

  // IAM events — password change and MFA enroll (Req 8.3.6, 8.3.9)
  docs.push(
    {
      '@timestamp': recentTimestamp(25),
      event: { category: 'iam', action: 'password_change' },
      user: { name: 'alice' },
      source: { ip: '10.0.0.7' },
    },
    {
      '@timestamp': recentTimestamp(26),
      event: { category: 'iam', action: 'mfa_enroll' },
      user: { name: 'bob' },
      source: { ip: '10.0.0.8' },
    }
  );

  return docs;
}

function buildNetworkDocs(): Doc[] {
  return [
    {
      '@timestamp': recentTimestamp(40),
      event: { category: 'network' },
      source: { ip: '10.0.0.1' },
      destination: { ip: '203.0.113.50' },
      tls: { version: '1.3' },
      network: { protocol: 'https' },
    },
    // Weak: TLS 1.0
    {
      '@timestamp': recentTimestamp(39),
      event: { category: 'network' },
      source: { ip: '10.0.0.2' },
      destination: { ip: '203.0.113.51' },
      tls: { version: '1.0' },
      network: { protocol: 'https' },
    },
    // Weak: TLS 1.1
    {
      '@timestamp': recentTimestamp(38),
      event: { category: 'network' },
      source: { ip: '10.0.0.3' },
      destination: { ip: '203.0.113.52' },
      tls: { version: '1.1' },
      network: { protocol: 'https' },
    },
    // Weak: plain HTTP — no TLS at all
    {
      '@timestamp': recentTimestamp(37),
      event: { category: 'network' },
      source: { ip: '10.0.0.4' },
      destination: { ip: '198.51.100.10' },
      network: { protocol: 'http' },
    },
    {
      '@timestamp': recentTimestamp(36),
      event: { category: 'network' },
      source: { ip: '10.0.0.5' },
      destination: { ip: '203.0.113.53' },
      tls: { version: '1.2' },
      network: { protocol: 'https' },
    },
    {
      '@timestamp': recentTimestamp(35),
      event: { category: 'network' },
      source: { ip: '10.0.0.6' },
      destination: { ip: '203.0.113.54' },
      tls: { version: '1.3' },
      network: { protocol: 'https' },
    },
  ];
}

function buildVulnDocs(): Doc[] {
  return [
    {
      '@timestamp': recentTimestamp(30),
      event: { category: 'vulnerability' },
      vulnerability: { id: 'CVE-2024-5678', severity: 'critical' },
      host: { name: 'db-server-01' },
    },
    {
      '@timestamp': recentTimestamp(29),
      event: { category: 'vulnerability' },
      vulnerability: { id: 'CVE-2024-9999', severity: 'high' },
      host: { name: 'web-server-02' },
    },
    {
      '@timestamp': recentTimestamp(28),
      event: { category: 'intrusion_detection', kind: 'alert', action: 'exploit_attempt' },
      host: { name: 'web-server-02' },
    },
    {
      '@timestamp': recentTimestamp(27),
      event: { category: 'intrusion_detection', kind: 'alert', action: 'port_scan' },
      host: { name: 'web-server-03' },
    },
  ];
}

function buildEndpointDocs(): Doc[] {
  return [
    {
      '@timestamp': recentTimestamp(20),
      event: { category: 'malware', module: 'endpoint', action: 'malware_detected' },
      host: { name: 'workstation-01' },
      process: { name: 'suspicious.exe' },
    },
    {
      '@timestamp': recentTimestamp(19),
      event: { category: 'process', module: 'endpoint', action: 'process_started' },
      host: { name: 'workstation-02' },
      process: { name: 'powershell.exe' },
    },
  ];
}

function buildCustomLegacyDocs(): Doc[] {
  return [
    {
      '@timestamp': recentTimestamp(25),
      username: 'jsmith',
      src_ip: '172.16.0.1',
      auth_result: 'pass',
      operation: 'login',
      hostname: 'app-01',
    },
    {
      '@timestamp': recentTimestamp(24),
      username: 'jdoe',
      src_ip: '172.16.0.2',
      auth_result: 'fail',
      operation: 'login',
      hostname: 'app-01',
    },
    {
      '@timestamp': recentTimestamp(23),
      hostname: 'web-server-01',
      severity: 'high',
      cve: 'CVE-2024-1234',
      program: 'nginx',
    },
    {
      '@timestamp': recentTimestamp(22),
      username: 'admin',
      src_ip: '172.16.0.3',
      auth_result: 'pass',
      operation: 'sudo',
      hostname: 'db-01',
    },
  ];
}

export async function seedPciEvalData({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> {
  log.info('Seeding PCI compliance eval data');

  const authDocs = buildAuthDocs();
  const networkDocs = buildNetworkDocs();
  const vulnDocs = buildVulnDocs();
  const endpointDocs = buildEndpointDocs();
  const customDocs = buildCustomLegacyDocs();

  await bulkIndex(esClient, PCI_INDICES.auth, authDocs);
  await bulkIndex(esClient, PCI_INDICES.network, networkDocs);
  await bulkIndex(esClient, PCI_INDICES.vuln, vulnDocs);
  await bulkIndex(esClient, PCI_INDICES.endpoint, endpointDocs);
  await bulkIndex(esClient, PCI_INDICES.custom, customDocs);

  log.info(
    `Seeded ${authDocs.length} auth, ${networkDocs.length} network, ` +
      `${vulnDocs.length} vuln, ${endpointDocs.length} endpoint, ${customDocs.length} custom docs`
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

  for (const index of indices) {
    try {
      await esClient.indices.deleteDataStream({ name: index });
    } catch {
      try {
        await esClient.indices.delete({ index, ignore_unavailable: true });
      } catch (error) {
        log.warning(
          `Failed to delete PCI eval index ${index}: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    }
  }
}
