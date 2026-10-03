/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withTimeout } from './with_timeout';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the value of a promise that settles in time', async () => {
    await expect(withTimeout(Promise.resolve('value'), 1000)).resolves.toBe('value');
  });

  it('rejects with the error of a promise that rejects in time', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom');
  });

  it('rejects once the timeout elapses first', async () => {
    const pending = withTimeout(new Promise<never>(() => {}), 1000);
    jest.advanceTimersByTime(1000);

    await expect(pending).rejects.toThrow('Timed out after 1000ms');
  });

  it('clears its timer when the promise settles first', async () => {
    await withTimeout(Promise.resolve('value'), 1000);

    expect(jest.getTimerCount()).toBe(0);
  });
});
