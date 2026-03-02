/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { EntityExtractionService } from './entity_extraction_service';
import { ObservableTypeKey, DEFAULT_ENTITY_TYPE_CONFIGS } from '../types';

describe('EntityExtractionService', () => {
  let logger: MockedLogger;
  let service: EntityExtractionService;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new EntityExtractionService({
      logger,
      entityTypeConfigs: DEFAULT_ENTITY_TYPE_CONFIGS,
    });
  });

  describe('extractEntities', () => {
    it('should extract IPv4 addresses from alerts', () => {
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            source: { ip: '192.168.1.100' },
            destination: { ip: '10.0.0.1' },
          },
        },
      ];

      const result = service.extractEntities(alerts);

      expect(result.entities).toHaveLength(2);
      expect(result.entities).toContainEqual(
        expect.objectContaining({
          type: ObservableTypeKey.IPv4,
          normalizedValue: '192.168.1.100',
          sourceAlertId: 'alert-1',
        })
      );
      expect(result.entities).toContainEqual(
        expect.objectContaining({
          type: ObservableTypeKey.IPv4,
          normalizedValue: '10.0.0.1',
          sourceAlertId: 'alert-1',
        })
      );
    });

    it('should extract hostnames from alerts', () => {
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            host: { name: 'workstation-01.corp.example.com' },
          },
        },
      ];

      const result = service.extractEntities(alerts);

      const hostnames = result.entities.filter((e) => e.type === ObservableTypeKey.Hostname);
      expect(hostnames).toHaveLength(1);
      expect(hostnames[0].normalizedValue).toBe('workstation-01.corp.example.com');
    });

    it('should extract usernames from alerts', () => {
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            user: { name: 'john.doe' },
          },
        },
      ];

      const result = service.extractEntities(alerts);

      const users = result.entities.filter((e) => e.type === ObservableTypeKey.User);
      expect(users).toHaveLength(1);
      expect(users[0].normalizedValue).toBe('john.doe');
    });

    it('should extract file hashes from alerts', () => {
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            file: {
              hash: {
                sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                md5: 'd41d8cd98f00b204e9800998ecf8427e',
              },
            },
          },
        },
      ];

      const result = service.extractEntities(alerts);

      const sha256 = result.entities.filter((e) => e.type === ObservableTypeKey.FileHashSHA256);
      const md5 = result.entities.filter((e) => e.type === ObservableTypeKey.FileHashMD5);

      expect(sha256).toHaveLength(1);
      expect(md5).toHaveLength(1);
      expect(sha256[0].normalizedValue).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
    });

    it('should deduplicate entities across multiple alerts', () => {
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            source: { ip: '192.168.1.100' },
          },
        },
        {
          _id: 'alert-2',
          _source: {
            source: { ip: '192.168.1.100' }, // Same IP
          },
        },
      ];

      const result = service.extractEntities(alerts);

      const ipv4Entities = result.entities.filter((e) => e.type === ObservableTypeKey.IPv4);
      expect(ipv4Entities).toHaveLength(1);
      expect(ipv4Entities[0].occurrenceCount).toBe(2);
      expect(ipv4Entities[0].alertIds).toContain('alert-1');
      expect(ipv4Entities[0].alertIds).toContain('alert-2');
    });

    it('should filter out common internal IP ranges', () => {
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            source: { ip: '127.0.0.1' }, // Loopback
            destination: { ip: '0.0.0.0' }, // All zeros
          },
        },
      ];

      const result = service.extractEntities(alerts);

      const ipv4Entities = result.entities.filter((e) => e.type === ObservableTypeKey.IPv4);
      expect(ipv4Entities).toHaveLength(0);
    });

    it('should handle nested field paths', () => {
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            process: {
              hash: {
                sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
              },
            },
          },
        },
      ];

      const result = service.extractEntities(alerts);

      const hashes = result.entities.filter((e) => e.type === ObservableTypeKey.FileHashSHA256);
      expect(hashes).toHaveLength(1);
    });

    it('should return entities grouped by type', () => {
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            source: { ip: '192.168.1.100' },
            host: { name: 'workstation-01' },
            user: { name: 'john.doe' },
          },
        },
      ];

      const result = service.extractEntities(alerts);

      expect(result.entitiesByType).toHaveProperty(ObservableTypeKey.IPv4);
      expect(result.entitiesByType).toHaveProperty(ObservableTypeKey.Hostname);
      expect(result.entitiesByType).toHaveProperty(ObservableTypeKey.User);
    });

    it('should handle empty alerts array', () => {
      const result = service.extractEntities([]);

      expect(result.entities).toHaveLength(0);
      // entitiesByType is always populated with all types (with empty arrays)
      expect(result.entitiesByType[ObservableTypeKey.IPv4]).toHaveLength(0);
    });

    it('should handle alerts with missing source fields', () => {
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            unknown: { field: 'value' },
          },
        },
      ];

      const result = service.extractEntities(alerts);

      expect(result.entities).toHaveLength(0);
    });
  });

  describe('withConfig', () => {
    it('should merge custom entity configs with defaults', () => {
      const customConfigs = [
        {
          type: ObservableTypeKey.IPv4,
          sourceFields: ['custom.ip.field'],
        },
      ];

      const customService = EntityExtractionService.withConfig(logger, customConfigs);

      // The custom service should be able to extract from custom fields
      const alerts = [
        {
          _id: 'alert-1',
          _source: {
            custom: { ip: { field: '192.168.1.100' } },
          },
        },
      ];

      const result = customService.extractEntities(alerts);
      const ips = result.entities.filter((e) => e.type === ObservableTypeKey.IPv4);
      expect(ips).toHaveLength(1);
    });
  });
});
