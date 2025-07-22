/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mapEntityDataToNodeProps,
  transformEntityTypeToIcon,
} from './entity_data_to_node_props.mapper';

// Mock entityTypeMappings
jest.mock('./entity_type_constants', () => ({
  entityTypeMappings: [
    { icon: 'user', values: ['user', 'person'] },
    { icon: 'server', values: ['server', 'host'] },
    { icon: 'globe', values: ['ip', 'address'] },
  ],
}));

describe('mapEntityDataToNodeProps', () => {
  describe('mapEntityDataToNodeProps', () => {
    it('should map entity data to node props using direct mapping', () => {
      const entityData = {
        name: 'Test Entity',
        type: 'user',
      };

      const result = mapEntityDataToNodeProps({
        entityData,
        nodeFieldsMapping: {
          name: {
            targetField: 'label',
          },
        },
      });

      expect(result).toEqual({ label: 'Test Entity' });
    });

    it('should map entity data to node props using transform function', () => {
      const entityData = {
        name: 'Test Entity',
        type: 'user',
      };

      const result = mapEntityDataToNodeProps({
        entityData,
        nodeFieldsMapping: {
          type: {
            targetField: 'icon',
            transform: transformEntityTypeToIcon,
          },
        },
      });

      expect(result).toEqual({ icon: 'user' });
    });

    it('should handle undefined entity data', () => {
      const result = mapEntityDataToNodeProps({
        entityData: undefined as any,
        nodeFieldsMapping: {
          name: {
            targetField: 'label',
          },
        },
      });

      expect(result).toEqual({});
    });

    it('should handle undefined field values', () => {
      const entityData = {
        name: undefined,
        type: 'user',
      };

      const result = mapEntityDataToNodeProps({
        entityData,
        nodeFieldsMapping: {
          name: {
            targetField: 'label',
          },
          type: {
            targetField: 'icon',
            transform: transformEntityTypeToIcon,
          },
        },
      });

      expect(result).toEqual({ icon: 'user' });
    });

    it('should apply multiple mappings', () => {
      const entityData = {
        name: 'Test Entity',
        type: 'user',
      };

      const result = mapEntityDataToNodeProps({
        entityData,
        nodeFieldsMapping: {
          name: {
            targetField: 'label',
          },
          type: {
            targetField: 'icon',
            transform: transformEntityTypeToIcon,
          },
        },
      });

      expect(result).toEqual({ label: 'Test Entity', icon: 'user' });
    });
  });

  describe('transformEntityTypeToIcon', () => {
    it('should transform known entity types to icons', () => {
      expect(transformEntityTypeToIcon('user')).toBe('user');
      expect(transformEntityTypeToIcon('PERSON')).toBe('user'); // case insensitive
      expect(transformEntityTypeToIcon('server')).toBe('server');
      expect(transformEntityTypeToIcon('ip')).toBe('globe');
    });

    it('should return undefined for unknown entity types', () => {
      expect(transformEntityTypeToIcon('unknown')).toBeUndefined();
    });

    it('should handle undefined entity type', () => {
      expect(transformEntityTypeToIcon(undefined)).toBeUndefined();
    });
  });
});
