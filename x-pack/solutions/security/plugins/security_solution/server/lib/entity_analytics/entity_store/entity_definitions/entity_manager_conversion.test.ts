/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToEntityManagerDefinition } from './entity_manager_conversion';
import type { EntityEngineInstallationDescriptor } from '../installation/types';
import { EntityStoreCapability } from '@kbn/entities-schema';

describe('convertToEntityManagerDefinition', () => {
  const baseDescription: EntityEngineInstallationDescriptor = {
    entityType: 'host',
    version: '2.0.0',
    id: 'security-host-default',
    identityField: '_computed_entity_id',
    identityFieldMapping: { type: 'keyword' },
    indexPatterns: ['logs-*', 'metrics-*'],
    fields: [
      {
        source: 'host.name',
        destination: 'host.name',
        retention: { operation: 'collect_values', maxLength: 10 },
        aggregation: { type: 'terms', limit: 10 },
        mapping: { type: 'keyword' },
        allowAPIUpdate: false,
      },
    ],
    settings: {
      timestampField: '@timestamp',
      syncDelay: '60s',
      frequency: '60s',
      timeout: '5m',
      lookbackPeriod: '72h',
      docsPerSecond: undefined,
      maxPageSearchSize: 500,
    },
    pipeline: [],
    indexMappings: {},
    capabilities: [EntityStoreCapability.CRUD_API],
  };

  const options = {
    namespace: 'default',
    filter: '',
  };

  describe('runtime mappings for host entities', () => {
    it('should add runtime mappings for host entity type', () => {
      const hostDescription = { ...baseDescription, entityType: 'host' as const };
      const result = convertToEntityManagerDefinition(hostDescription, options);

      expect(result.runtimeMappings).toBeDefined();
      expect(result.runtimeMappings).toHaveProperty('_computed_entity_id');
      expect(result.runtimeMappings?._computed_entity_id).toHaveProperty('type', 'keyword');
      expect(result.runtimeMappings?._computed_entity_id).toHaveProperty('script');
      expect(result.runtimeMappings?._computed_entity_id.script).toHaveProperty('source');
    });

    it('should include host ranking logic in runtime mapping script', () => {
      const hostDescription = { ...baseDescription, entityType: 'host' as const };
      const result = convertToEntityManagerDefinition(hostDescription, options);

      const script = result.runtimeMappings?._computed_entity_id.script?.source;
      expect(script).toBeDefined();
      expect(script).toContain('host.entity.id');
      expect(script).toContain('host.id');
      expect(script).toContain('host.mac');
      expect(script).toContain('host.name');
      expect(script).toContain('host.hostname');
      expect(script).toContain('host.ip');
    });
  });

  describe('runtime mappings for user entities', () => {
    it('should add runtime mappings for user entity type', () => {
      const userDescription = { ...baseDescription, entityType: 'user' as const };
      const result = convertToEntityManagerDefinition(userDescription, options);

      expect(result.runtimeMappings).toBeDefined();
      expect(result.runtimeMappings).toHaveProperty('_computed_entity_id');
      expect(result.runtimeMappings?._computed_entity_id).toHaveProperty('type', 'keyword');
      expect(result.runtimeMappings?._computed_entity_id).toHaveProperty('script');
      expect(result.runtimeMappings?._computed_entity_id.script).toHaveProperty('source');
    });

    it('should include user ranking logic in runtime mapping script', () => {
      const userDescription = { ...baseDescription, entityType: 'user' as const };
      const result = convertToEntityManagerDefinition(userDescription, options);

      const script = result.runtimeMappings?._computed_entity_id.script?.source;
      expect(script).toBeDefined();
      expect(script).toContain('user.entity.id');
      expect(script).toContain('user.email');
      expect(script).toContain('user.name');
      expect(script).toContain('user.id');
    });

    it('should include host identity fields in user runtime mapping script', () => {
      const userDescription = { ...baseDescription, entityType: 'user' as const };
      const result = convertToEntityManagerDefinition(userDescription, options);

      const script = result.runtimeMappings?._computed_entity_id.script?.source;
      expect(script).toBeDefined();
      expect(script).toContain('host.id');
      expect(script).toContain('host.name');
      expect(script).toContain('host.hostname');
      expect(script).toContain('host.ip');
    });
  });

  describe('runtime mappings for other entity types', () => {
    it('should not add runtime mappings for service entity type', () => {
      const serviceDescription = { ...baseDescription, entityType: 'service' as const };
      const result = convertToEntityManagerDefinition(serviceDescription, options);

      expect(result.runtimeMappings).toBeUndefined();
    });

    it('should not add runtime mappings for generic entity type', () => {
      const genericDescription = { ...baseDescription, entityType: 'generic' as const };
      const result = convertToEntityManagerDefinition(genericDescription, options);

      expect(result.runtimeMappings).toBeUndefined();
    });
  });

  describe('entity definition structure', () => {
    it('should correctly map all required fields', () => {
      const result = convertToEntityManagerDefinition(baseDescription, options);

      expect(result.id).toBe('security-host-default');
      expect(result.type).toBe('host');
      expect(result.indexPatterns).toEqual(['logs-*', 'metrics-*']);
      expect(result.identityFields).toEqual(['_computed_entity_id']);
      expect(result.displayNameTemplate).toBe('{{_computed_entity_id}}');
      expect(result.version).toBe('2.0.0');
      expect(result.managed).toBe(true);
    });

    it('should map metadata fields correctly', () => {
      const result = convertToEntityManagerDefinition(baseDescription, options);

      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveLength(1);
      expect(result.metadata?.[0]).toEqual({
        source: 'host.name',
        destination: 'host.name',
        aggregation: { type: 'terms', limit: 10 },
      });
    });

    it('should include latest settings', () => {
      const result = convertToEntityManagerDefinition(baseDescription, options);

      expect(result.latest).toBeDefined();
      expect(result.latest.timestampField).toBe('@timestamp');
      expect(result.latest.lookbackPeriod).toBe('72h');
      expect(result.latest.settings).toEqual({
        syncField: '@timestamp',
        syncDelay: '60s',
        frequency: '60s',
        timeout: '5m',
        docsPerSecond: undefined,
        maxPageSearchSize: 500,
      });
    });
  });
});
