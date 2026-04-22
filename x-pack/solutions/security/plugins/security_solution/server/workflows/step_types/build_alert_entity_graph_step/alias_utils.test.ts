/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { symmetrizeAliases, expandEntitiesByAliases } from './alias_utils';
import type { AliasMap } from './alias_utils';

describe('alias_utils', () => {
  describe('symmetrizeAliases', () => {
    it('returns empty map for undefined input', () => {
      expect(symmetrizeAliases(undefined)).toEqual(new Map());
    });

    it('returns empty map for empty object', () => {
      expect(symmetrizeAliases({})).toEqual(new Map());
    });

    it('creates forward mapping from raw config', () => {
      const result = symmetrizeAliases({
        'source.ip': [{ field: 'destination.ip' }],
      });

      expect(result.get('source.ip')).toEqual([{ field: 'destination.ip' }]);
    });

    it('creates reverse mapping automatically', () => {
      const result = symmetrizeAliases({
        'source.ip': [{ field: 'destination.ip', score: 3 }],
      });

      expect(result.get('destination.ip')).toEqual([{ field: 'source.ip', score: 3 }]);
    });

    it('does not create self-referencing aliases', () => {
      const result = symmetrizeAliases({
        'host.name': [{ field: 'host.name' }],
      });

      expect(result.size).toBe(0);
    });

    it('filters out invalid alias entries', () => {
      const result = symmetrizeAliases({
        'source.ip': [
          { field: '' },
          { field: 'destination.ip' },
          null as unknown as { field: string },
        ],
      });

      expect(result.get('source.ip')).toEqual([{ field: 'destination.ip' }]);
    });

    it('preserves scores on alias entries', () => {
      const result = symmetrizeAliases({
        'source.ip': [{ field: 'destination.ip', score: 5 }],
      });

      expect(result.get('source.ip')?.[0]?.score).toBe(5);
    });

    it('does not duplicate reverse mappings when already present', () => {
      const result = symmetrizeAliases({
        'source.ip': [{ field: 'destination.ip' }],
        'destination.ip': [{ field: 'source.ip' }],
      });

      const sourceAliases = result.get('source.ip') ?? [];
      const destRefs = sourceAliases.filter((a) => a.field === 'destination.ip');
      expect(destRefs).toHaveLength(1);
    });
  });

  describe('expandEntitiesByAliases', () => {
    it('returns original values when no aliases exist', () => {
      const aliasMap: AliasMap = new Map();
      const entities = new Map([['host.name', new Set(['h1'])]]);

      const result = expandEntitiesByAliases(entities, aliasMap);

      expect(result.get('host.name')).toEqual(new Set(['h1']));
      expect(result.size).toBe(1);
    });

    it('copies values to alias fields', () => {
      const aliasMap: AliasMap = new Map([['source.ip', [{ field: 'destination.ip' }]]]);
      const entities = new Map([['source.ip', new Set(['10.0.0.1'])]]);

      const result = expandEntitiesByAliases(entities, aliasMap);

      expect(result.get('source.ip')).toEqual(new Set(['10.0.0.1']));
      expect(result.get('destination.ip')).toEqual(new Set(['10.0.0.1']));
    });

    it('merges values when alias field already has values', () => {
      const aliasMap: AliasMap = new Map([['source.ip', [{ field: 'destination.ip' }]]]);
      const entities = new Map([
        ['source.ip', new Set(['10.0.0.1'])],
        ['destination.ip', new Set(['10.0.0.2'])],
      ]);

      const result = expandEntitiesByAliases(entities, aliasMap);

      expect(result.get('destination.ip')).toEqual(new Set(['10.0.0.2', '10.0.0.1']));
    });

    it('skips empty value sets', () => {
      const aliasMap: AliasMap = new Map([['source.ip', [{ field: 'destination.ip' }]]]);
      const entities = new Map([['source.ip', new Set<string>()]]);

      const result = expandEntitiesByAliases(entities, aliasMap);

      expect(result.size).toBe(0);
    });
  });
});
