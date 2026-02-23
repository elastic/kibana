/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { EntityExtractionService } from '../services/entity_extraction_service';
import { DEFAULT_ENTITY_TYPE_CONFIGS, ObservableTypeKey } from '../types';

describe('EntityExtractionService Integration Tests', () => {
  let logger: MockedLogger;
  let service: EntityExtractionService;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new EntityExtractionService({
      logger,
      entityTypeConfigs: DEFAULT_ENTITY_TYPE_CONFIGS,
    });
  });

  describe('Real-world alert extraction scenarios', () => {
    it('should extract entities from a typical malware alert', () => {
      const malwareAlert = {
        _id: 'malware-alert-001',
        _source: {
          '@timestamp': '2024-01-15T10:30:00.000Z',
          host: {
            name: 'DESKTOP-ABC123',
            ip: ['192.168.1.50', '10.0.0.50'],
            os: { name: 'Windows 10' },
          },
          user: {
            name: 'jsmith',
            domain: 'CORP',
          },
          process: {
            name: 'malware.exe',
            executable: 'C:\\Users\\jsmith\\Downloads\\malware.exe',
            hash: {
              sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              md5: 'd41d8cd98f00b204e9800998ecf8427e',
            },
            parent: {
              name: 'explorer.exe',
              executable: 'C:\\Windows\\explorer.exe',
            },
          },
          file: {
            path: 'C:\\Users\\jsmith\\Downloads\\malware.exe',
            hash: {
              sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          },
          source: {
            ip: '203.0.113.50',
          },
          destination: {
            ip: '192.168.1.50',
          },
          'kibana.alert.rule.name': 'Malware Detection',
          'kibana.alert.severity': 'critical',
        },
      };

      const result = service.extractEntities([malwareAlert]);

      // Should extract IPs
      const ips = result.entities.filter((e) => e.type === ObservableTypeKey.IPv4);
      expect(ips.length).toBeGreaterThanOrEqual(2);
      expect(ips.some((ip) => ip.normalizedValue === '203.0.113.50')).toBe(true);
      expect(ips.some((ip) => ip.normalizedValue === '192.168.1.50')).toBe(true);

      // Should extract hostname
      const hostnames = result.entities.filter((e) => e.type === ObservableTypeKey.Hostname);
      expect(hostnames.some((h) => h.normalizedValue.toLowerCase() === 'desktop-abc123')).toBe(true);

      // Should extract username
      const users = result.entities.filter((e) => e.type === ObservableTypeKey.User);
      expect(users.some((u) => u.normalizedValue === 'jsmith')).toBe(true);

      // Should extract file hashes
      const sha256 = result.entities.filter((e) => e.type === ObservableTypeKey.FileHashSHA256);
      expect(sha256.length).toBeGreaterThanOrEqual(1);
      expect(sha256[0].normalizedValue).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );

      // Should extract file paths
      const filePaths = result.entities.filter((e) => e.type === ObservableTypeKey.FilePath);
      expect(filePaths.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract entities from a network intrusion alert', () => {
      const networkAlert = {
        _id: 'network-alert-001',
        _source: {
          '@timestamp': '2024-01-15T11:00:00.000Z',
          source: {
            ip: '185.220.101.1',
            port: 45678,
          },
          destination: {
            ip: '10.0.0.100',
            port: 22,
          },
          dns: {
            question: {
              name: 'malicious-domain.com',
            },
          },
          url: {
            full: 'https://malicious-domain.com/payload.exe',
            domain: 'malicious-domain.com',
          },
          host: {
            name: 'web-server-01.internal.corp.com',
          },
          user: {
            name: 'root',
          },
          'kibana.alert.rule.name': 'SSH Brute Force',
        },
      };

      const result = service.extractEntities([networkAlert]);

      // Should extract source IP (external)
      const ips = result.entities.filter((e) => e.type === ObservableTypeKey.IPv4);
      expect(ips.some((ip) => ip.normalizedValue === '185.220.101.1')).toBe(true);

      // Should extract domain
      const domains = result.entities.filter((e) => e.type === ObservableTypeKey.Domain);
      expect(domains.some((d) => d.normalizedValue === 'malicious-domain.com')).toBe(true);

      // Should extract URL
      const urls = result.entities.filter((e) => e.type === ObservableTypeKey.URL);
      expect(urls.some((u) => u.normalizedValue.includes('malicious-domain.com'))).toBe(true);

      // Should extract hostname
      const hostnames = result.entities.filter((e) => e.type === ObservableTypeKey.Hostname);
      expect(hostnames.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract entities from a phishing alert with email', () => {
      const phishingAlert = {
        _id: 'phishing-alert-001',
        _source: {
          '@timestamp': '2024-01-15T12:00:00.000Z',
          user: {
            name: 'victim.user',
            email: 'victim.user@company.com',
          },
          source: {
            user: {
              email: 'attacker@phishing-domain.com',
            },
          },
          url: {
            full: 'https://fake-login.phishing-domain.com/login',
            domain: 'fake-login.phishing-domain.com',
          },
          host: {
            name: 'mail-server-01',
          },
          'kibana.alert.rule.name': 'Phishing Email Detected',
        },
      };

      const result = service.extractEntities([phishingAlert]);

      // Should extract emails
      const emails = result.entities.filter((e) => e.type === ObservableTypeKey.Email);
      expect(emails.length).toBeGreaterThanOrEqual(1);

      // Should extract domains
      const domains = result.entities.filter((e) => e.type === ObservableTypeKey.Domain);
      expect(domains.some((d) => d.normalizedValue.includes('phishing-domain.com'))).toBe(true);
    });

    it('should handle alerts with missing or null fields gracefully', () => {
      const incompleteAlert = {
        _id: 'incomplete-alert-001',
        _source: {
          '@timestamp': '2024-01-15T13:00:00.000Z',
          host: {
            name: null,
            ip: undefined,
          },
          user: {},
          source: {
            ip: '192.168.1.100',
          },
          process: null,
          'kibana.alert.rule.name': 'Incomplete Data Alert',
        },
      };

      // Should not throw
      expect(() => service.extractEntities([incompleteAlert])).not.toThrow();

      const result = service.extractEntities([incompleteAlert]);

      // Should still extract the valid IP
      const ips = result.entities.filter((e) => e.type === ObservableTypeKey.IPv4);
      expect(ips.some((ip) => ip.normalizedValue === '192.168.1.100')).toBe(true);
    });

    it('should deduplicate entities across multiple related alerts', () => {
      const alerts = [
        {
          _id: 'alert-001',
          _source: {
            source: { ip: '192.168.1.100' },
            host: { name: 'workstation-01' },
            user: { name: 'jsmith' },
          },
        },
        {
          _id: 'alert-002',
          _source: {
            source: { ip: '192.168.1.100' }, // Same IP
            destination: { ip: '10.0.0.50' },
            host: { name: 'workstation-01' }, // Same hostname
            user: { name: 'jsmith' }, // Same user
          },
        },
        {
          _id: 'alert-003',
          _source: {
            source: { ip: '192.168.1.100' }, // Same IP again
            host: { name: 'server-01' }, // Different hostname
            user: { name: 'admin' }, // Different user
          },
        },
      ];

      const result = service.extractEntities(alerts);

      // Should deduplicate the shared IP
      const sharedIp = result.entities.find(
        (e) => e.type === ObservableTypeKey.IPv4 && e.normalizedValue === '192.168.1.100'
      );
      expect(sharedIp).toBeDefined();
      expect(sharedIp!.occurrenceCount).toBe(3);
      expect(sharedIp!.alertIds).toContain('alert-001');
      expect(sharedIp!.alertIds).toContain('alert-002');
      expect(sharedIp!.alertIds).toContain('alert-003');

      // Should deduplicate the shared hostname
      const sharedHostname = result.entities.find(
        (e) =>
          e.type === ObservableTypeKey.Hostname &&
          e.normalizedValue.toLowerCase() === 'workstation-01'
      );
      expect(sharedHostname).toBeDefined();
      expect(sharedHostname!.occurrenceCount).toBe(2);

      // Should have unique hostnames
      const hostnames = result.entities.filter((e) => e.type === ObservableTypeKey.Hostname);
      expect(hostnames.length).toBe(2); // workstation-01 and server-01
    });

    it('should handle large batch of alerts efficiently', () => {
      // Generate 100 alerts with various entities
      const alerts = Array.from({ length: 100 }, (_, i) => ({
        _id: `batch-alert-${i}`,
        _source: {
          source: { ip: `192.168.${Math.floor(i / 256)}.${i % 256}` },
          host: { name: `workstation-${i % 10}` },
          user: { name: `user${i % 5}` },
          file: {
            hash: {
              sha256: `${i.toString(16).padStart(64, '0')}`,
            },
          },
        },
      }));

      const startTime = Date.now();
      const result = service.extractEntities(alerts);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 1 second for 100 alerts)
      expect(duration).toBeLessThan(1000);

      // Should have extracted entities
      expect(result.entities.length).toBeGreaterThan(0);

      // Should have deduplicated repeated hostnames and usernames
      const hostnames = result.entities.filter((e) => e.type === ObservableTypeKey.Hostname);
      expect(hostnames.length).toBe(10); // Only 10 unique hostnames

      const users = result.entities.filter((e) => e.type === ObservableTypeKey.User);
      expect(users.length).toBe(5); // Only 5 unique users
    });

    it('should properly categorize entities by type', () => {
      const mixedAlert = {
        _id: 'mixed-alert-001',
        _source: {
          source: { ip: '10.0.0.1' },
          destination: { ip: '203.0.113.100' },
          host: { name: 'my-workstation.corp.com' },
          user: { name: 'testuser', email: 'testuser@corp.com' },
          dns: { question: { name: 'example.com' } },
          url: { full: 'https://example.com/path' },
          file: {
            hash: {
              sha256: 'a'.repeat(64),
              md5: 'b'.repeat(32),
              sha1: 'c'.repeat(40),
            },
            path: '/var/log/test.log',
          },
        },
      };

      const result = service.extractEntities([mixedAlert]);

      // Verify entitiesByType structure
      expect(result.entitiesByType).toBeDefined();
      expect(result.entitiesByType[ObservableTypeKey.IPv4]).toBeDefined();
      expect(result.entitiesByType[ObservableTypeKey.Hostname]).toBeDefined();
      expect(result.entitiesByType[ObservableTypeKey.User]).toBeDefined();
      expect(result.entitiesByType[ObservableTypeKey.Domain]).toBeDefined();
      expect(result.entitiesByType[ObservableTypeKey.FileHashSHA256]).toBeDefined();
      expect(result.entitiesByType[ObservableTypeKey.FileHashMD5]).toBeDefined();
    });
  });

  describe('Edge cases and validation', () => {
    it('should filter out loopback and special IPs', () => {
      const alertWithSpecialIPs = {
        _id: 'special-ip-alert',
        _source: {
          source: { ip: '127.0.0.1' },
          destination: { ip: '0.0.0.0' },
          host: { ip: ['192.168.1.1', '::1'] },
        },
      };

      const result = service.extractEntities([alertWithSpecialIPs]);

      const ips = result.entities.filter((e) => e.type === ObservableTypeKey.IPv4);
      // Should only include the valid private IP, not loopback or 0.0.0.0
      expect(ips.some((ip) => ip.normalizedValue === '127.0.0.1')).toBe(false);
      expect(ips.some((ip) => ip.normalizedValue === '0.0.0.0')).toBe(false);
    });

    it('should validate hash formats', () => {
      const alertWithInvalidHashes = {
        _id: 'invalid-hash-alert',
        _source: {
          file: {
            hash: {
              sha256: 'not-a-valid-sha256',
              md5: 'short',
              sha1: 'a'.repeat(40), // Valid SHA1
            },
          },
          process: {
            hash: {
              sha256: 'e'.repeat(64), // Valid SHA256
            },
          },
        },
      };

      const result = service.extractEntities([alertWithInvalidHashes]);

      // Should only include valid hashes
      const sha256 = result.entities.filter((e) => e.type === ObservableTypeKey.FileHashSHA256);
      expect(sha256.length).toBe(1);
      expect(sha256[0].normalizedValue).toBe('e'.repeat(64));

      const md5 = result.entities.filter((e) => e.type === ObservableTypeKey.FileHashMD5);
      expect(md5.length).toBe(0); // Invalid MD5 should be filtered
    });

    it('should handle deeply nested fields', () => {
      const deeplyNestedAlert = {
        _id: 'nested-alert',
        _source: {
          threat: {
            enrichments: [
              {
                indicator: {
                  ip: '45.33.32.156',
                  domain: 'scanme.nmap.org',
                },
              },
            ],
          },
          process: {
            parent: {
              parent: {
                hash: {
                  sha256: 'f'.repeat(64),
                },
              },
            },
          },
        },
      };

      // This tests that the service can handle various nesting levels
      // Even if not all paths are configured, it shouldn't error
      expect(() => service.extractEntities([deeplyNestedAlert])).not.toThrow();
    });
  });
});
