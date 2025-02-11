/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeSLI } from './compute_sli';

describe('computeSLI', () => {
  it('returns -1 when no total events', () => {
    expect(computeSLI(100, 0)).toEqual(-1);
  });

  it('returns the sli value', () => {
    expect(computeSLI(100, 1000)).toEqual(0.1);
  });

  it('returns when good is greater than total events', () => {
    expect(computeSLI(9999, 9)).toEqual(1111);
  });

  it('returns rounds the value to 6 digits', () => {
    expect(computeSLI(33, 90)).toEqual(0.366667);
  });

  it('returns the sli value using totalSlicesInRange when provided', () => {
    expect(computeSLI(90, 100, 10_080)).toEqual(0.999008);
  });
});
