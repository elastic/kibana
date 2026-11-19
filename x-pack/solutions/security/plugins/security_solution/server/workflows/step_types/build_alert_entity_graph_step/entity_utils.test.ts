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

    it('reads a large multivalued flat field without exceeding the engine argument limit', () => {
      const values = Array.from({ length: 500_000 }, (_, index) => `host-${index}`);

      expect(getValuesAtPath({ 'host.name': values }, ['host', 'name'])).toHaveLength(500_000);
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

    it('reads a flat dotted key', () => {
      expect(getValuesAtPath({ 'a.b': 'c' }, ['a', 'b'])).toEqual(['c']);
    });

    it('reads a flat key that holds an array', () => {
      expect(getValuesAtPath({ 'a.b': ['c1', 'c2'] }, ['a', 'b'])).toEqual(['c1', 'c2']);
    });

    it('reads a mixed shape where only part of the path is flattened', () => {
      expect(getValuesAtPath({ 'a.b': { c: 'd' } }, ['a', 'b', 'c'])).toEqual(['d']);
      expect(getValuesAtPath({ a: { 'b.c': 'd' } }, ['a', 'b', 'c'])).toEqual(['d']);
    });

    it('does not read inherited keys', () => {
      expect(getValuesAtPath({}, ['constructor'])).toEqual([]);
    });
  });

  describe('extractEntityValues', () => {
    it('gives the same values for a flat and a nested _source', () => {
      const nested = {
        host: { id: 'h-1', name: 'srv' },
        user: { name: 'alice' },
        aws: { cloudtrail: { user_identity: { arn: 'arn:1' } } },
      };
      const flat = {
        'host.id': 'h-1',
        'host.name': 'srv',
        'user.name': 'alice',
        'aws.cloudtrail.user_identity.arn': 'arn:1',
      };
      const ignoreMap = buildIgnoreMap([]);

      for (const field of [
        'host.id',
        'host.name',
        'user.name',
        'aws.cloudtrail.user_identity.arn',
      ]) {
        const fromNested = Array.from(extractEntityValues(nested, field, ignoreMap));
        expect(fromNested).toHaveLength(1);
        expect(Array.from(extractEntityValues(flat, field, ignoreMap))).toEqual(fromNested);
      }
    });

    it('applies the ignore list to a flat _source', () => {
      const ignoreMap = buildIgnoreMap([{ field: 'user.name', values: ['root'] }]);
      expect(
        Array.from(extractEntityValues({ 'user.name': 'root' }, 'user.name', ignoreMap))
      ).toEqual([]);
    });

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
