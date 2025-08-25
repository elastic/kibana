/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { retry } from './api';

describe('retry', () => {
  it('returns immediately when the function resolves on first try', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await retry(fn, 3, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries once on failure and then resolves', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok');

    const result = await retry(fn, 2, 1, 1.0);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries', async () => {
    const error = new Error('always fails');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(retry(fn, 3, 1)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
