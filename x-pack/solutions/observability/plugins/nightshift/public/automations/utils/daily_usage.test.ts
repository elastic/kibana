/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_DAILY_LIMIT, getDailyUsageTone, suggestRaisedLimit } from './daily_usage';

describe('getDailyUsageTone', () => {
  it('is healthy below the high usage ratio', () => {
    expect(getDailyUsageTone(0, 100)).toBe('healthy');
    expect(getDailyUsageTone(70, 100)).toBe('healthy');
  });

  it('is high from the usage ratio up to the limit', () => {
    expect(getDailyUsageTone(71, 100)).toBe('high');
    expect(getDailyUsageTone(99, 100)).toBe('high');
  });

  it('is exceeded once usage reaches or passes the limit', () => {
    expect(getDailyUsageTone(100, 100)).toBe('exceeded');
    expect(getDailyUsageTone(120, 100)).toBe('exceeded');
  });
});

describe('suggestRaisedLimit', () => {
  it('raises the limit by half, rounded up to the next step of 5', () => {
    expect(suggestRaisedLimit(10, 10)).toBe(15);
    expect(suggestRaisedLimit(20, 20)).toBe(30);
    expect(suggestRaisedLimit(21, 21)).toBe(35);
  });

  it('sizes the suggestion from usage when it is above the limit', () => {
    expect(suggestRaisedLimit(27, 20)).toBe(45);
  });

  it('always suggests at least one more than the current limit', () => {
    expect(suggestRaisedLimit(0, 1)).toBe(5);
    expect(suggestRaisedLimit(3, 5)).toBeGreaterThan(5);
  });

  it('never suggests more than the maximum daily limit', () => {
    expect(suggestRaisedLimit(40, 40)).toBe(MAX_DAILY_LIMIT);
    expect(suggestRaisedLimit(200, 20)).toBe(MAX_DAILY_LIMIT);
  });
});
