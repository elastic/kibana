/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeDateMath } from './normalize_date_math';

describe('normalizeDateMath', () => {
  it.each([
    ['now', 'now'],
    ['now-0s', 'now'],
    ['now-0m', 'now'],
    ['now-0h', 'now'],
    ['now+0s', 'now'],
    ['now+0m', 'now'],
    ['now+0h', 'now'],
    ['now-60s', 'now-1m'],
    ['now-120s', 'now-2m'],
    ['now-1200s', 'now-20m'],
    ['now+60s', 'now+1m'],
    ['now+120s', 'now+2m'],
    ['now+1200s', 'now+20m'],
    ['now-60m', 'now-1h'],
    ['now-360m', 'now-6h'],
    ['now-6000m', 'now-100h'],
    ['now+60m', 'now+1h'],
    ['now+360m', 'now+6h'],
    ['now+6000m', 'now+100h'],
    ['now-24h', 'now-1d'],
    ['now-72h', 'now-3d'],
    ['now-240h', 'now-10d'],
    ['now+24h', 'now+1d'],
    ['now+72h', 'now+3d'],
    ['now+240h', 'now+10d'],
  ])('normalizes "%s"', (input, expected) => {
    const result = normalizeDateMath(input);

    expect(result).toBe(expected);
  });

  it.each([
    ['now-30s'],
    ['now-90s'],
    ['now+45s'],
    ['now-59m'],
    ['now+61m'],
    ['now-23h'],
    ['now+25h'],
    [''],
    ['invalid'],
  ])('returns "%s" as is', (input) => {
    const result = normalizeDateMath(input);

    expect(result).toBe(input);
  });
});
