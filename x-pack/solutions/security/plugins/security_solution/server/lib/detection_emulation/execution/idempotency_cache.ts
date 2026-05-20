/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { createHash } from 'crypto';

/**
 * Configuration for the in-memory idempotency cache.
 */
export interface EmulationIdempotencyCacheConfig {
  /**
   * How long, in milliseconds, to remember the result of a dispatch keyed by
   * (spaceId, emulationId, command, sorted endpointIds). After this window
   * elapses the same payload becomes a brand-new dispatch.
   *
   * Default 30 s — long enough to swallow a double-click, network retry, or
   * "did the 502 actually go through" replay; short enough that an operator
   * who genuinely wants to re-run the same command isn't blocked for long.
   */
  ttlMs: number;
  /**
   * Hard cap on the number of cached entries per space, evicted oldest-first.
   * Prevents unbounded growth when the same emulation dispatches lots of
   * distinct commands inside the TTL.
   */
  maxEntriesPerSpace: number;
  /** When true, idempotency caching is disabled (every call dispatches). */
  disabled: boolean;
}

/** Whatever the caller wants to remember and replay. */
export interface CachedDispatchResult {
  actionId: string;
  agentType: string;
  command: string;
  /**
   * Mirrors `RunEmulationResult.status` from the runner so we can replay the
   * cached value into the same response shape without translation.
   */
  status: 'dispatched' | 'error';
  /** Original `error` string, if any — replayed verbatim. */
  error?: string;
}

interface CacheEntry {
  /** Cached payload to return on a hit. */
  result: CachedDispatchResult;
  /** Wall-clock ms epoch when the entry expires. */
  expiresAt: number;
}

/**
 * Build the canonical key for a dispatch. Sorting `endpointIds` makes the
 * cache invariant to argv ordering — `[a, b]` and `[b, a]` are the same
 * intent and must hit the same slot.
 *
 * We hash the structured key with SHA-256 to keep the map keys short and
 * non-PII (an endpointId is sometimes a hostname).
 */
export function buildIdempotencyKey(input: {
  spaceId: string;
  emulationId: string;
  command: string;
  agentType: string;
  endpointIds: readonly string[];
}): string {
  const sortedEndpoints = [...input.endpointIds].sort();
  const raw = JSON.stringify({
    s: input.spaceId,
    e: input.emulationId,
    c: input.command,
    a: input.agentType,
    h: sortedEndpoints,
  });
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Per-space in-memory dedupe cache for emulation dispatches.
 *
 * Why in-memory and not, say, the SO type:
 * - Idempotency only needs to span seconds, not deployments.
 * - A round-trip to ES on every dispatch would dominate the cost of the
 *   actual response action.
 * - The trade-off is that a Kibana restart resets the cache, which is
 *   fine for the "swallow a double-click" use case.
 */
export class EmulationIdempotencyCache {
  private readonly entries: Map<string, Map<string, CacheEntry>> = new Map();

  constructor(
    private readonly config: EmulationIdempotencyCacheConfig,
    private readonly logger: Logger
  ) {
    this.logger.debug(
      `Emulation idempotency cache initialized: ttlMs=${config.ttlMs}, maxEntriesPerSpace=${config.maxEntriesPerSpace}, disabled=${config.disabled}`
    );
  }

  /**
   * Look up a previously cached dispatch result. Returns `undefined` if there
   * is no live entry for the key. Side-effect: sweeps expired entries for the
   * space on every read so the map stays bounded without a timer.
   */
  get(spaceId: string, key: string): CachedDispatchResult | undefined {
    if (this.config.disabled) {
      return undefined;
    }
    this.sweepExpired(spaceId);
    const space = this.entries.get(spaceId);
    const hit = space?.get(key);
    if (!hit) {
      return undefined;
    }
    if (hit.expiresAt <= Date.now()) {
      space?.delete(key);
      return undefined;
    }
    this.logger.debug(`Idempotency cache HIT (space=${spaceId}, key=${key.slice(0, 12)}…)`);
    return hit.result;
  }

  /**
   * Remember `result` for `(spaceId, key)` for `ttlMs`. If the per-space cap
   * is exceeded after insertion, the oldest entry is evicted.
   */
  set(spaceId: string, key: string, result: CachedDispatchResult): void {
    if (this.config.disabled) {
      return;
    }
    let space = this.entries.get(spaceId);
    if (!space) {
      space = new Map();
      this.entries.set(spaceId, space);
    }
    space.set(key, {
      result,
      expiresAt: Date.now() + this.config.ttlMs,
    });
    if (space.size > this.config.maxEntriesPerSpace) {
      // Maps preserve insertion order — drop the oldest key.
      const oldestKey = space.keys().next().value;
      if (oldestKey !== undefined) {
        space.delete(oldestKey);
      }
    }
  }

  private sweepExpired(spaceId: string): void {
    const space = this.entries.get(spaceId);
    if (!space || space.size === 0) {
      return;
    }
    const now = Date.now();
    for (const [key, entry] of space) {
      if (entry.expiresAt <= now) {
        space.delete(key);
      }
    }
    if (space.size === 0) {
      this.entries.delete(spaceId);
    }
  }
}

export function createDefaultIdempotencyCacheConfig(): EmulationIdempotencyCacheConfig {
  return {
    ttlMs: 30_000,
    maxEntriesPerSpace: 256,
    disabled: false,
  };
}
