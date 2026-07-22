/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Coalesces concurrent misses on the same key and does not cache rejections,
 * so transient failures retry on the next request instead of pinning the
 * fallback for the TTL window.
 */

interface CacheEntry {
  indices: string;
  expiresAt: number;
}

export const DEFAULT_SYNTHETICS_INDICES_CACHE_TTL_MS = 30_000;

export interface SyntheticsIndicesCacheOptions {
  ttlMs?: number;
  now?: () => number;
}

export class SyntheticsIndicesCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<string>>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  // Bumped on every invalidate(). A resolve that started before an invalidation
  // must not write its now-stale result back, so we compare generations before
  // caching.
  private generation = 0;

  constructor(options: SyntheticsIndicesCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_SYNTHETICS_INDICES_CACHE_TTL_MS;
    this.now = options.now ?? Date.now;
  }

  async get(key: string, resolver: () => Promise<string>): Promise<string> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > this.now()) {
      return cached.indices;
    }

    const inflight = this.inflight.get(key);
    if (inflight) {
      return inflight;
    }

    const startGeneration = this.generation;
    const promise = (async () => {
      try {
        const indices = await resolver();
        // Skip the write if an invalidate() happened while resolving, otherwise
        // a resolve that read pre-save settings would repopulate stale indices.
        if (this.generation === startGeneration) {
          this.entries.set(key, { indices, expiresAt: this.now() + this.ttlMs });
        }
        return indices;
      } finally {
        // An invalidate() during the resolve already cleared this in-flight
        // entry (and may have replaced it with a newer resolve), so only this
        // resolve removes its own entry.
        if (this.generation === startGeneration) {
          this.inflight.delete(key);
        }
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  invalidate(key?: string): void {
    this.generation += 1;
    if (key === undefined) {
      this.entries.clear();
      this.inflight.clear();
      return;
    }
    this.entries.delete(key);
    this.inflight.delete(key);
  }
}
