/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildIgnoreMap,
  extractEntityValues,
  fieldToEntityLabel,
  getValuesAtPath,
} from './entity_utils';

describe('entity_utils', () => {
  describe('fieldToEntityLabel', () => {
    it('returns the top-level field segment', () => {
      expect(fieldToEntityLabel('host.name')).toBe('host');
      expect(fieldToEntityLabel('user.name')).toBe('user');
      expect(fieldToEntityLabel('service.name')).toBe('service');
      expect(fieldToEntityLabel('source.ip')).toBe('source');
    });
  });

  describe('getValuesAtPath', () => {
    it('walks objects', () => {
      expect(getValuesAtPath({ a: { b: 'c' } }, ['a', 'b'])).toEqual(['c']);
    });

    it('walks arrays of objects', () => {
      expect(getValuesAtPath({ a: [{ b: 'c1' }, { b: 'c2' }] }, ['a', 'b']).sort()).toEqual([
        'c1',
        'c2',
      ]);
    });

    it('returns empty when path missing', () => {
      expect(getValuesAtPath({ a: { b: 'c' } }, ['a', 'x'])).toEqual([]);
    });
  });

  describe('extractEntityValues', () => {
    it('extracts trimmed strings and removes ignored values', () => {
      const source = {
        user: { name: ' root ' },
        host: { name: ['host-1', '  host-2  '] },
      };

      const ignoreMap = buildIgnoreMap([{ field: 'user.name', values: ['root'] }]);

      expect(Array.from(extractEntityValues(source, 'user.name', ignoreMap))).toEqual([]);
      expect(Array.from(extractEntityValues(source, 'host.name', ignoreMap)).sort()).toEqual([
        'host-1',
        'host-2',
      ]);
    });
  });
});
