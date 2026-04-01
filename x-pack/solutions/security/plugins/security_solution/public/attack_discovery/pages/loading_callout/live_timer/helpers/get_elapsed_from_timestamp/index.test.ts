/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getElapsedFromTimestamp } from '.';

describe('getElapsedFromTimestamp', () => {
  let nowMs = 0;

  beforeEach(() => {
    nowMs = 0;

    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 0 when startedAt is undefined', () => {
    const result = getElapsedFromTimestamp(undefined);

    expect(result).toBe(0);
  });

  it('returns 0 when startedAt is an empty string', () => {
    const result = getElapsedFromTimestamp('');

    expect(result).toBe(0);
  });

  it('returns 0 when startedAt is an invalid date string', () => {
    nowMs = 5000;

    const result = getElapsedFromTimestamp('invalid-date');

    expect(result).toBe(0);
  });

  it('returns the elapsed milliseconds from a valid timestamp', () => {
    nowMs = 5000;
    const startedAt = new Date(2000).toISOString();

    const result = getElapsedFromTimestamp(startedAt);

    expect(result).toBe(3000);
  });

  it('returns 0 when the timestamp is in the future (clock skew)', () => {
    nowMs = 5000;
    const futureStartedAt = new Date(10000).toISOString();

    const result = getElapsedFromTimestamp(futureStartedAt);

    expect(result).toBe(0);
  });

  it('returns 0 when the timestamp equals Date.now()', () => {
    nowMs = 5000;
    const startedAt = new Date(5000).toISOString();

    const result = getElapsedFromTimestamp(startedAt);

    expect(result).toBe(0);
  });
});
