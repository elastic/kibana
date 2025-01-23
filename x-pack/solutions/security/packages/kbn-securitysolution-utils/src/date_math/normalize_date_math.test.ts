/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeDateMath } from './normalize_date_math';

describe('normalizeDateMath', () => {
  it.each([
    ['now-60s', 'now-1m'],
    ['now-60m', 'now-1h'],
    ['now-24h', 'now-1d'],
    ['now+60s', 'now+1m'],
    ['now+60m', 'now+1h'],
    ['now+24h', 'now+1d'],
  ])('normalizes %s', (sourceDateMath, normalizedDateMath) => {
    const result = normalizeDateMath(sourceDateMath);

    expect(result).toBe(normalizedDateMath);
  });

  it.each([['now'], ['now-invalid'], ['invalid']])('returns %s non-normalized', (dateMath) => {
    const result = normalizeDateMath(dateMath);

    expect(result).toBe(dateMath);
  });
});
