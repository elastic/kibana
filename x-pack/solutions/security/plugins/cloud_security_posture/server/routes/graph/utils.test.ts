/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformEntityTypeToIconAndShape } from './utils';
import type { EntityDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/v1';

describe('utils', () => {
  describe('transformEntityTypeToIconAndShape', () => {
    it('should return empty object for undefined input', () => {
      const undefinedEntity = undefined as unknown as EntityDocumentDataModel;
      expect(transformEntityTypeToIconAndShape(undefinedEntity)).toEqual({});
    });

    it('should return empty object for null input', () => {
      // @ts-ignore: testing runtime behavior with null
      expect(transformEntityTypeToIconAndShape(null)).toEqual({});
    });

    it('should return empty object for entity without type', () => {
      const entity = { id: '123' } as EntityDocumentDataModel;
      expect(transformEntityTypeToIconAndShape(entity)).toEqual({});
    });

    // Unknown or non-existent entity types
    it('should return undefined icon and shape for entity types that do not match any mappings', () => {
      const nonExistentType = { type: 'NonExistentType' } as EntityDocumentDataModel;
      const unknownType = { type: 'Unknown' } as EntityDocumentDataModel;
      const numericType = { type: '123456' } as EntityDocumentDataModel;
      const customType = { type: 'CustomEntityType' } as EntityDocumentDataModel;

      expect(transformEntityTypeToIconAndShape(nonExistentType)).toEqual({
        icon: undefined,
        shape: undefined,
      });
      expect(transformEntityTypeToIconAndShape(unknownType)).toEqual({
        icon: undefined,
        shape: undefined,
      });
      expect(transformEntityTypeToIconAndShape(numericType)).toEqual({
        icon: undefined,
        shape: undefined,
      });
      expect(transformEntityTypeToIconAndShape(customType)).toEqual({
        icon: undefined,
        shape: undefined,
      });
    });

    it('should correctly map user-related entity types to the user icon and ellipse shape', () => {
      const userTypes = [
        { type: 'User' },
        { type: 'user' },
        { type: 'SERVICE ACCOUNT' },
        { type: 'Identity' },
        { type: 'Group' },
        { type: 'Secret' },
        { type: 'Secret Vault' },
        { type: 'Access Management' },
      ] as EntityDocumentDataModel[];

      userTypes.forEach((entity) => {
        expect(transformEntityTypeToIconAndShape(entity)).toEqual({
          icon: 'user',
          shape: 'ellipse',
        });
      });
    });

    it('should correctly map database-related entity types to the database icon and rectangle shape', () => {
      const databaseTypes = [
        { type: 'Database' },
        { type: 'database' },
        { type: 'AI Model' },
        { type: 'STORAGE BUCKET' },
        { type: 'Volume' },
        { type: 'Config Map' },
        { type: 'Managed Certificate' },
      ] as EntityDocumentDataModel[];

      databaseTypes.forEach((entity) => {
        expect(transformEntityTypeToIconAndShape(entity)).toEqual({
          icon: 'database',
          shape: 'rectangle',
        });
      });
    });

    it('should correctly map host-related entity types to the host icon and rectangle shape', () => {
      const hostTypes = [
        { type: 'Host' },
        { type: 'Virtual Desktop' },
        { type: 'Virtual Workstation' },
        { type: 'Virtual Machine Image' },
      ] as EntityDocumentDataModel[];

      hostTypes.forEach((entity) => {
        expect(transformEntityTypeToIconAndShape(entity)).toEqual({
          icon: 'storage',
          shape: 'hexagon',
        });
      });
    });
  });
});
