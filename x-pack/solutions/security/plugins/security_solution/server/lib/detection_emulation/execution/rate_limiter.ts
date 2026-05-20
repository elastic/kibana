/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * Configuration for the emulation rate limiter.
 */
export interface EmulationRateLimiterConfig {
  /** Maximum number of commands allowed within the time window. */
  maxCommands: number;
  /** Time window in milliseconds for rate limiting. */
  windowMs: number;
  /** When true, rate limiting is disabled (all commands are allowed). */
  disabled: boolean;
}

/**
 * Result of an `acquire()` attempt.
 */
export interface RateLimitAcquireResult {
  /** True if the slot was reserved and the caller may proceed. */
  allowed: boolean;
  /** Current count of commands in the time window after acquire. */
  currentCount: number;
  /** Maximum allowed commands in the time window. */
  maxCommands: number;
  /** Time in milliseconds until the rate limit resets (only when blocked). */
  resetMs?: number;
  /** Optional error message if rate limit is exceeded. */
  error?: string;
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
 * Opaque token that callers pass back to `release()` to undo a successful
 * `acquire()`. Useful when downstream dispatch fails and the caller wants
 * to release the reserved slot.
 */
export interface AcquireToken {
  spaceId: string;
  entry: CommandEntry;
}

/**
 * Per-space sliding-window rate limiter for detection-emulation commands.
 *
 * The route invokes `acquire(spaceId, emulationId, command)` *before*
 * dispatching to the runner. Acquire is atomic: it both checks the
 * window and records the entry under one synchronous call, eliminating
 * the check-then-act race that allowed the limit to be bypassed under
 * concurrent requests on the original `check()` + `record()` API.
 *
 * If dispatch fails the caller may pass the returned `token` back to
 * `release()` to roll the count back down.
 */
export class EmulationRateLimiter {
  private readonly config: EmulationRateLimiterConfig;
  private readonly logger: Logger;
  private readonly commandHistory: Map<string, CommandEntry[]> = new Map();

  constructor(config: EmulationRateLimiterConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.logger.debug(
      `Emulation rate limiter initialized: maxCommands=${config.maxCommands}, windowMs=${config.windowMs}, disabled=${config.disabled}`
    );
  }

  /**
   * Atomically reserve a slot in the current window for `spaceId`.
   * Returns `{ allowed: true, token }` on success, or
   * `{ allowed: false, ... }` if the window is exhausted.
   *
   * Hold the returned `token` if you need to call `release()` on
   * downstream failure.
   */
  acquire(spaceId: string, emulationId: string, command: string): RateLimitAcquireResult {
    if (this.config.disabled) {
      this.logger.debug(`Rate limit acquire bypassed: rate limiting is disabled (${spaceId})`);
      return {
        allowed: true,
        currentCount: 0,
        maxCommands: this.config.maxCommands,
      };
    }

    this.cleanupExpiredEntries(spaceId);

    const entries = this.commandHistory.get(spaceId) ?? [];
    if (entries.length >= this.config.maxCommands) {
      const oldestEntry = entries[0];
      const resetMs = oldestEntry
        ? Math.max(0, this.config.windowMs - (Date.now() - oldestEntry.timestamp))
        : 0;
      const error = `Rate limit exceeded for space ${spaceId}: ${entries.length}/${this.config.maxCommands} commands in the last ${this.config.windowMs}ms. Reset in ${resetMs}ms.`;
      this.logger.warn(error);
      return {
        allowed: false,
        currentCount: entries.length,
        maxCommands: this.config.maxCommands,
        resetMs,
        error,
      };
    }

    const entry: CommandEntry = { timestamp: Date.now(), emulationId, command };
    entries.push(entry);
    this.commandHistory.set(spaceId, entries);
    this.logger.debug(
      `Rate limit acquired for space ${spaceId}: ${entries.length}/${this.config.maxCommands}`
    );
    return {
      allowed: true,
      currentCount: entries.length,
      maxCommands: this.config.maxCommands,
      token: { spaceId, entry },
    };
  }

  /**
   * Release a slot previously reserved by `acquire()`. No-op if the
   * token is missing, expired, or already removed.
   */
  release(token?: AcquireToken): void {
    if (!token || this.config.disabled) {
      return;
    }
    const entries = this.commandHistory.get(token.spaceId);
    if (!entries) {
      return;
    }
    const idx = entries.indexOf(token.entry);
    if (idx === -1) {
      return;
    }
    entries.splice(idx, 1);
    if (entries.length === 0) {
      this.commandHistory.delete(token.spaceId);
    }
    this.logger.debug(`Rate limit released for space ${token.spaceId}`);
  }

  /**
   * Test/debug helper: number of entries currently counted in the window
   * for a space. Cleans up expired entries on read.
   */
  getCurrentCount(spaceId: string): number {
    this.cleanupExpiredEntries(spaceId);
    return this.commandHistory.get(spaceId)?.length ?? 0;
  }

  /**
   * Drop entries older than `windowMs` for a given space. Called on every
   * `acquire()` and `getCurrentCount()` so the window stays bounded
   * without a separate timer.
   */
  private cleanupExpiredEntries(spaceId: string): void {
    const entries = this.commandHistory.get(spaceId);
    if (!entries || entries.length === 0) {
      return;
    }
    const cutoffTime = Date.now() - this.config.windowMs;
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
}

/**
 * Default config: 100 commands per hour, enabled.
 *
 * TODO: thread this through Kibana config (xpack.securitySolution.detectionEmulation.*)
 * once the feature graduates from experimental.
 */
export function createDefaultRateLimiterConfig(): EmulationRateLimiterConfig {
  return {
    maxCommands: 100,
    windowMs: 60 * 60 * 1000,
    disabled: false,
  };
}
