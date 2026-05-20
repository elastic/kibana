/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * HOLDOUT fixtures for PCI compliance evals.
 *
 * Purpose
 * -------
 * The iteration dataset (`pci_data.ts`) is the one we look at while improving
 * the skill — we read judge rationales, identify failure modes, and rewrite
 * the skill to address them. That tight loop is high-bandwidth but it's also
 * the textbook recipe for overfitting: the skill's "improvements" can be
 * indistinguishable from "encoding the iteration fixtures into the skill".
 *
 * This holdout dataset exists so we can measure that gap. It tests the SAME
 * PCI capabilities (brute-force detection, weak TLS detection, default-account
 * recognition, scope discovery, field mapping, graceful no-data handling) but
 * uses systematically DIFFERENT values, naming conventions, volumes, and time
 * windows. If the skill scores well on iteration AND well on holdout, the
 * skill has learnt PCI principles. If it scores well on iteration and badly
 * on holdout, it has memorised the iteration fixtures.
 *
 * Divergence axes (all changed from `pci_data.ts`)
 * ------------------------------------------------
 *  - Index naming: drops the `logs-<prefix>-{category}` pattern in favour of
 *    `security.audit.identity-YYYY`, `siem-flows-prod`, etc. — forces the
 *    skill to identify PCI-relevant data via field caps, not name matching.
 *  - Brute-force volume: 8 attempts (BELOW the PCI 8.3.4 threshold of 10) —
 *    the correct answer is "no violation", catching skills that flag any
 *    failed-login cluster as a brute force.
 *  - Brute-force user / IP: `pcompton` from 10.20.30.40 (not `jdoe` from
 *    192.168.1.100).
 *  - Default-account names: `Administrator` (Windows convention) + a service
 *    account (`service_acct_42`), not the Unix `admin`/`root` from the
 *    iteration set. Same domain concept (PCI 2.2.4), different surface.
 *  - Weak TLS: TLS 1.1 only (NO 1.0, NO plain HTTP). Tests that the skill
 *    can identify a single weak version rather than relying on the
 *    "multiple weak versions plus plain HTTP" signature of the iteration
 *    set.
 *  - CVE years: 2025 not 2024.
 *  - Custom legacy schema: `actor_name`, `client_addr`, `action_status`,
 *    `event_verb`, `device_id`, `cve_id`, `risk_rating`, `command`. Same
 *    ECS-mapping capability test, completely different field names.
 *  - Time window: events spread across the last 4 hours (not 1 hour) —
 *    tests that the skill honours requested lookback periods other than
 *    "last hour".
 *
 * Inspection discipline
 * ---------------------
 * **The judge rationales and per-scenario failure traces for this dataset
 * must not be read while iterating on the skill.** They are the unbiased
 * generalisation signal; consuming them during iteration destroys the
 * measurement. The numeric mean score is fine to look at — it tells us
 * whether the iteration loop is healthy. The detailed criterion-level
 * pass/fail per scenario is reserved for post-mortems.
 *
 * Lifecycle
 * ---------
 * Spawned in the same `seedPciEvalData` / `cleanupPciEvalData` pattern as
 * the iteration set so a single Scout boot can run BOTH suites in series.
 */

const HOLDOUT_PREFIX = `hldoutg${Math.random().toString(36).substring(2, 6)}`;

export const PCI_HOLDOUT_INDICES = {
  // Deliberately NOT shaped like `logs-*-{category}`. Realistic enterprise
  // naming conventions vary wildly (data streams, custom index templates,
  // legacy syslog dumps); the skill should still discover PCI relevance via
  // field caps regardless of name.
  identity: `security-audit-identity-${HOLDOUT_PREFIX}`,
  flows: `siem-flows-prod-${HOLDOUT_PREFIX}`,
  pkginfo: `pkginfo-cve-${HOLDOUT_PREFIX}`,
  edr: `edr-processes-${HOLDOUT_PREFIX}`,
  legacy: `legacy-app-syslog-${HOLDOUT_PREFIX}`,
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
    throw new Error(
      `Bulk indexing into ${index} failed: ${JSON.stringify(firstError, null, 2)}`
    );
  }
}

/**
 * Identity events.
 *
 *  - 8 failed logins for `pcompton` from `10.20.30.40` — BELOW the PCI 8.3.4
 *    threshold of 10. The expected answer for a 8.3.4 check on this dataset
 *    is "no violation / GREEN". A skill that flags any failed-login cluster
 *    will produce a false positive here.
 *
 *  - 14 distinct users with 1 failed login each from different IPs —
 *    distributed failures, NOT a brute force. Tests that the skill groups by
 *    actor before applying the threshold.
 *
 *  - Successful logins from `Administrator` (Windows default account) and
 *    `service_acct_42` (service-account anti-pattern) — Req 2.2.4 violations
 *    that do NOT use the Unix `admin`/`root` names from the iteration set.
 *
 *  - Mostly clock-scattered between 30 min and 3.5 hours ago — tests longer
 *    lookback windows.
 */
function buildIdentityDocs(): Doc[] {
  const docs: Doc[] = [];

  // BELOW-threshold brute-force candidate.
  for (let i = 0; i < 8; i++) {
    docs.push({
      '@timestamp': recentTimestamp(30 + i * 4),
      event: { category: 'authentication', outcome: 'failure', action: 'user_login' },
      user: { name: 'pcompton' },
      source: { ip: '10.20.30.40' },
    });
  }

  // Distributed failures — 14 distinct users, 1 each. NOT a brute force.
  const distractorUsers = [
    'msantos',
    'jli',
    'klee',
    'awong',
    'rrivera',
    'tbrown',
    'cjones',
    'sbaker',
    'dpark',
    'lhall',
    'fperez',
    'eyoung',
    'ngreen',
    'hking',
  ];
  for (const [idx, name] of distractorUsers.entries()) {
    docs.push({
      '@timestamp': recentTimestamp(60 + idx * 2),
      event: { category: 'authentication', outcome: 'failure', action: 'user_login' },
      user: { name },
      source: { ip: `10.${50 + idx}.0.${idx}` },
    });
  }

  // Default-account violations — Windows + service account flavours.
  docs.push(
    {
      '@timestamp': recentTimestamp(45),
      event: { category: 'authentication', outcome: 'success', action: 'user_login' },
      user: { name: 'Administrator' },
      source: { ip: '10.40.0.5' },
      host: { os: { family: 'windows' } },
    },
    {
      '@timestamp': recentTimestamp(46),
      event: { category: 'authentication', outcome: 'success', action: 'user_login' },
      user: { name: 'service_acct_42' },
      source: { ip: '10.40.0.6' },
    }
  );

  // Two legitimate successful logins so the dataset isn't 100% violations.
  docs.push(
    {
      '@timestamp': recentTimestamp(50),
      event: { category: 'authentication', outcome: 'success', action: 'user_login' },
      user: { name: 'eapen' },
      source: { ip: '10.40.0.20' },
    },
    {
      '@timestamp': recentTimestamp(55),
      event: { category: 'iam', action: 'mfa_enroll' },
      user: { name: 'eapen' },
      source: { ip: '10.40.0.20' },
    }
  );

  return docs;
}

/**
 * Flows events. TLS 1.1 ONLY — single weak version, no plain HTTP, no TLS 1.0.
 * Tests sub-version recognition without the iteration set's "kitchen sink"
 * weak-TLS signature.
 */
function buildFlowsDocs(): Doc[] {
  return [
    {
      '@timestamp': recentTimestamp(70),
      event: { category: 'network' },
      source: { ip: '10.60.0.1' },
      destination: { ip: '192.0.2.10' },
      tls: { version: '1.3' },
      network: { protocol: 'https' },
    },
    {
      '@timestamp': recentTimestamp(75),
      event: { category: 'network' },
      source: { ip: '10.60.0.2' },
      destination: { ip: '192.0.2.11' },
      tls: { version: '1.2' },
      network: { protocol: 'https' },
    },
    // The single weak-TLS violation — TLS 1.1 only.
    {
      '@timestamp': recentTimestamp(80),
      event: { category: 'network' },
      source: { ip: '10.60.0.3' },
      destination: { ip: '192.0.2.12' },
      tls: { version: '1.1' },
      network: { protocol: 'https' },
    },
    {
      '@timestamp': recentTimestamp(85),
      event: { category: 'network' },
      source: { ip: '10.60.0.4' },
      destination: { ip: '192.0.2.13' },
      tls: { version: '1.3' },
      network: { protocol: 'https' },
    },
  ];
}

/**
 * Vulnerability / package-inventory data with 2025-vintage CVEs and
 * PCI-specific host names (POS terminal, payment API host).
 */
function buildPackageInfoDocs(): Doc[] {
  return [
    {
      '@timestamp': recentTimestamp(120),
      event: { category: 'vulnerability' },
      vulnerability: { id: 'CVE-2025-0001', severity: 'critical' },
      host: { name: 'pos-terminal-7' },
    },
    {
      '@timestamp': recentTimestamp(150),
      event: { category: 'vulnerability' },
      vulnerability: { id: 'CVE-2025-0042', severity: 'high' },
      host: { name: 'paymentapi-eu-1' },
    },
    {
      '@timestamp': recentTimestamp(180),
      event: { category: 'vulnerability' },
      vulnerability: { id: 'CVE-2025-1099', severity: 'medium' },
      host: { name: 'paymentapi-eu-1' },
    },
  ];
}

function buildEdrDocs(): Doc[] {
  return [
    {
      '@timestamp': recentTimestamp(100),
      event: { category: 'malware', module: 'endpoint', action: 'malware_detected' },
      host: { name: 'pos-terminal-3' },
      process: { name: 'unknown-loader.exe' },
    },
    {
      '@timestamp': recentTimestamp(110),
      event: { category: 'process', module: 'endpoint', action: 'process_started' },
      host: { name: 'paymentapi-eu-1' },
      process: { name: 'sshd' },
    },
  ];
}

/**
 * Legacy non-ECS schema. Same ECS-mapping capability test as the iteration
 * `custom` index, but EVERY field name is different. Tests that the
 * field-mapper genuinely infers ECS targets from semantics, not from
 * memorised `username → user.name` style hard-codes.
 */
function buildLegacyDocs(): Doc[] {
  return [
    {
      '@timestamp': recentTimestamp(160),
      actor_name: 'msmith',
      client_addr: '172.17.0.1',
      action_status: 'success',
      event_verb: 'sign_in',
      device_id: 'app-eu-01',
    },
    {
      '@timestamp': recentTimestamp(165),
      actor_name: 'Administrator',
      client_addr: '172.17.0.2',
      action_status: 'success',
      event_verb: 'privilege_escalation',
      device_id: 'app-eu-01',
    },
    {
      '@timestamp': recentTimestamp(170),
      device_id: 'paymentapi-eu-1',
      risk_rating: 'critical',
      cve_id: 'CVE-2025-2222',
      command: 'openssl',
    },
  ];
}

export async function seedPciHoldoutData({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> {
  log.info(
    'Seeding PCI compliance HOLDOUT data — divergent fixtures for generalisation measurement'
  );

  const identityDocs = buildIdentityDocs();
  const flowsDocs = buildFlowsDocs();
  const pkgDocs = buildPackageInfoDocs();
  const edrDocs = buildEdrDocs();
  const legacyDocs = buildLegacyDocs();

  await bulkIndex(esClient, PCI_HOLDOUT_INDICES.identity, identityDocs);
  await bulkIndex(esClient, PCI_HOLDOUT_INDICES.flows, flowsDocs);
  await bulkIndex(esClient, PCI_HOLDOUT_INDICES.pkginfo, pkgDocs);
  await bulkIndex(esClient, PCI_HOLDOUT_INDICES.edr, edrDocs);
  await bulkIndex(esClient, PCI_HOLDOUT_INDICES.legacy, legacyDocs);

  log.info(
    `Seeded holdout: ${identityDocs.length} identity, ${flowsDocs.length} flows, ` +
      `${pkgDocs.length} pkginfo, ${edrDocs.length} edr, ${legacyDocs.length} legacy docs`
  );
}

export async function cleanupPciHoldoutData({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> {
  log.info('Cleaning up PCI compliance holdout data');
  const indices = Object.values(PCI_HOLDOUT_INDICES);

  for (const index of indices) {
    try {
      await esClient.indices.deleteDataStream({ name: index });
    } catch {
      try {
        await esClient.indices.delete({ index, ignore_unavailable: true });
      } catch (error) {
        log.warning(
          `Failed to delete PCI holdout index ${index}: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    }
  }
}
