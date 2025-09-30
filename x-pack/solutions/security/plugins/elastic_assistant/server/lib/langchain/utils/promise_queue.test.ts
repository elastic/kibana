/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromiseQueue } from './promise_queue';

describe('PromiseQueue', () => {
  it('starts with an empty set', () => {
    const queue = new PromiseQueue();
    expect(queue.pendingPromises.size).toBe(0);
  });

  it('does not add when called without a promise', () => {
    const queue = new PromiseQueue();
    queue.queuePromise();
    expect(queue.pendingPromises.size).toBe(0);
  });

  it('adds a pending promise to the set', () => {
    const queue = new PromiseQueue();
    const neverSettling = new Promise(() => {});
    queue.queuePromise(neverSettling);
    expect(queue.pendingPromises.size).toBe(1);
  });

  it('removes a promise after it resolves', async () => {
    const queue = new PromiseQueue();
    let resolveFn: (v?: unknown) => void = () => {};
    const p = new Promise((resolve) => {
      resolveFn = resolve;
    });
    queue.queuePromise(p);
    resolveFn(undefined);
    await Promise.resolve();
    expect(queue.pendingPromises.size).toBe(0);
  });

  it('removes a promise after it rejects', async () => {
    const queue = new PromiseQueue();
    let rejectFn: (e?: unknown) => void = () => {};
    const p = new Promise((_, reject) => {
      rejectFn = reject;
    }).catch(() => {});
    queue.queuePromise(p);
    rejectFn(false);
    await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    expect(queue.pendingPromises.size).toBe(0);
  });
});
