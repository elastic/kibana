/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLibraryIdsEsFilter,
  buildLibraryIdsKueryFilter,
  getPrebuiltRuleAssetSoId,
} from './utils';

describe('buildLibraryIdsEsFilter', () => {
  it('returns no filter without libraries', () => {
    expect(buildLibraryIdsEsFilter()).toBeUndefined();
    expect(buildLibraryIdsEsFilter([])).toBeUndefined();
  });

  it('matches only objects that carry one of the library ids', () => {
    expect(buildLibraryIdsEsFilter(['elastic', 'elastic-community'])).toEqual({
      terms: { 'security-rule.library_id': ['elastic', 'elastic-community'] },
    });
  });
});

describe('buildLibraryIdsKueryFilter', () => {
  it('returns no filter without libraries', () => {
    expect(buildLibraryIdsKueryFilter()).toBeUndefined();
    expect(buildLibraryIdsKueryFilter([])).toBeUndefined();
  });

  it('matches only objects that carry the library id', () => {
    expect(buildLibraryIdsKueryFilter(['elastic'])).toBe(
      'security-rule.attributes.library_id: "elastic"'
    );
  });

  it('joins several libraries with OR', () => {
    expect(buildLibraryIdsKueryFilter(['elastic', 'elastic-community'])).toBe(
      '(security-rule.attributes.library_id: "elastic" OR security-rule.attributes.library_id: "elastic-community")'
    );
  });
});

describe('getPrebuiltRuleAssetSoId', () => {
  it('builds a two-part id without a library', () => {
    expect(getPrebuiltRuleAssetSoId('rule-1', 3)).toBe('security-rule:rule-1_3');
  });

  it('builds a three-part id with a library', () => {
    expect(getPrebuiltRuleAssetSoId('rule-1', 3, 'elastic')).toBe('security-rule:elastic_rule-1_3');
  });
});
