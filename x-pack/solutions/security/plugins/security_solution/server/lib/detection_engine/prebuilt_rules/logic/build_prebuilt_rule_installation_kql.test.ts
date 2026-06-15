/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildPrebuiltRuleInstallationKql,
  convertPrebuiltRuleAssetSearchTermToKQL,
} from './build_prebuilt_rule_installation_kql';

describe('convertPrebuiltRuleAssetSearchTermToKQL', () => {
  it('uses substring match on name.keyword for a single token', () => {
    expect(convertPrebuiltRuleAssetSearchTermToKQL('sql')).toBe(
      'security-rule.name.keyword: *sql*'
    );
  });

  it('uses phrase match on name for multiple tokens', () => {
    expect(convertPrebuiltRuleAssetSearchTermToKQL('sql server')).toBe(
      `security-rule.name: "sql server"`
    );
  });
});

describe('buildPrebuiltRuleInstallationKql', () => {
  it('returns undefined when filter and search are empty', () => {
    expect(
      buildPrebuiltRuleInstallationKql({ filter: undefined, search: undefined })
    ).toBeUndefined();
    expect(
      buildPrebuiltRuleInstallationKql({ filter: { term: '  ' }, search: undefined })
    ).toBeUndefined();
    expect(
      buildPrebuiltRuleInstallationKql({ filter: undefined, search: { term: '' } })
    ).toBeUndefined();
    expect(
      buildPrebuiltRuleInstallationKql({ filter: { term: '  ' }, search: { term: '  ' } })
    ).toBeUndefined();
  });

  it('returns only filter when search is absent', () => {
    expect(
      buildPrebuiltRuleInstallationKql({
        filter: { term: 'security-rule.tags: "Elastic"' },
        search: undefined,
      })
    ).toBe('(security-rule.tags: "Elastic")');
  });

  it('ANDs filter with legacy search term', () => {
    const kql = buildPrebuiltRuleInstallationKql({
      filter: { term: 'security-rule.tags: "Elastic"' },
      search: { term: 'sql', mode: 'legacy' },
    });
    expect(kql).toBe(
      `(security-rule.tags: "Elastic") AND (${convertPrebuiltRuleAssetSearchTermToKQL('sql')})`
    );
  });

  it('uses legacy search when mode is omitted', () => {
    expect(
      buildPrebuiltRuleInstallationKql({
        filter: undefined,
        search: { term: 'abc' },
      })
    ).toBe(`(${convertPrebuiltRuleAssetSearchTermToKQL('abc')})`);
  });
});
