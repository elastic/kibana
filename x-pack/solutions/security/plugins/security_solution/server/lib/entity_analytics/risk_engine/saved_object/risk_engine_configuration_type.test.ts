/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsModelVersion,
  SavedObjectModelTransformationContext,
} from '@kbn/core-saved-objects-server';
import type { ObjectType } from '@kbn/config-schema';
import { riskEngineConfigurationType } from './risk_engine_configuration_type';

const getVersion5CreateSchema = (): ObjectType => {
  const version5 = (
    riskEngineConfigurationType.modelVersions as Record<string, SavedObjectsModelVersion>
  )?.['5'];
  const createSchema = version5?.schemas?.create;
  if (!createSchema) {
    throw new Error('version 5 create schema is not defined');
  }
  return createSchema as ObjectType;
};

describe('riskEngineConfigurationType', () => {
  it('should have the correct model versions', () => {
    expect(riskEngineConfigurationType.modelVersions).toHaveProperty('1');
    expect(riskEngineConfigurationType.modelVersions).toHaveProperty('2');
    expect(riskEngineConfigurationType.modelVersions).toHaveProperty('3');
    expect(riskEngineConfigurationType.modelVersions).toHaveProperty('4');
    expect(riskEngineConfigurationType.modelVersions).toHaveProperty('5');
  });

  it('should have filters field in mappings', () => {
    expect(riskEngineConfigurationType.mappings.properties).toHaveProperty('filters');
    expect(riskEngineConfigurationType.mappings.properties.filters).toEqual({
      type: 'nested',
      properties: {
        entity_types: {
          type: 'keyword',
        },
        filter: {
          type: 'text',
        },
      },
    });
  });

  describe('version 4 migration', () => {
    it('should add filters field to existing configurations', () => {
      const version4 = (
        riskEngineConfigurationType.modelVersions as Record<string, SavedObjectsModelVersion>
      )?.['4'];
      expect(version4).toBeDefined();

      const mockDocument = {
        id: 'test-id',
        type: 'risk-engine-configuration',
        attributes: {
          dataViewId: 'test-dataview',
          enabled: true,
          filter: {},
          identifierType: 'host',
          interval: '1h',
          pageSize: 1000,
          range: { start: 'now-30d', end: 'now' },
          _meta: { mappingsVersion: 2 },
        },
        references: [],
        migrationVersion: {},
        coreMigrationVersion: '8.0.0',
        typeMigrationVersion: '8.0.0',
        updated_at: '2023-01-01T00:00:00.000Z',
        version: '1',
        namespaces: ['default'],
        originId: 'test-origin',
      };

      const result =
        version4?.changes[1]?.type === 'data_backfill'
          ? version4.changes[1].backfillFn(
              mockDocument,
              {} as SavedObjectModelTransformationContext
            )
          : null;

      expect(result).toEqual({
        attributes: {
          ...mockDocument.attributes,
          filters: [],
        },
      });
    });

    it('should preserve existing filters if they exist', () => {
      const version4 = (
        riskEngineConfigurationType.modelVersions as Record<string, SavedObjectsModelVersion>
      )?.['4'];
      expect(version4).toBeDefined();

      const existingFilters = [{ entity_types: ['host'], filter: 'agent.type: filebeat' }];

      const mockDocument = {
        id: 'test-id',
        type: 'risk-engine-configuration',
        attributes: {
          dataViewId: 'test-dataview',
          enabled: true,
          filter: {},
          identifierType: 'host',
          interval: '1h',
          pageSize: 1000,
          range: { start: 'now-30d', end: 'now' },
          filters: existingFilters,
          _meta: { mappingsVersion: 2 },
        },
        references: [],
        migrationVersion: {},
        coreMigrationVersion: '8.0.0',
        typeMigrationVersion: '8.0.0',
        updated_at: '2023-01-01T00:00:00.000Z',
        version: '1',
        namespaces: ['default'],
        originId: 'test-origin',
      };

      const result =
        version4?.changes[1]?.type === 'data_backfill'
          ? version4.changes[1].backfillFn(
              mockDocument,
              {} as SavedObjectModelTransformationContext
            )
          : null;

      expect(result).toEqual({
        attributes: {
          ...mockDocument.attributes,
          filters: existingFilters,
        },
      });
    });
  });

  describe('version 5 create schema', () => {
    const baseAttributes = {
      enabled: false,
      filter: {},
      identifierType: 'host',
      interval: '1h',
      pageSize: 1000,
      range: { start: 'now-30d', end: 'now' },
      enableResetToZero: true,
      excludeAlertStatuses: ['closed'],
      filters: [],
      _meta: { mappingsVersion: 8 },
    };

    it('accepts a configuration with a valid dataViewId', () => {
      const createSchema = getVersion5CreateSchema();
      expect(() =>
        createSchema.validate({
          ...baseAttributes,
          dataViewId: '.alerts-security.alerts-default',
        })
      ).not.toThrow();
    });

    it('accepts a configuration without a dataViewId', () => {
      const createSchema = getVersion5CreateSchema();
      expect(() => createSchema.validate({ ...baseAttributes })).not.toThrow();
    });

    it('rejects a dataViewId that could inject ES|QL', () => {
      const createSchema = getVersion5CreateSchema();
      expect(() =>
        createSchema.validate({
          ...baseAttributes,
          dataViewId:
            '.alerts-security.alerts-alpha,.alerts-security.alerts-beta,zz* METADATA _index,/* * */_source',
        })
      ).toThrow('must be a valid index expression');
    });
  });

  describe('version 5 forwardCompatibility schema', () => {
    const getVersion5ForwardCompatibilitySchema = (): ObjectType => {
      const version5 = (
        riskEngineConfigurationType.modelVersions as Record<string, SavedObjectsModelVersion>
      )?.['5'];
      const forwardCompatibility = version5?.schemas?.forwardCompatibility;
      if (!forwardCompatibility) {
        throw new Error('version 5 forwardCompatibility schema is not defined');
      }
      return forwardCompatibility as ObjectType;
    };

    // Reading a configuration stored before this version (possibly with an invalid
    // dataViewId) must not throw — the ES|QL source-index validation rejects it at query time.
    it('does not reject an already-stored dataViewId that could inject ES|QL', () => {
      const forwardCompatibility = getVersion5ForwardCompatibilitySchema();
      expect(() =>
        forwardCompatibility.validate({
          enabled: false,
          filter: {},
          interval: '1h',
          pageSize: 1000,
          range: { start: 'now-30d', end: 'now' },
          _meta: { mappingsVersion: 8 },
          dataViewId:
            '.alerts-security.alerts-alpha,.alerts-security.alerts-beta,zz* METADATA _index,/* * */_source',
        })
      ).not.toThrow();
    });
  });
});
