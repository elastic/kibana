/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDeferred } from './deferred';

describe('createDeferred', () => {
  it('resolves the promise when resolve() is called', async () => {
    const deferred = createDeferred();

    deferred.resolve();

    await expect(deferred.promise).resolves.toBeUndefined();
  });

  it('rejects the promise when reject() is called', async () => {
    const deferred = createDeferred();
    const err = new Error('boom');

    deferred.reject(err);

    await expect(deferred.promise).rejects.toBe(err);
  });

  it('exposes resolve/reject synchronously (they are assigned before returning)', () => {
    const deferred = createDeferred();
    expect(typeof deferred.resolve).toBe('function');
    expect(typeof deferred.reject).toBe('function');
  });
});
