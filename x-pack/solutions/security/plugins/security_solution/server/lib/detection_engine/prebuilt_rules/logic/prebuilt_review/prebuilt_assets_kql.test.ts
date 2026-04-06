/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildPrebuiltAssetsCombinedKql,
  expandPrebuiltAssetsKqlFieldAliases,
  prebuiltAssetsKqlToEsQuery,
  validatePrebuiltAssetsKqlFilter,
} from './prebuilt_assets_kql';

describe('prebuilt_assets_kql', () => {
  describe('expandPrebuiltAssetsKqlFieldAliases', () => {
    it('maps friendly names to security-rule attribute paths', () => {
      expect(expandPrebuiltAssetsKqlFieldAliases('name: "x"')).toBe(
        'security-rule.name.keyword: "x"'
      );
      expect(expandPrebuiltAssetsKqlFieldAliases('tags: abc')).toBe('security-rule.tags: abc');
      expect(expandPrebuiltAssetsKqlFieldAliases('rule_id: sig')).toBe(
        'security-rule.rule_id: sig'
      );
    });
  });

  describe('validatePrebuiltAssetsKqlFilter', () => {
    it('accepts empty filter', () => {
      expect(validatePrebuiltAssetsKqlFilter(undefined)).toEqual([]);
      expect(validatePrebuiltAssetsKqlFilter('   ')).toEqual([]);
    });

    it('rejects unknown fields after expansion', () => {
      expect(validatePrebuiltAssetsKqlFilter('foo: bar').length).toBeGreaterThan(0);
    });

    it('accepts valid KQL with aliases', () => {
      expect(validatePrebuiltAssetsKqlFilter('name: *sql* and severity: high')).toEqual([]);
    });
  });

  describe('buildPrebuiltAssetsCombinedKql', () => {
    it('ANDs filter and legacy search', () => {
      const kql = buildPrebuiltAssetsCombinedKql({
        filter: 'tags: AWS',
        searchTerm: 'foo',
        searchMode: 'legacy',
      });
      expect(kql).toContain('AND');
      expect(kql).toContain('security-rule.tags: AWS');
    });
  });

  describe('prebuiltAssetsKqlToEsQuery', () => {
    it('produces an ES query container', () => {
      const q = prebuiltAssetsKqlToEsQuery('security-rule.severity: high');
      expect(q).toBeDefined();
      expect(typeof q).toBe('object');
    });
  });
});
