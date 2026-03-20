/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservablesCache } from './observables_cache';

describe('ObservablesCache', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stores and retrieves values', () => {
    const cache = new ObservablesCache<string[]>();
    cache.set('case-1', ['ip-1', 'host-a']);

    expect(cache.get('case-1')).toEqual(['ip-1', 'host-a']);
  });

  it('returns undefined for missing keys', () => {
    const cache = new ObservablesCache();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('evicts entries after TTL expires', () => {
    const cache = new ObservablesCache<string>({ ttlMs: 1000 });
    cache.set('key', 'value');

    expect(cache.get('key')).toBe('value');

    jest.advanceTimersByTime(1001);
    expect(cache.get('key')).toBeUndefined();
  });

  it('respects maxEntries by pruning expired first', () => {
    const cache = new ObservablesCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set('a', 1);

    jest.advanceTimersByTime(500);
    cache.set('b', 2);

    jest.advanceTimersByTime(600);
    // 'a' should be expired now (1100ms > 1000ms TTL)
    cache.set('c', 3);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('invalidates a specific key', () => {
    const cache = new ObservablesCache<string>();
    cache.set('k', 'v');
    cache.invalidate('k');

    expect(cache.get('k')).toBeUndefined();
  });

  it('clears all entries', () => {
    const cache = new ObservablesCache<number>();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    expect(cache.size).toBe(0);
  });

  it('prune removes all expired entries', () => {
    const cache = new ObservablesCache<number>({ ttlMs: 100 });
    cache.set('a', 1);
    cache.set('b', 2);

    jest.advanceTimersByTime(200);
    const pruned = cache.prune();

    expect(pruned).toBe(2);
    expect(cache.size).toBe(0);
  });
});
