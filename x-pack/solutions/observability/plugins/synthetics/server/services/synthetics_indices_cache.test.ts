/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsIndicesCache } from './synthetics_indices_cache';

describe('SyntheticsIndicesCache', () => {
  let currentTime: number;
  const now = () => currentTime;

  beforeEach(() => {
    currentTime = 1_000;
  });

  it('returns the resolver value on the first call and caches it for subsequent calls', async () => {
    const cache = new SyntheticsIndicesCache({ ttlMs: 1_000, now });
    const resolver = jest.fn().mockResolvedValue('synthetics-*');

    const first = await cache.get('default', resolver);
    const second = await cache.get('default', resolver);

    expect(first).toBe('synthetics-*');
    expect(second).toBe('synthetics-*');
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it('re-resolves after the TTL has elapsed', async () => {
    const cache = new SyntheticsIndicesCache({ ttlMs: 1_000, now });
    const resolver = jest
      .fn()
      .mockResolvedValueOnce('synthetics-*')
      .mockResolvedValueOnce('synthetics-*,cluster-a:synthetics-*');

    await cache.get('default', resolver);
    currentTime += 1_001;
    const second = await cache.get('default', resolver);

    expect(second).toBe('synthetics-*,cluster-a:synthetics-*');
    expect(resolver).toHaveBeenCalledTimes(2);
  });

  it('does not re-resolve right before the TTL expires', async () => {
    const cache = new SyntheticsIndicesCache({ ttlMs: 1_000, now });
    const resolver = jest.fn().mockResolvedValue('synthetics-*');

    await cache.get('default', resolver);
    currentTime += 999;
    await cache.get('default', resolver);

    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it('keeps separate entries per key', async () => {
    const cache = new SyntheticsIndicesCache({ ttlMs: 1_000, now });
    const defaultResolver = jest.fn().mockResolvedValue('synthetics-*');
    const marketingResolver = jest
      .fn()
      .mockResolvedValue('synthetics-*,marketing-cluster:synthetics-*');

    const defaultIndices = await cache.get('default', defaultResolver);
    const marketingIndices = await cache.get('marketing', marketingResolver);
    const defaultAgain = await cache.get('default', defaultResolver);

    expect(defaultIndices).toBe('synthetics-*');
    expect(marketingIndices).toBe('synthetics-*,marketing-cluster:synthetics-*');
    expect(defaultAgain).toBe('synthetics-*');
    expect(defaultResolver).toHaveBeenCalledTimes(1);
    expect(marketingResolver).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent misses against the same key into a single resolver call', async () => {
    const cache = new SyntheticsIndicesCache({ ttlMs: 1_000, now });
    let resolvePromise: (value: string) => void = () => {};
    const resolver = jest.fn().mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolvePromise = resolve;
        })
    );

    const [a, b, c] = [
      cache.get('default', resolver),
      cache.get('default', resolver),
      cache.get('default', resolver),
    ];

    resolvePromise('synthetics-*');

    await expect(a).resolves.toBe('synthetics-*');
    await expect(b).resolves.toBe('synthetics-*');
    await expect(c).resolves.toBe('synthetics-*');
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it('does not cache rejected results so the next caller retries', async () => {
    const cache = new SyntheticsIndicesCache({ ttlMs: 1_000, now });
    const error = new Error('elasticsearch unavailable');
    const resolver = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('synthetics-*');

    await expect(cache.get('default', resolver)).rejects.toBe(error);
    await expect(cache.get('default', resolver)).resolves.toBe('synthetics-*');
    expect(resolver).toHaveBeenCalledTimes(2);
  });

  it('drops the in-flight entry after rejection so a later concurrent caller can retry', async () => {
    const cache = new SyntheticsIndicesCache({ ttlMs: 1_000, now });
    const error = new Error('boom');
    const resolver = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('synthetics-*');

    const failing = cache.get('default', resolver);
    await expect(failing).rejects.toBe(error);

    const recovered = await cache.get('default', resolver);
    expect(recovered).toBe('synthetics-*');
    expect(resolver).toHaveBeenCalledTimes(2);
  });

  it('invalidate(key) clears only that key', async () => {
    const cache = new SyntheticsIndicesCache({ ttlMs: 60_000, now });
    const defaultResolver = jest
      .fn()
      .mockResolvedValueOnce('synthetics-*')
      .mockResolvedValueOnce('synthetics-*,new:synthetics-*');
    const marketingResolver = jest.fn().mockResolvedValue('marketing');

    await cache.get('default', defaultResolver);
    await cache.get('marketing', marketingResolver);

    cache.invalidate('default');

    expect(await cache.get('default', defaultResolver)).toBe('synthetics-*,new:synthetics-*');
    expect(await cache.get('marketing', marketingResolver)).toBe('marketing');
    expect(defaultResolver).toHaveBeenCalledTimes(2);
    expect(marketingResolver).toHaveBeenCalledTimes(1);
  });

  it('invalidate() with no key clears every entry', async () => {
    const cache = new SyntheticsIndicesCache({ ttlMs: 60_000, now });
    const defaultResolver = jest
      .fn()
      .mockResolvedValueOnce('synthetics-*')
      .mockResolvedValueOnce('synthetics-*,refreshed:synthetics-*');
    const marketingResolver = jest
      .fn()
      .mockResolvedValueOnce('marketing')
      .mockResolvedValueOnce('marketing-refreshed');

    await cache.get('default', defaultResolver);
    await cache.get('marketing', marketingResolver);

    cache.invalidate();

    expect(await cache.get('default', defaultResolver)).toBe('synthetics-*,refreshed:synthetics-*');
    expect(await cache.get('marketing', marketingResolver)).toBe('marketing-refreshed');
    expect(defaultResolver).toHaveBeenCalledTimes(2);
    expect(marketingResolver).toHaveBeenCalledTimes(2);
  });
});
