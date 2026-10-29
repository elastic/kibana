/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestTimeoutMs } from './test_timeout';

const MINUTE_MS = 60_000;

describe('getTestTimeoutMs', () => {
  it.each([undefined, '', 'abc', '0', '1', '2', '3'])(
    'keeps the 60 minute floor for EVAL_REPETITIONS=%p',
    (repetitions) => {
      expect(getTestTimeoutMs(repetitions)).toBe(60 * MINUTE_MS);
    }
  );

  it('allows 100 minutes at 5 repetitions', () => {
    expect(getTestTimeoutMs('5')).toBe(100 * MINUTE_MS);
  });

  it('keeps scaling past 5 repetitions', () => {
    expect(getTestTimeoutMs('10')).toBe(200 * MINUTE_MS);
  });
});
