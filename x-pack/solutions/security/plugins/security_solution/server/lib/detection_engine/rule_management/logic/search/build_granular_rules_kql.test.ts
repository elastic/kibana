/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GranularRulesSearch } from '../../../../../../common/api/detection_engine/rule_management';
import { buildGranularRulesKql } from './build_granular_rules_kql';

describe('buildGranularRulesKql', () => {
  it('returns undefined when filter and search are empty', () => {
    expect(buildGranularRulesKql({ filter: undefined, search: undefined })).toBeUndefined();
    expect(buildGranularRulesKql({ filter: '  ', search: undefined })).toBeUndefined();
    expect(buildGranularRulesKql({ filter: undefined, search: {} })).toBeUndefined();
    expect(buildGranularRulesKql({ filter: '  ', search: { term: '  ' } })).toBeUndefined();
  });

  it('returns only filter when search is absent', () => {
    expect(
      buildGranularRulesKql({
        filter: 'alert.attributes.enabled: true',
        search: undefined,
      })
    ).toBe('(alert.attributes.enabled: true)');
  });

  it('ANDs filter with legacy search term', () => {
    const kql = buildGranularRulesKql({
      filter: 'alert.attributes.enabled: true',
      search: { term: 'sql', mode: 'legacy' },
    });
    expect(kql).toContain('(alert.attributes.enabled: true)');
    expect(kql).toContain(' AND ');
    expect(kql).toContain('alert.attributes.name');
  });

  it('defaults missing mode to legacy when term is set', () => {
    const kql = buildGranularRulesKql({
      filter: undefined,
      search: { term: 'abc' },
    });
    expect(kql).toBeDefined();
    expect(kql).toContain('alert.attributes.name');
  });

  it('omits legacy search when mode is not legacy', () => {
    const nonLegacySearch = {
      term: 'should-not-appear',
      mode: 'vector',
    } as unknown as GranularRulesSearch;
    expect(
      buildGranularRulesKql({
        filter: 'alert.attributes.enabled: true',
        search: nonLegacySearch,
      })
    ).toBe('(alert.attributes.enabled: true)');
  });

  it('returns only legacy search KQL when filter is empty', () => {
    const kql = buildGranularRulesKql({
      filter: undefined,
      search: { term: 'abc', mode: 'legacy' },
    });
    expect(kql).toBeDefined();
    expect(kql).toContain('alert.attributes.name');
    expect(kql).not.toContain(' AND ');
  });
});
