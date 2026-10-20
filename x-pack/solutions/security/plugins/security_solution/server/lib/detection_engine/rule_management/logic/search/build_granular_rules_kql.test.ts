/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertRuleSearchTermToKQL } from '../../../../../../common/detection_engine/rule_management/rule_filtering';
import { buildGranularRulesKql } from './build_granular_rules_kql';

describe('buildGranularRulesKql', () => {
  it('returns undefined when filter and search are empty', () => {
    expect(buildGranularRulesKql({ filter: undefined, search: undefined })).toBeUndefined();
    expect(
      buildGranularRulesKql({ filter: { term: '  ', mode: 'KQL' }, search: undefined })
    ).toBeUndefined();
    expect(buildGranularRulesKql({ filter: undefined, search: { term: '' } })).toBeUndefined();
    expect(
      buildGranularRulesKql({ filter: { term: '  ' }, search: { term: '  ' } })
    ).toBeUndefined();
  });

  it('returns only filter when search is absent', () => {
    expect(
      buildGranularRulesKql({
        filter: { term: 'alert.attributes.enabled: true', mode: 'KQL' },
        search: undefined,
      })
    ).toBe('(alert.attributes.enabled: true)');
  });

  it('treats filter.mode as KQL when omitted', () => {
    expect(
      buildGranularRulesKql({
        filter: { term: 'alert.attributes.enabled: true' },
        search: undefined,
      })
    ).toBe('(alert.attributes.enabled: true)');
  });

  it('ANDs filter with legacy search term', () => {
    const kql = buildGranularRulesKql({
      filter: { term: 'alert.attributes.enabled: true', mode: 'KQL' },
      search: { term: 'sql', mode: 'legacy' },
    });
    expect(kql).toBe(`(alert.attributes.enabled: true) AND (${convertRuleSearchTermToKQL('sql')})`);
  });

  it('uses legacy search when mode is omitted', () => {
    const expected = `(${convertRuleSearchTermToKQL('abc')})`;
    expect(
      buildGranularRulesKql({
        filter: undefined,
        search: { term: 'abc' },
      })
    ).toBe(expected);
  });
});
