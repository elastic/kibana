/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceAsync } from './debounce_async';

jest.useFakeTimers({ legacyFakeTimers: true });

describe('debounceAsync', () => {
  it('resolves with the underlying invocation result', async () => {
    const fn = jest.fn().mockResolvedValueOnce('first');

    const debounced = debounceAsync(fn, 0);
    const promise = debounced();
    jest.runOnlyPendingTimers();

    expect(await promise).toEqual('first');
  });

  it('resolves intermediate calls when the next invocation resolves', async () => {
    const fn = jest.fn().mockResolvedValueOnce('first');

    const debounced = debounceAsync(fn, 200);
    fn.mockResolvedValueOnce('second');

    const promise = debounced();
    jest.runOnlyPendingTimers();
    expect(await promise).toEqual('first');

    const promises = [debounced(), debounced()];
    jest.runOnlyPendingTimers();

    expect(await Promise.all(promises)).toEqual(['second', 'second']);
  });

  it('debounces the function', async () => {
    const fn = jest.fn().mockResolvedValueOnce('first');

    const debounced = debounceAsync(fn, 200);

    debounced();
    jest.runOnlyPendingTimers();

    debounced();
    debounced();
    jest.runOnlyPendingTimers();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
