/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFirstScalar } from './get_first_scalar';

describe('getFirstScalar', () => {
  it('returns a single value as it is, including falsy ones', () => {
    expect(getFirstScalar('web-001')).toBe('web-001');
    expect(getFirstScalar(0)).toBe(0);
    expect(getFirstScalar(false)).toBe(false);
  });

  it('returns the first value of a multi-value cell', () => {
    expect(getFirstScalar(['10.0.0.1', 'fe80::1'])).toBe('10.0.0.1');
  });

  it('returns null for a missing, null or empty cell', () => {
    expect(getFirstScalar(undefined)).toBeNull();
    expect(getFirstScalar(null)).toBeNull();
    expect(getFirstScalar([])).toBeNull();
    expect(getFirstScalar([null, 'second'])).toBeNull();
  });
});
