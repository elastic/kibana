/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PAGE_PATH_CASES } from './page_path_cases';
import { toPagePath, validateSessionsConcurrency, validateSessionsFrequency } from './sessions';

describe('toPagePath', () => {
  it.each(PAGE_PATH_CASES)('labels %p as %p', (raw, page) => {
    expect(toPagePath(raw)).toBe(page);
  });
});

describe('validateSessionsFrequency', () => {
  it.each(['1s', '30s', '1m', '90s', '15m', '1h', '3600s'])('accepts %s', (frequency) => {
    expect(validateSessionsFrequency(frequency)).toBeUndefined();
  });

  it.each(['0m', '2h', '61m', '1d', '5 m', 'fast', ''])('rejects %p', (frequency) => {
    expect(validateSessionsFrequency(frequency)).toEqual(expect.any(String));
  });
});

describe('validateSessionsConcurrency', () => {
  it.each([1, 2, 8])('accepts %s', (concurrency) => {
    expect(validateSessionsConcurrency(concurrency)).toBeUndefined();
  });

  it.each([0, 9, 1.5, NaN])('rejects %s', (concurrency) => {
    expect(validateSessionsConcurrency(concurrency)).toEqual(expect.any(String));
  });
});
