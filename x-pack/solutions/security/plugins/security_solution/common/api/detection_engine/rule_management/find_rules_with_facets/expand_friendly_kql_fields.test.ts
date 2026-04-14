/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expandFriendlyKqlFields } from './expand_friendly_kql_fields';

describe('expandFriendlyKqlFields', () => {
  it('expands friendly names in one filter', () => {
    expect(expandFriendlyKqlFields('enabled: true AND tags: "prod"')).toBe(
      'alert.attributes.enabled: true AND alert.attributes.tags: "prod"'
    );
  });

  it('leaves already-expanded paths untouched', () => {
    const filter = 'alert.attributes.name: "foo"';
    expect(expandFriendlyKqlFields(filter)).toBe(filter);
  });

  it('does not replace friendly names inside quoted values', () => {
    expect(expandFriendlyKqlFields('name: "enabled"')).toBe('alert.attributes.name: "enabled"');
  });

  it('handles NOT prefix', () => {
    expect(expandFriendlyKqlFields('NOT enabled: false')).toBe(
      'NOT alert.attributes.enabled: false'
    );
  });

  it('passes through unknown field names unchanged', () => {
    const filter = 'unknownField: "value"';
    expect(expandFriendlyKqlFields(filter)).toBe(filter);
  });

  it('handles parentheses', () => {
    expect(expandFriendlyKqlFields('(enabled: true AND (tags: "a" OR tags: "b"))')).toBe(
      '(alert.attributes.enabled: true AND (alert.attributes.tags: "a" OR alert.attributes.tags: "b"))'
    );
  });

  it('returns an empty string unchanged', () => {
    expect(expandFriendlyKqlFields('')).toBe('');
  });
});
