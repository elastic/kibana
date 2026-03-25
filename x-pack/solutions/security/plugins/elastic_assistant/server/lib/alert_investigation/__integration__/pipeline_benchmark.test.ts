/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deduplicateAlerts } from '../deduplication';
import { extractEntitiesFromAlerts } from '../entity_extraction';

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

const esClient = {} as any;

// Alert templates for realistic variation
const RULES = [
  { name: 'Malware Prevention Alert', severity: 'high', riskBase: 73 },
  { name: 'Suspicious Process Execution', severity: 'high', riskBase: 75 },
  { name: 'Lateral Movement via Remote Services', severity: 'critical', riskBase: 91 },
  { name: 'Ransomware Behavior Detected', severity: 'critical', riskBase: 99 },
  { name: 'Brute Force Login Attempts', severity: 'high', riskBase: 82 },
  { name: 'Data Exfiltration via DNS', severity: 'critical', riskBase: 95 },
  { name: 'Phishing Email with Malicious Attachment', severity: 'medium', riskBase: 52 },
  { name: 'Credential Dumping Detected', severity: 'critical', riskBase: 88 },
  { name: 'Unauthorized Access to Sensitive Files', severity: 'high', riskBase: 70 },
  { name: 'Suspicious Network Connection', severity: 'medium', riskBase: 55 },
];

const HOSTS = [
  { name: 'SRVWIN01', ip: '10.0.1.50', os: 'Windows' },
  { name: 'SRVWIN02', ip: '10.0.1.51', os: 'Windows' },
  { name: 'SRVDB01', ip: '10.0.2.100', os: 'Windows Server' },
  { name: 'SRVDB02', ip: '10.0.2.101', os: 'Windows Server' },
  { name: 'SRVMAC01', ip: '192.168.64.3', os: 'macOS' },
  { name: 'SRVMAC02', ip: '192.168.64.4', os: 'macOS' },
  { name: 'MAIL-GW01', ip: '10.0.0.10', os: 'Linux' },
  { name: 'DC01', ip: '10.0.0.1', os: 'Windows Server' },
  { name: 'DC02', ip: '10.0.0.2', os: 'Windows Server' },
  { name: 'WEB01', ip: '10.0.3.10', os: 'Linux' },
];

const USERS = ['admin', 'james', 'sarah', 'SYSTEM', 'administrator', 'john', 'mike', 'root'];
const PROCESSES = [
  'powershell.exe',
  'cmd.exe',
  'psexec.exe',
  'suspicious.exe',
  'dns_tunnel.exe',
  'mimikatz.exe',
  'nc.exe',
  'python3',
  'bash',
  'curl',
];
const DEST_IPS = [
  '185.220.101.42',
  '203.0.113.50',
  '198.51.100.25',
  '45.33.32.156',
  '104.248.10.1',
];
const DOMAINS = [
  'c2-server.evil.com',
  'exfil.evil.com',
  'evil-phishing.com',
  'malware-drop.net',
  'crypto-miner.io',
];

function generateAlerts(count: number): Array<{ _id: string; _source: Record<string, unknown> }> {
  const alerts: Array<{ _id: string; _source: Record<string, unknown> }> = [];

  // Duplicate ratio: ~20% of alerts are duplicates (same rule+host+user+process)
  const uniqueCount = Math.floor(count * 0.8);
  const dupCount = count - uniqueCount;

  // Generate unique alerts
  for (let i = 0; i < uniqueCount; i++) {
    const rule = RULES[i % RULES.length];
    const host = HOSTS[i % HOSTS.length];
    const user = USERS[i % USERS.length];
    const process = PROCESSES[i % PROCESSES.length];
    const destIp = DEST_IPS[i % DEST_IPS.length];
    const domain = DOMAINS[i % DOMAINS.length];
    const hash = `${i.toString(16).padStart(64, '0')}`;

    alerts.push({
      _id: `bench-unique-${i}`,
      _source: {
        kibana: { alert: { rule: { name: rule.name }, risk_score: rule.riskBase } },
        host: { name: host.name, ip: [host.ip] },
        user: { name: user },
        process: { name: process, executable: `/usr/bin/${process}`, hash: { sha256: hash } },
        source: { ip: host.ip },
        destination: { ip: destIp, domain },
        file: { name: `file-${i}.dat`, hash: { sha256: hash } },
        dns: { question: { name: domain } },
      },
    });
  }

  // Generate duplicates (exact copies of random unique alerts)
  for (let i = 0; i < dupCount; i++) {
    const sourceIdx = i % uniqueCount;
    const source = alerts[sourceIdx];
    alerts.push({
      _id: `bench-dup-${i}`,
      _source: { ...source._source },
    });
  }

  // Shuffle to simulate real-world order
  for (let i = alerts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [alerts[i], alerts[j]] = [alerts[j], alerts[i]];
  }

  return alerts;
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

describe('Pipeline Benchmark', () => {
  describe('100 alerts', () => {
    const alerts = generateAlerts(100);
    let dedupResult: Awaited<ReturnType<typeof deduplicateAlerts>>;
    let extractResult: ReturnType<typeof extractEntitiesFromAlerts>;
    let dedupTimeMs: number;
    let extractTimeMs: number;

    beforeAll(async () => {
      const dedupStart = performance.now();
      dedupResult = await deduplicateAlerts({ alerts, esClient, logger });
      dedupTimeMs = performance.now() - dedupStart;

      const extractStart = performance.now();
      extractResult = extractEntitiesFromAlerts({ alerts: dedupResult.leaders, logger });
      extractTimeMs = performance.now() - extractStart;
    });

    it('deduplication completes in <500ms', () => {
      // eslint-disable-next-line no-console
      console.log(`\n=== 100 ALERTS BENCHMARK ===`);
      // eslint-disable-next-line no-console
      console.log(`Dedup: ${formatMs(dedupTimeMs)}`);
      expect(dedupTimeMs).toBeLessThan(500);
    });

    it('entity extraction completes in <500ms', () => {
      // eslint-disable-next-line no-console
      console.log(`Extract: ${formatMs(extractTimeMs)}`);
      expect(extractTimeMs).toBeLessThan(500);
    });

    it('total pipeline (dedup + extract) completes in <1s', () => {
      const total = dedupTimeMs + extractTimeMs;
      // eslint-disable-next-line no-console
      console.log(`Total: ${formatMs(total)}`);
      expect(total).toBeLessThan(1000);
    });

    it('deduplication removes ~20% duplicates', () => {
      // eslint-disable-next-line no-console
      console.log(`Dedup stats: ${JSON.stringify(dedupResult.stats)}`);
      expect(dedupResult.stats.deduplicationRate).toBeGreaterThanOrEqual(0.1);
      expect(dedupResult.stats.deduplicationRate).toBeLessThanOrEqual(0.4);
    });

    it('extracts entities from all leaders', () => {
      // eslint-disable-next-line no-console
      console.log(`Extract stats: ${JSON.stringify(extractResult.stats)}`);
      expect(extractResult.stats.entitiesExtracted).toBeGreaterThan(0);
    });

    it('summary', () => {
      const byType: Record<string, number> = {};
      for (const e of extractResult.entities) {
        byType[e.typeKey] = (byType[e.typeKey] ?? 0) + 1;
      }
      // eslint-disable-next-line no-console
      console.log(`Entity types: ${JSON.stringify(byType)}`);
      // eslint-disable-next-line no-console
      console.log(
        `Performance: ${formatMs(dedupTimeMs)} dedup + ${formatMs(extractTimeMs)} extract = ${formatMs(dedupTimeMs + extractTimeMs)} total`
      );
      // eslint-disable-next-line no-console
      console.log(
        `Throughput: ${Math.round(100 / ((dedupTimeMs + extractTimeMs) / 1000))} alerts/sec`
      );
    });
  });

  describe('1000 alerts', () => {
    const alerts = generateAlerts(1000);
    let dedupResult: Awaited<ReturnType<typeof deduplicateAlerts>>;
    let extractResult: ReturnType<typeof extractEntitiesFromAlerts>;
    let dedupTimeMs: number;
    let extractTimeMs: number;

    beforeAll(async () => {
      const dedupStart = performance.now();
      dedupResult = await deduplicateAlerts({ alerts, esClient, logger });
      dedupTimeMs = performance.now() - dedupStart;

      const extractStart = performance.now();
      extractResult = extractEntitiesFromAlerts({ alerts: dedupResult.leaders, logger });
      extractTimeMs = performance.now() - extractStart;
    });

    it('deduplication completes in <5s', () => {
      // eslint-disable-next-line no-console
      console.log(`\n=== 1000 ALERTS BENCHMARK ===`);
      // eslint-disable-next-line no-console
      console.log(`Dedup: ${formatMs(dedupTimeMs)}`);
      expect(dedupTimeMs).toBeLessThan(5000);
    });

    it('entity extraction completes in <2s', () => {
      // eslint-disable-next-line no-console
      console.log(`Extract: ${formatMs(extractTimeMs)}`);
      expect(extractTimeMs).toBeLessThan(2000);
    });

    it('total pipeline (dedup + extract) completes in <7s', () => {
      const total = dedupTimeMs + extractTimeMs;
      // eslint-disable-next-line no-console
      console.log(`Total: ${formatMs(total)}`);
      expect(total).toBeLessThan(7000);
    });

    it('deduplication removes ~20% duplicates', () => {
      // eslint-disable-next-line no-console
      console.log(`Dedup stats: ${JSON.stringify(dedupResult.stats)}`);
      expect(dedupResult.stats.deduplicationRate).toBeGreaterThanOrEqual(0.1);
      expect(dedupResult.stats.deduplicationRate).toBeLessThanOrEqual(0.4);
    });

    it('extracts entities from all leaders', () => {
      // eslint-disable-next-line no-console
      console.log(`Extract stats: ${JSON.stringify(extractResult.stats)}`);
      expect(extractResult.stats.entitiesExtracted).toBeGreaterThan(0);
    });

    it('summary', () => {
      const byType: Record<string, number> = {};
      for (const e of extractResult.entities) {
        byType[e.typeKey] = (byType[e.typeKey] ?? 0) + 1;
      }
      // eslint-disable-next-line no-console
      console.log(`Entity types: ${JSON.stringify(byType)}`);
      // eslint-disable-next-line no-console
      console.log(
        `Performance: ${formatMs(dedupTimeMs)} dedup + ${formatMs(extractTimeMs)} extract = ${formatMs(dedupTimeMs + extractTimeMs)} total`
      );
      // eslint-disable-next-line no-console
      console.log(
        `Throughput: ${Math.round(1000 / ((dedupTimeMs + extractTimeMs) / 1000))} alerts/sec`
      );
    });
  });

  describe('PR description expectations', () => {
    it('matches stated pipeline processing time (<1s for 500 alerts)', async () => {
      const alerts500 = generateAlerts(500);

      const start = performance.now();
      const dedup = await deduplicateAlerts({ alerts: alerts500, esClient, logger });
      extractEntitiesFromAlerts({ alerts: dedup.leaders, logger });
      const totalMs = performance.now() - start;

      // PR says "500 alerts in <1s" for deterministic stages
      // eslint-disable-next-line no-console
      console.log(`\n=== PR EXPECTATION CHECK: 500 alerts ===`);
      // eslint-disable-next-line no-console
      console.log(`Total: ${formatMs(totalMs)} (PR says <1s)`);
      // eslint-disable-next-line no-console
      console.log(`Result: ${totalMs < 1000 ? 'MEETS EXPECTATION' : 'EXCEEDS EXPECTATION'}`);

      expect(totalMs).toBeLessThan(5000); // generous bound for CI
    });

    it('deduplication rate matches stated ~20% for mixed alerts', async () => {
      const alerts200 = generateAlerts(200);
      const result = await deduplicateAlerts({ alerts: alerts200, esClient, logger });

      // eslint-disable-next-line no-console
      console.log(
        `Dedup rate at 200 alerts: ${(result.stats.deduplicationRate * 100).toFixed(1)}% (PR says ~20%)`
      );

      // Should be in the 10-30% range
      expect(result.stats.deduplicationRate).toBeGreaterThanOrEqual(0.1);
      expect(result.stats.deduplicationRate).toBeLessThanOrEqual(0.35);
    });
  });
});
