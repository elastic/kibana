/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_CACHED_FEEDS,
  clearFeedCache,
  getCachedFeed,
  retainCachedFeeds,
  setCachedFeed,
} from './feed_cache';

const feed = (etag: string) => ({ etag, body: new Uint8Array([1, 2, 3]), includeUnfixed: false });

describe('feed cache', () => {
  beforeEach(() => clearFeedCache());

  it('returns what was stored and nothing for an unknown release', () => {
    setCachedFeed('ubuntu:noble', feed('"a"'));
    expect(getCachedFeed('ubuntu:noble', false)?.etag).toBe('"a"');
    expect(getCachedFeed('rhel:9', false)).toBeUndefined();
  });

  it('replaces an entry for the same release', () => {
    setCachedFeed('ubuntu:noble', feed('"a"'));
    setCachedFeed('ubuntu:noble', feed('"b"'));
    expect(getCachedFeed('ubuntu:noble', false)?.etag).toBe('"b"');
  });

  it('evicts the least recently stored release past the cap', () => {
    for (let i = 0; i <= MAX_CACHED_FEEDS; i++) setCachedFeed(`rhel:${i}`, feed(`"${i}"`));
    expect(getCachedFeed('rhel:0', false)).toBeUndefined();
    expect(getCachedFeed(`rhel:${MAX_CACHED_FEEDS}`, false)).toBeDefined();
  });

  it('retains only the releases it is told to keep', () => {
    setCachedFeed('ubuntu:noble', feed('"a"'));
    setCachedFeed('rhel:9', feed('"b"'));
    retainCachedFeeds(new Set(['rhel:9']));
    expect(getCachedFeed('ubuntu:noble', false)).toBeUndefined();
    expect(getCachedFeed('rhel:9', false)).toBeDefined();
  });
});
