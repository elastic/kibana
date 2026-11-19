/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Compressed feed bytes the fetch step downloaded, held for the match step and the next run's conditional request. */
export interface CachedFeed {
  etag?: string;
  lastModified?: string;
  body: Uint8Array;
  /** Which variant was fetched; a flag mismatch means the bytes are for the other feed. */
  includeUnfixed: boolean;
}

/** More releases than this are unlikely (Ubuntu and RHEL majors in use); the cap bounds heap if that changes. */
export const MAX_CACHED_FEEDS = 8;

// Per process: the workflow engine may run the match step on another node, which then downloads the feed itself.
const cache = new Map<string, CachedFeed>();

export const getCachedFeed = (release: string, includeUnfixed: boolean): CachedFeed | undefined => {
  const cached = cache.get(release);
  return cached?.includeUnfixed === includeUnfixed ? cached : undefined;
};

export const setCachedFeed = (release: string, feed: CachedFeed): void => {
  cache.delete(release);
  cache.set(release, feed);
  while (cache.size > MAX_CACHED_FEEDS) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
};

/** Drops every entry whose release was not just fetched, so a decommissioned OS release frees its feed. */
export const retainCachedFeeds = (releases: ReadonlySet<string>): void => {
  for (const release of [...cache.keys()]) {
    if (!releases.has(release)) cache.delete(release);
  }
};

export const clearFeedCache = (): void => cache.clear();
