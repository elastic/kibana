/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Short-lived per-space cache for the CCS-resolved heartbeat indices string.
 *
 * Avoids resolving settings (and `cluster.remoteInfo()` on the specific-clusters
 * path) on every request. Concurrent misses share one in-flight resolution.
 * Errors are not cached so failures can retry instead of pinning the fallback.
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

    const promise = (async () => {
      try {
        const indices = await resolver();
        this.entries.set(key, { indices, expiresAt: this.now() + this.ttlMs });
        return indices;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  invalidate(key?: string): void {
    if (key === undefined) {
      this.entries.clear();
      return;
    }
    this.entries.delete(key);
  }
}
