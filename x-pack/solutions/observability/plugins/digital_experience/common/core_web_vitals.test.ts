/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getVitalRating } from './core_web_vitals';

describe('getVitalRating', () => {
  it.each([
    ['lcp', 2500, 'good'],
    ['lcp', 2500.5, 'needsImprovement'],
    ['lcp', 4000, 'needsImprovement'],
    ['lcp', 4000.1, 'poor'],
    ['inp', 200, 'good'],
    ['inp', 500, 'needsImprovement'],
    ['inp', 501, 'poor'],
    ['cls', 0.1, 'good'],
    // 0.1 read back from a float field
    ['cls', 0.10000000149011612, 'good'],
    ['cls', 0.1000001, 'needsImprovement'],
    ['cls', 0.25, 'needsImprovement'],
    ['cls', 0.26, 'poor'],
    ['fcp', 1800, 'good'],
    ['fcp', 3000.5, 'poor'],
    ['ttfb', 800, 'good'],
    ['ttfb', 1800, 'needsImprovement'],
  ] as const)('rates %s of %s as %s', (vital, value, rating) => {
    expect(getVitalRating(vital, value)).toBe(rating);
  });
});
