/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ratio, toLastSeen } from './aggregations';

describe('toLastSeen', () => {
  it('returns the latest timestamp as ISO, ignoring missing ones', () => {
    const earlier = Date.parse('2021-01-18T12:10:00Z');
    const later = Date.parse('2021-01-18T12:30:00Z');

    expect(toLastSeen(earlier, null, later)).toBe('2021-01-18T12:30:00.000Z');
  });

  it('is null without timestamps', () => {
    expect(toLastSeen(null, undefined)).toBeNull();
  });
});

describe('ratio', () => {
  it('divides, null without a denominator', () => {
    expect(ratio(3, 4)).toBe(0.75);
    expect(ratio(3, 0)).toBeNull();
  });
});
