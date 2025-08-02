/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformEntityTypeToIcon } from './utils';

describe('utils', () => {
  describe('transformEntityTypeToIcon', () => {
    it('should return undefined for undefined input', () => {
      expect(transformEntityTypeToIcon(undefined)).toBeUndefined();
    });

    it('should return undefined for null input', () => {
      // @ts-ignore: testing runtime behavior with null
      expect(transformEntityTypeToIcon(null)).toBeUndefined();
    });

    it('should return undefined for empty string input', () => {
      expect(transformEntityTypeToIcon('')).toBeUndefined();
    });

    // Unknown or non-existent entity types
    it('should return undefined for entity types that do not match any mappings', () => {
      expect(transformEntityTypeToIcon('NonExistentType')).toBeUndefined();
      expect(transformEntityTypeToIcon('Unknown')).toBeUndefined();
      expect(transformEntityTypeToIcon('123456')).toBeUndefined();
      expect(transformEntityTypeToIcon('CustomEntityType')).toBeUndefined();
    });

    it('should correctly map user-related entity types to the user icon', () => {
      expect(transformEntityTypeToIcon('User')).toBe('user');
      expect(transformEntityTypeToIcon('user')).toBe('user');
      expect(transformEntityTypeToIcon('SERVICE ACCOUNT')).toBe('user');
      expect(transformEntityTypeToIcon('Identity')).toBe('user');
      expect(transformEntityTypeToIcon('Group')).toBe('user');
      expect(transformEntityTypeToIcon('Secret')).toBe('user');
      expect(transformEntityTypeToIcon('Secret Vault')).toBe('user');
      expect(transformEntityTypeToIcon('Access Management')).toBe('user');
    });

    it('should correctly map database-related entity types to the database icon', () => {
      expect(transformEntityTypeToIcon('Database')).toBe('database');
      expect(transformEntityTypeToIcon('database')).toBe('database');
      expect(transformEntityTypeToIcon('AI Model')).toBe('database');
      expect(transformEntityTypeToIcon('STORAGE BUCKET')).toBe('database');
      expect(transformEntityTypeToIcon('Volume')).toBe('database');
      expect(transformEntityTypeToIcon('Config Map')).toBe('database');
      expect(transformEntityTypeToIcon('Managed Certificate')).toBe('database');
    });
  });
});
