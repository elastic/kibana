/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usingClient } from './worker_client';

describe('usingClient', () => {
  it('cancels pending executions after a normal run', async () => {
    const cancelPending = jest.fn(async () => undefined);
    await usingClient({ cancelPending }, async () => undefined);
    expect(cancelPending).toHaveBeenCalledTimes(1);
  });

  it('cancels pending executions when the body throws, and rethrows', async () => {
    const cancelPending = jest.fn(async () => undefined);
    await expect(
      usingClient({ cancelPending }, async () => {
        throw new Error('spec failed');
      })
    ).rejects.toThrow('spec failed');
    expect(cancelPending).toHaveBeenCalledTimes(1);
  });
});
