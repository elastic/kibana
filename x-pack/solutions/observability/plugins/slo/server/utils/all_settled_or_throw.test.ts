/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allSettledOrThrow } from './all_settled_or_throw';

const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('allSettledOrThrow', () => {
  it('resolves when all promises fulfil', async () => {
    await expect(
      allSettledOrThrow([Promise.resolve('a'), Promise.resolve(1), Promise.resolve()])
    ).resolves.toBeUndefined();
  });

  it('waits for pending promises to settle before rejecting with the original reason', async () => {
    const error = new Error('install failed');
    const pending = Promise.withResolvers<string>();

    let hasRejected = false;
    const result = allSettledOrThrow([Promise.reject(error), pending.promise]);
    result.catch(() => {
      hasRejected = true;
    });

    await flushPromises();
    expect(hasRejected).toBe(false);

    pending.resolve('done');

    await expect(result).rejects.toBe(error);
  });

  it('throws the first rejection in input order, even if a later one rejected earlier', async () => {
    const firstError = new Error('first in input order');
    const secondError = new Error('first in time');
    const first = Promise.withResolvers<string>();

    const result = allSettledOrThrow([first.promise, Promise.reject(secondError)]);
    const assertion = expect(result).rejects.toBe(firstError);

    await flushPromises();
    first.reject(firstError);

    await assertion;
  });

  it('resolves for an empty array', async () => {
    await expect(allSettledOrThrow([])).resolves.toBeUndefined();
  });
});
