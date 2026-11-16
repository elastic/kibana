/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unsearchedPatterns } from './unsearched_patterns';

describe('unsearchedPatterns', () => {
  it('returns names in missing that are absent from index_patterns, once each', () => {
    expect(
      unsearchedPatterns(
        { index_patterns: ['logs-*'], missing: ['custom-1', 'custom-1', 'logs-*', 'winlogbeat-*'] },
        false
      )
    ).toEqual(['custom-1', 'winlogbeat-*']);
  });

  it('returns nothing for a name an exclusion entry covers', () => {
    expect(
      unsearchedPatterns(
        { index_patterns: ['logs-*', '-logs-foo*'], missing: ['logs-foo-1'] },
        false
      )
    ).toEqual([]);
  });

  it('lets an unqualified exclusion cover the name under cross-project search', () => {
    expect(
      unsearchedPatterns(
        { index_patterns: ['logs-*', '-logs-foo*'], missing: ['logs-foo-1'] },
        true
      )
    ).toEqual([]);
  });

  it('returns a .ds- name that no exclusion covers', () => {
    expect(
      unsearchedPatterns(
        { index_patterns: ['logs-*', '-other*'], missing: ['.ds-custom-1-2026.09.30-000001'] },
        false
      )
    ).toEqual(['.ds-custom-1-2026.09.30-000001']);
  });
});
