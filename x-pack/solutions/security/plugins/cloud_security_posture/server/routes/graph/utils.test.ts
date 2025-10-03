/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformEntityTypeToIconAndShape } from './utils';

describe('utils', () => {
  describe('transformEntityTypeToIconAndShape', () => {
    it('should return empty object for undefined input', () => {
      expect(transformEntityTypeToIconAndShape(undefined as unknown as string)).toEqual({});
    });

    it('should return empty object for null input', () => {
      expect(transformEntityTypeToIconAndShape(null as unknown as string)).toEqual({});
    });

    // Unknown or non-existent entity types
    it('should return undefined icon and shape for entity types that do not match any mappings', () => {
      ['NonExistentType', 'Unknown', '123456', 'CustomEntityType'].forEach((type) => {
        expect(transformEntityTypeToIconAndShape(type)).toEqual({
          icon: undefined,
          shape: undefined,
        });
      });
    });

    it('should correctly map user-related entity types to the user icon and ellipse shape', () => {
      const userTypes = [
        'User',
        'user',
        'SERVICE ACCOUNT',
        'Identity',
        'Group',
        'Secret',
        'Secret Vault',
        'Access Management',
      ];

      userTypes.forEach((entityType) => {
        expect(transformEntityTypeToIconAndShape(entityType)).toEqual({
          icon: 'user',
          shape: 'ellipse',
        });
      });
    });

    it('should correctly map database-related entity types to the database icon and rectangle shape', () => {
      const databaseTypes = [
        'Database',
        'database',
        'AI Model',
        'STORAGE BUCKET',
        'Volume',
        'Config Map',
        'Managed Certificate',
      ];

      databaseTypes.forEach((entityType) => {
        expect(transformEntityTypeToIconAndShape(entityType)).toEqual({
          icon: 'database',
          shape: 'rectangle',
        });
      });
    });

    it('should correctly map host-related entity types to the host icon and rectangle shape', () => {
      const hostTypes = ['Host', 'Virtual Desktop', 'Virtual Workstation', 'Virtual Machine Image'];

      hostTypes.forEach((entityType) => {
        expect(transformEntityTypeToIconAndShape(entityType)).toEqual({
          icon: 'storage',
          shape: 'hexagon',
        });
      });
    });
  });
});
