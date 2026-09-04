/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRumEsTimeout, withRumEsRetry } from './es_retry';

describe('isRumEsTimeout', () => {
  it('matches Elasticsearch transport timeouts', () => {
    expect(
      isRumEsTimeout(Object.assign(new Error('Request timed out'), { name: 'TimeoutError' }))
    ).toBe(true);
    expect(isRumEsTimeout(new Error('Request timed out'))).toBe(true);
    expect(isRumEsTimeout(new Error('index_not_found_exception'))).toBe(false);
  });
});

describe('withRumEsRetry', () => {
  it('retries once after a timeout and then succeeds', async () => {
    let attempts = 0;
    const result = await withRumEsRetry(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw Object.assign(new Error('Request timed out'), { name: 'TimeoutError' });
      }
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('does not retry non-timeout errors', async () => {
    let attempts = 0;
    await expect(
      withRumEsRetry(async () => {
        attempts += 1;
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(attempts).toBe(1);
  });
});
