/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectFixtures } from './fixture_selection';

describe('selectFixtures', () => {
  const fixtures = ['a', 'b', 'c', 'd'];

  it('returns every fixture when EVAL_EXAMPLES is unset or blank', () => {
    expect(selectFixtures(fixtures, undefined)).toEqual(fixtures);
    expect(selectFixtures(fixtures, ' ')).toEqual(fixtures);
  });

  it('caps the run to the first n fixtures', () => {
    expect(selectFixtures(fixtures, '2')).toEqual(['a', 'b']);
  });

  it('returns everything when n exceeds the fixture count', () => {
    expect(selectFixtures(fixtures, '99')).toEqual(fixtures);
  });

  it('rejects values that would silently fall back to the full suite', () => {
    for (const bad of ['0', '-1', '1.5', 'abc']) {
      expect(() => selectFixtures(fixtures, bad)).toThrow(/EVAL_EXAMPLES/);
    }
  });
});
