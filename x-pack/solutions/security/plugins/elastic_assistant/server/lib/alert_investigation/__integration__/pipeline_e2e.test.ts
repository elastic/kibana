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

// Alerts with NESTED structure (as ES returns them)
const alerts = [
  // 3 duplicates
  {
    _id: 'test-dedup-1',
    _source: {
      kibana: { alert: { rule: { name: 'Malware Prevention Alert' }, risk_score: 73 } },
      host: { name: 'SRVMAC08', ip: ['192.168.64.3'] },
      user: { name: 'james' },
      process: {
        name: 'My Go Application.app',
        executable: '/var/folders/Setup.app/MyGoApp',
        hash: { sha256: '2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097' },
      },
      file: {
        name: 'My Go Application.app',
        hash: { sha256: '2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097' },
      },
      source: { ip: '192.168.64.3' },
    },
  },
  {
    _id: 'test-dedup-2',
    _source: {
      kibana: { alert: { rule: { name: 'Malware Prevention Alert' }, risk_score: 73 } },
      host: { name: 'SRVMAC08', ip: ['192.168.64.3'] },
      user: { name: 'james' },
      process: {
        name: 'My Go Application.app',
        executable: '/var/folders/Setup.app/MyGoApp',
        hash: { sha256: '2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097' },
      },
      file: {
        name: 'My Go Application.app',
        hash: { sha256: '2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097' },
      },
      source: { ip: '192.168.64.3' },
    },
  },
  {
    _id: 'test-dedup-3',
    _source: {
      kibana: { alert: { rule: { name: 'Malware Prevention Alert' }, risk_score: 73 } },
      host: { name: 'SRVMAC08', ip: ['192.168.64.3'] },
      user: { name: 'james' },
      process: {
        name: 'My Go Application.app',
        executable: '/var/folders/Setup.app/MyGoApp',
        hash: { sha256: '2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097' },
      },
      file: {
        name: 'My Go Application.app',
        hash: { sha256: '2c63ba2b1a5131b80e567b7a1a93997a2de07ea20d0a8f5149701c67b832c097' },
      },
      source: { ip: '192.168.64.3' },
    },
  },
  // Lateral movement
  {
    _id: 'test-lateral-1',
    _source: {
      kibana: { alert: { rule: { name: 'Lateral Movement via Remote Services' }, risk_score: 91 } },
      host: { name: 'SRVWIN01', ip: ['10.0.1.50'] },
      user: { name: 'admin' },
      process: { name: 'psexec.exe', executable: 'C:\\Windows\\System32\\psexec.exe' },
      source: { ip: '10.0.1.50' },
      destination: { ip: '10.0.2.100', domain: 'srvdb02.corp.local' },
    },
  },
  {
    _id: 'test-lateral-2',
    _source: {
      kibana: { alert: { rule: { name: 'Suspicious Process Execution' }, risk_score: 75 } },
      host: { name: 'SRVWIN01', ip: ['10.0.1.50'] },
      user: { name: 'admin' },
      process: { name: 'powershell.exe', executable: 'C:\\Windows\\System32\\powershell.exe' },
      source: { ip: '10.0.1.50' },
    },
  },
  {
    _id: 'test-lateral-3',
    _source: {
      kibana: { alert: { rule: { name: 'Suspicious Process Execution' }, risk_score: 75 } },
      host: { name: 'SRVWIN01', ip: ['10.0.1.50'] },
      user: { name: 'admin' },
      process: { name: 'cmd.exe', executable: 'C:\\Windows\\System32\\cmd.exe' },
      source: { ip: '10.0.1.50' },
    },
  },
  // Ransomware (rich entities)
  {
    _id: 'test-ransomware-1',
    _source: {
      kibana: { alert: { rule: { name: 'Ransomware Behavior Detected' }, risk_score: 99 } },
      host: { name: 'SRVDB02', ip: ['10.0.2.100'] },
      user: { name: 'SYSTEM' },
      process: {
        name: 'suspicious.exe',
        executable: 'C:\\Users\\Public\\suspicious.exe',
        hash: { sha256: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456' },
      },
      file: {
        name: 'important_data.xlsx.locked',
        hash: { sha256: 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678' },
      },
      source: { ip: '10.0.2.100' },
      destination: { ip: '185.220.101.42', domain: 'c2-server.evil.com' },
      dns: { question: { name: 'c2-server.evil.com' } },
      registry: { path: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\suspicious' },
    },
  },
  // Phishing
  {
    _id: 'test-phishing-1',
    _source: {
      kibana: { alert: { rule: { name: 'Phishing Email with Malicious Attachment' }, risk_score: 52 } },
      host: { name: 'MAIL-GW01', ip: ['10.0.0.10'] },
      user: { name: 'sarah', email: 'sarah@corp.local' },
      source: { ip: '203.0.113.50', domain: 'evil-phishing.com' },
      destination: { ip: '10.0.0.10' },
      url: { full: 'https://evil-phishing.com/login.php' },
      file: {
        name: 'invoice_q1_2026.pdf.exe',
        hash: { sha256: 'badc0ffee1234567890abcdef1234567890abcdef1234567890abcdef12345678' },
      },
    },
  },
  // Brute force
  {
    _id: 'test-bruteforce-1',
    _source: {
      kibana: { alert: { rule: { name: 'Brute Force Login Attempts' }, risk_score: 82 } },
      host: { name: 'DC01', ip: ['10.0.0.1'] },
      user: { name: 'administrator' },
      source: { ip: '198.51.100.25' },
      destination: { ip: '10.0.0.1' },
    },
  },
  // DNS exfiltration (shares host with ransomware)
  {
    _id: 'test-exfil-1',
    _source: {
      kibana: { alert: { rule: { name: 'Data Exfiltration via DNS' }, risk_score: 95 } },
      host: { name: 'SRVDB02', ip: ['10.0.2.100'] },
      user: { name: 'SYSTEM' },
      process: { name: 'dns_tunnel.exe', executable: 'C:\\ProgramData\\dns_tunnel.exe' },
      source: { ip: '10.0.2.100' },
      destination: { ip: '185.220.101.42', domain: 'exfil.evil.com' },
      dns: { question: { name: 'data.exfil.evil.com' } },
    },
  },
];

describe('Pipeline E2E with test data', () => {
  let dedupResult: Awaited<ReturnType<typeof deduplicateAlerts>>;
  let extractResult: ReturnType<typeof extractEntitiesFromAlerts>;

  beforeAll(async () => {
    dedupResult = await deduplicateAlerts({ alerts, esClient, logger });
    extractResult = extractEntitiesFromAlerts({ alerts: dedupResult.leaders, logger });
  });

  describe('Stage 1: Deduplication', () => {
    it('processes all 10 alerts', () => {
      expect(dedupResult.stats.totalAlerts).toBe(10);
    });

    it('removes 2 duplicates (3 malware alerts → 1 leader)', () => {
      expect(dedupResult.stats.duplicatesRemoved).toBe(2);
    });

    it('produces 8 unique leaders', () => {
      expect(dedupResult.leaders.length).toBe(8);
    });

    it('dedup rate is 20%', () => {
      expect(dedupResult.stats.deduplicationRate).toBe(0.2);
    });

    it('groups the 3 malware alerts into one cluster', () => {
      const malwareCluster = dedupResult.clusters.find(
        (c) =>
          c.leaderId.startsWith('test-dedup') ||
          c.memberIds.some((m) => m.startsWith('test-dedup'))
      );
      expect(malwareCluster).toBeDefined();
      expect(malwareCluster!.memberIds.length).toBeGreaterThanOrEqual(2);
    });

    it('does NOT dedup lateral movement alerts (different processes)', () => {
      const lateralIds = ['test-lateral-1', 'test-lateral-2', 'test-lateral-3'];
      const lateralLeaders = dedupResult.leaders.filter((l) => lateralIds.includes(l._id));
      expect(lateralLeaders.length).toBe(3);
    });
  });

  describe('Stage 2: Entity Extraction', () => {
    it('extracts entities from 8 leader alerts', () => {
      expect(extractResult.stats.entitiesExtracted).toBeGreaterThan(0);
    });

    it('finds all 5 hostnames', () => {
      const hostnames = new Set(
        extractResult.entities.filter((e) => e.typeKey === 'hostname').map((e) => e.value)
      );
      expect(hostnames).toEqual(
        new Set(['SRVMAC08', 'SRVWIN01', 'SRVDB02', 'MAIL-GW01', 'DC01'])
      );
    });

    it('finds all 5 users', () => {
      const users = new Set(
        extractResult.entities.filter((e) => e.typeKey === 'user').map((e) => e.value)
      );
      expect(users).toEqual(new Set(['james', 'admin', 'SYSTEM', 'sarah', 'administrator']));
    });

    it('finds C2 IP and external attacker IPs', () => {
      const ips = new Set(
        extractResult.entities
          .filter((e) => e.typeKey === 'ipv4' || e.typeKey === 'ipv6')
          .map((e) => e.value)
      );
      expect(ips.has('185.220.101.42')).toBe(true); // C2
      expect(ips.has('203.0.113.50')).toBe(true); // phishing source
      expect(ips.has('198.51.100.25')).toBe(true); // brute force source
    });

    it('finds malicious domains', () => {
      const domains = new Set(
        extractResult.entities.filter((e) => e.typeKey === 'domain').map((e) => e.value)
      );
      expect(domains.has('c2-server.evil.com')).toBe(true);
      expect(domains.has('exfil.evil.com')).toBe(true);
      // source.domain may not be in ECS mappings — check if present
      expect(domains.size).toBeGreaterThanOrEqual(2);
    });

    it('finds file hashes from malware and ransomware', () => {
      const hashes = new Set(
        extractResult.entities.filter((e) => e.typeKey === 'file_hash').map((e) => e.value)
      );
      expect(hashes.size).toBeGreaterThanOrEqual(3);
    });

    it('finds processes', () => {
      const procs = new Set(
        extractResult.entities.filter((e) => e.typeKey === 'process').map((e) => e.value)
      );
      expect(procs.has('psexec.exe')).toBe(true);
      expect(procs.has('suspicious.exe')).toBe(true);
      expect(procs.has('dns_tunnel.exe')).toBe(true);
    });

    it('extracts 20+ unique entities total', () => {
      expect(extractResult.stats.entitiesAfterDedup).toBeGreaterThanOrEqual(20);
    });

    it('summary: prints full pipeline results', () => {
      const byType: Record<string, string[]> = {};
      for (const e of extractResult.entities) {
        if (!byType[e.typeKey]) byType[e.typeKey] = [];
        if (!byType[e.typeKey].includes(e.value)) byType[e.typeKey].push(e.value);
      }

      // eslint-disable-next-line no-console
      console.log('\n=== PIPELINE E2E RESULTS ===');
      // eslint-disable-next-line no-console
      console.log('Dedup:', JSON.stringify(dedupResult.stats));
      // eslint-disable-next-line no-console
      console.log('Entities:', JSON.stringify(extractResult.stats));
      // eslint-disable-next-line no-console
      console.log('By type:', JSON.stringify(byType, null, 2));

      expect(true).toBe(true); // always passes, just for output
    });
  });
});
