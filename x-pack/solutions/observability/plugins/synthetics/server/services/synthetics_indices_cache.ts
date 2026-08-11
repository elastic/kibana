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
  private readonly keyGenerations = new Map<string, number>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  // Bumped only on invalidate() with no key; per-key invalidation uses keyGenerations.
  private globalGeneration = 0;

  constructor(options: SyntheticsIndicesCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_SYNTHETICS_INDICES_CACHE_TTL_MS;
    this.now = options.now ?? Date.now;
  }

  private getKeyGeneration(key: string): number {
    return this.keyGenerations.get(key) ?? 0;
  }

  private bumpKeyGeneration(key: string): void {
    this.keyGenerations.set(key, this.getKeyGeneration(key) + 1);
  }

  async get(key: string, resolver: () => Promise<string>): Promise<string> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > this.now()) {
      return cached.indices;
    }
    if (cached) {
      this.entries.delete(key);
    }

    const inflight = this.inflight.get(key);
    if (inflight) {
      return inflight;
    }

    const startGlobalGeneration = this.globalGeneration;
    const startKeyGeneration = this.getKeyGeneration(key);
    const inflightEntry: { promise?: Promise<string> } = {};
    inflightEntry.promise = (async () => {
      try {
        const indices = await resolver();
        if (
          this.globalGeneration === startGlobalGeneration &&
          this.getKeyGeneration(key) === startKeyGeneration
        ) {
          this.entries.set(key, { indices, expiresAt: this.now() + this.ttlMs });
        }
        return indices;
      } finally {
        if (this.inflight.get(key) === inflightEntry.promise) {
          this.inflight.delete(key);
        }
      }
    })();

    this.inflight.set(key, inflightEntry.promise);
    return inflightEntry.promise;
  }

  invalidate(key?: string): void {
    if (key === undefined) {
      this.globalGeneration += 1;
      this.entries.clear();
      this.inflight.clear();
      this.keyGenerations.clear();
      return;
    }
    this.bumpKeyGeneration(key);
    this.entries.delete(key);
    this.inflight.delete(key);
  }
}
