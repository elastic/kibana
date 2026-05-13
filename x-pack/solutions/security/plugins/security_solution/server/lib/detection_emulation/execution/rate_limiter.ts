/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * Configuration for a single rate-limit bucket (per-space or per-host).
 */
export interface RateLimitBucketConfig {
  /** Maximum number of commands allowed within the time window. */
  capacity: number;
  /** Time window in milliseconds for rate limiting. */
  windowMs: number;
}

/**
 * Configuration for the emulation rate limiter.
 *
 * The limiter enforces TWO independent buckets per call:
 *   - Per-space: caps total throughput for a Kibana space (defends the
 *     control plane and the audit-trail surface). Default 100/space/hour.
 *   - Per-host (PROD-4, optional): caps requests landing on any single
 *     EDR-enrolled host (defends the host-side response-action queue,
 *     which has its own backpressure budget that varies by vendor).
 *     Default 3/host/hour. When omitted, only the per-space bucket is
 *     enforced — preserves the pre-PROD-4 behaviour.
 *
 * Both buckets are sliding-window. Acquire is atomic across both
 * buckets: if the per-host bucket would be exhausted for ANY of the
 * supplied endpoint IDs, the entire call is rejected and any per-space
 * reservation is rolled back before returning. This prevents partial
 * commits where one bucket records a slot the other rejects.
 *
 * `disabled: true` short-circuits BOTH buckets — useful for tests and
 * for the `xpack.securitySolution.detectionEmulation.rateLimit.disabled`
 * escape hatch.
 */
export interface EmulationRateLimiterConfig {
  /**
   * Maximum number of commands allowed per space within the window.
   *
   * Backward-compat: this scalar is the per-space limit. Pre-PROD-4
   * config blobs that only set `maxCommands`/`windowMs` continue to
   * work — they get the per-space bucket only.
   */
  maxCommands: number;
  /** Time window in milliseconds for the per-space bucket. */
  windowMs: number;
  /** When true, all buckets are bypassed and every acquire succeeds. */
  disabled: boolean;
  /**
   * Optional per-host bucket config (PROD-4). When omitted, per-host
   * limiting is skipped and acquires that pass `endpointIds` are
   * checked against the per-space bucket only.
   */
  perHost?: RateLimitBucketConfig;
}

/**
 * Result of an `acquire()` attempt.
 */
export interface RateLimitAcquireResult {
  /** True if the slot was reserved and the caller may proceed. */
  allowed: boolean;
  /** Current count in the per-space window after acquire (or at rejection). */
  currentCount: number;
  /** Maximum allowed commands in the per-space window. */
  maxCommands: number;
  /** Time in milliseconds until the rate limit resets (only when blocked). */
  resetMs?: number;
  /** Optional error message if rate limit is exceeded. */
  error?: string;
  /**
   * When the call was rejected by the per-host bucket, the endpoint IDs
   * whose buckets were exhausted. The caller can surface these in the
   * 429 body so the operator knows exactly which hosts are saturated.
   */
  blockedEndpoints?: string[];
  /** Token for `release()` if the caller decides to undo the acquire. */
  token?: AcquireToken;
}

/**
 * Tracked command entry for rate limiting.
 */
interface CommandEntry {
  timestamp: number;
  emulationId: string;
  command: string;
}

/**
 * Opaque token that callers pass back to `release()` to undo a
 * successful `acquire()`. Carries the per-space entry plus a list of
 * per-host (endpointId, entry) pairs so release rolls back every
 * reservation made during the matching acquire.
 */
export interface AcquireToken {
  spaceId: string;
  spaceEntry: CommandEntry;
  hostEntries: Array<{ endpointId: string; entry: CommandEntry }>;
}

/**
 * Per-space + per-host sliding-window rate limiter for
 * detection-emulation commands.
 *
 * The route invokes `acquire(spaceId, emulationId, command, endpointIds)`
 * *before* dispatching to the runner. Acquire is atomic: it both
 * checks every relevant window and records the entries under one
 * synchronous call, eliminating the check-then-act race that allowed
 * the limit to be bypassed under concurrent requests on the original
 * `check()` + `record()` API.
 *
 * If dispatch fails the caller may pass the returned `token` back to
 * `release()` to roll the per-space AND every per-host count back down.
 */
export class EmulationRateLimiter {
  private readonly config: EmulationRateLimiterConfig;
  private readonly logger: Logger;
  /** Per-space sliding window: spaceId -> entries. */
  private readonly commandHistory: Map<string, CommandEntry[]> = new Map();
  /**
   * Per-host sliding window: spaceId -> endpointId -> entries.
   *
   * Nested by space because endpoint IDs are namespaced per Fleet
   * deployment; sharing a flat map across spaces would risk a host
   * in space-A blocking the same host ID in space-B.
   */
  private readonly hostHistory: Map<string, Map<string, CommandEntry[]>> = new Map();

  constructor(config: EmulationRateLimiterConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.logger.debug(
      `Emulation rate limiter initialized: maxCommands=${config.maxCommands}, windowMs=${
        config.windowMs
      }, disabled=${config.disabled}, perHost=${
        config.perHost ? `${config.perHost.capacity}/${config.perHost.windowMs}ms` : 'disabled'
      }`
    );
  }

  /**
   * Returns the constructor-bound config. Used by the runtime config
   * resolver as the final fallback layer (uiSettings > kibana.yml >
   * constructor) so `acquire(..., effectiveConfig)` always sees a
   * complete shape even when only one Advanced Setting is overridden.
   */
  getConfig(): EmulationRateLimiterConfig {
    return this.config;
  }

  /**
   * Atomically reserve a slot in the per-space window for `spaceId`,
   * AND (when `endpointIds` is provided and per-host limiting is
   * configured) reserve a slot in the per-host window for each
   * endpoint ID.
   *
   * Returns `{ allowed: true, token }` on success, or
   * `{ allowed: false, ... }` if any bucket would be exhausted. On
   * rejection, NO reservations are recorded — the per-space entry
   * (if it was already added) is rolled back before returning so the
   * limiter never enters a partial state.
   *
   * Hold the returned `token` if you need to call `release()` on
   * downstream failure.
   */
  acquire(
    spaceId: string,
    emulationId: string,
    command: string,
    endpointIds: string[] = [],
    /**
     * Optional per-call override of the rate limiter's configured caps
     * and windows. Used by callers that resolve a per-space effective
     * config (e.g. from Kibana Advanced Settings) at request time.
     *
     * Mutation semantics when the override differs from `this.config`:
     *
     * - `disabled: true` → call bypasses both buckets and returns
     *   immediately (matches the `this.config.disabled` short-circuit).
     * - `maxCommands` lower than `this.config.maxCommands` → existing
     *   bucket entries are preserved; the new (lower) cap is enforced
     *   on the current acquire. The bucket may be transiently over-cap
     *   for entries inserted before the change; they slide out per the
     *   override's `windowMs`.
     * - `windowMs` shorter than `this.config.windowMs` → cleanup
     *   evicts entries more aggressively. Some entries that the old
     *   window would have kept are dropped early.
     * - `perHost.capacity` / `perHost.windowMs` follow the same model.
     *
     * `release()` continues to use `this.config.disabled` (fixed at
     * construction) — it must be a no-op iff the corresponding acquire
     * was a no-op, and the caller carries the token across both calls.
     */
    effectiveConfig?: EmulationRateLimiterConfig
  ): RateLimitAcquireResult {
    const cfg = effectiveConfig ?? this.config;
    if (cfg.disabled) {
      this.logger.debug(`Rate limit acquire bypassed: rate limiting is disabled (${spaceId})`);
      return {
        allowed: true,
        currentCount: 0,
        maxCommands: cfg.maxCommands,
      };
    }

    this.cleanupExpiredEntries(spaceId, cfg.windowMs);

    // ─── Per-space check ────────────────────────────────────────────────
    const spaceEntries = this.commandHistory.get(spaceId) ?? [];
    if (spaceEntries.length >= cfg.maxCommands) {
      const oldestEntry = spaceEntries[0];
      const resetMs = oldestEntry
        ? Math.max(0, cfg.windowMs - (Date.now() - oldestEntry.timestamp))
        : 0;
      const error = `Rate limit exceeded for space ${spaceId}: ${spaceEntries.length}/${cfg.maxCommands} commands in the last ${cfg.windowMs}ms. Reset in ${resetMs}ms.`;
      this.logger.warn(error);
      return {
        allowed: false,
        currentCount: spaceEntries.length,
        maxCommands: cfg.maxCommands,
        resetMs,
        error,
      };
    }

    // ─── Per-host check (PROD-4) ────────────────────────────────────────
    // Only fire if both the config has a per-host bucket AND the caller
    // supplied endpoint IDs. validateRule's log_injection mode and the
    // pre-PROD-4 callers don't pass endpointIds — they get the
    // per-space-only behaviour they had before.
    const perHost = cfg.perHost;
    if (perHost && endpointIds.length > 0) {
      this.cleanupExpiredHostEntries(spaceId, perHost.windowMs);
      const hostBuckets = this.hostHistory.get(spaceId) ?? new Map<string, CommandEntry[]>();
      const blockedEndpoints: string[] = [];
      for (const endpointId of endpointIds) {
        const entries = hostBuckets.get(endpointId) ?? [];
        if (entries.length >= perHost.capacity) {
          blockedEndpoints.push(endpointId);
        }
      }
      if (blockedEndpoints.length > 0) {
        const error = `Per-host rate limit exceeded for space ${spaceId}: ${
          blockedEndpoints.length
        } endpoint(s) at capacity (${perHost.capacity}/${
          perHost.windowMs
        }ms). Blocked endpoints: ${blockedEndpoints.join(', ')}.`;
        this.logger.warn(error);
        return {
          allowed: false,
          currentCount: spaceEntries.length,
          maxCommands: cfg.maxCommands,
          blockedEndpoints,
          error,
        };
      }
    }

    // ─── Atomic record: per-space + per-host together ───────────────────
    const now = Date.now();
    const spaceEntry: CommandEntry = { timestamp: now, emulationId, command };
    spaceEntries.push(spaceEntry);
    this.commandHistory.set(spaceId, spaceEntries);

    const hostEntries: AcquireToken['hostEntries'] = [];
    if (perHost && endpointIds.length > 0) {
      const hostBuckets = this.hostHistory.get(spaceId) ?? new Map<string, CommandEntry[]>();
      for (const endpointId of endpointIds) {
        const entries = hostBuckets.get(endpointId) ?? [];
        const entry: CommandEntry = { timestamp: now, emulationId, command };
        entries.push(entry);
        hostBuckets.set(endpointId, entries);
        hostEntries.push({ endpointId, entry });
      }
      this.hostHistory.set(spaceId, hostBuckets);
    }

    this.logger.debug(
      `Rate limit acquired for space ${spaceId}: ${spaceEntries.length}/${cfg.maxCommands}${
        hostEntries.length > 0 ? ` and ${hostEntries.length} host bucket(s)` : ''
      }`
    );
    return {
      allowed: true,
      currentCount: spaceEntries.length,
      maxCommands: cfg.maxCommands,
      token: { spaceId, spaceEntry, hostEntries },
    };
  }

  /**
   * Release a slot previously reserved by `acquire()`. No-op if the
   * token is missing, expired, or already removed. Rolls back the
   * per-space entry AND every per-host entry recorded during the
   * matching acquire.
   */
  release(token?: AcquireToken): void {
    if (!token || this.config.disabled) {
      return;
    }
    const entries = this.commandHistory.get(token.spaceId);
    if (entries) {
      const idx = entries.indexOf(token.spaceEntry);
      if (idx !== -1) {
        entries.splice(idx, 1);
        if (entries.length === 0) {
          this.commandHistory.delete(token.spaceId);
        }
      }
    }
    const hostBuckets = this.hostHistory.get(token.spaceId);
    if (hostBuckets) {
      for (const { endpointId, entry } of token.hostEntries) {
        const hostEntries = hostBuckets.get(endpointId);
        if (hostEntries) {
          const idx = hostEntries.indexOf(entry);
          if (idx !== -1) {
            hostEntries.splice(idx, 1);
            if (hostEntries.length === 0) {
              hostBuckets.delete(endpointId);
            }
          }
        }
      }
      if (hostBuckets.size === 0) {
        this.hostHistory.delete(token.spaceId);
      }
    }
    this.logger.debug(`Rate limit released for space ${token.spaceId}`);
  }

  /**
   * Test/debug helper: number of entries currently counted in the
   * per-space window for a space. Cleans up expired entries on read.
   *
   * `windowMsOverride` mirrors `acquire()`'s `effectiveConfig.windowMs`
   * so tests can probe what the count would be under a per-space
   * Advanced-Setting override without first calling `acquire()`.
   */
  getCurrentCount(spaceId: string, windowMsOverride?: number): number {
    this.cleanupExpiredEntries(spaceId, windowMsOverride);
    return this.commandHistory.get(spaceId)?.length ?? 0;
  }

  /**
   * Test/debug helper: number of entries currently counted in the
   * per-host bucket for `(spaceId, endpointId)`. Cleans up expired
   * entries on read. See `getCurrentCount` for the override semantics.
   */
  getCurrentHostCount(spaceId: string, endpointId: string, windowMsOverride?: number): number {
    this.cleanupExpiredHostEntries(spaceId, windowMsOverride);
    return this.hostHistory.get(spaceId)?.get(endpointId)?.length ?? 0;
  }

  /**
   * Drop entries older than `windowMs` for a given space's per-space
   * bucket. Called on every `acquire()` and `getCurrentCount()` so the
   * window stays bounded without a separate timer.
   *
   * `windowMsOverride` mirrors the per-call override threaded through
   * `acquire()` — when the operator shortens the window via Advanced
   * Settings, cleanup must use the new (shorter) horizon so entries
   * the operator considers "expired" actually drop out.
   */
  private cleanupExpiredEntries(spaceId: string, windowMsOverride?: number): void {
    const entries = this.commandHistory.get(spaceId);
    if (!entries || entries.length === 0) {
      return;
    }
    const windowMs = windowMsOverride ?? this.config.windowMs;
    const cutoffTime = Date.now() - windowMs;
    const validEntries = entries.filter((entry) => entry.timestamp > cutoffTime);
    if (validEntries.length === entries.length) {
      return;
    }
    if (validEntries.length === 0) {
      this.commandHistory.delete(spaceId);
    } else {
      this.commandHistory.set(spaceId, validEntries);
    }
  }

  /**
   * Drop entries older than `perHost.windowMs` for every per-host
   * bucket under `spaceId`. Called on every per-host check so the
   * window stays bounded without a separate timer.
   *
   * See {@link cleanupExpiredEntries} for the `windowMsOverride`
   * semantics; same model applies here.
   */
  private cleanupExpiredHostEntries(spaceId: string, windowMsOverride?: number): void {
    const perHost = this.config.perHost;
    const effectiveWindowMs = windowMsOverride ?? perHost?.windowMs;
    if (!effectiveWindowMs) return;
    const hostBuckets = this.hostHistory.get(spaceId);
    if (!hostBuckets || hostBuckets.size === 0) return;
    const cutoffTime = Date.now() - effectiveWindowMs;
    for (const [endpointId, entries] of hostBuckets) {
      const validEntries = entries.filter((entry) => entry.timestamp > cutoffTime);
      if (validEntries.length !== entries.length) {
        if (validEntries.length === 0) {
          hostBuckets.delete(endpointId);
        } else {
          hostBuckets.set(endpointId, validEntries);
        }
      }
    }
    if (hostBuckets.size === 0) {
      this.hostHistory.delete(spaceId);
    }
  }
}

/**
 * Default config: 100 commands per space per hour AND 3 commands per
 * host per hour (PROD-4). Both buckets enabled.
 *
 * Per-host capacity of 3/hour was chosen to match the lower bound of
 * what major EDR vendors document as their host-side response-action
 * queue depth before backpressure kicks in. Raising it requires
 * confirming the target vendor can absorb the additional load AND
 * raising `MAX_ENDPOINT_FANOUT` (PROD-3) in lockstep, since the
 * realistic ceiling on a single emulation is fanout × per-host.
 *
 * Operators tune both `perHost` and the per-space caps via:
 * - `xpack.securitySolution.detectionEmulation.rateLimiter.*` in
 *   `kibana.yml` (deployment-wide defaults), or
 * - `securitySolution:detectionEmulation:rateLimiter*` in Advanced
 *   Settings (per-space runtime overrides; resolved per-request via
 *   `runtime_config_resolver.ts` and threaded through `acquire()`'s
 *   `effectiveConfig` parameter).
 */
export function createDefaultRateLimiterConfig(): EmulationRateLimiterConfig {
  return {
    maxCommands: 100,
    windowMs: 60 * 60 * 1000,
    disabled: false,
    perHost: {
      capacity: 3,
      windowMs: 60 * 60 * 1000,
    },
  };
}
