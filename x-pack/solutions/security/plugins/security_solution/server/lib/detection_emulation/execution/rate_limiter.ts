/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * Configuration for the emulation rate limiter.
 *
 * The rate limiter provides temporal throttling to prevent abuse of emulation commands,
 * working alongside other safety controls (feature flag, RBAC, allowlist, audit log).
 */
export interface EmulationRateLimiterConfig {
  /**
   * Maximum number of commands allowed within the time window.
   */
  maxCommands: number;

  /**
   * Time window in milliseconds for rate limiting.
   */
  windowMs: number;

  /**
   * When true, rate limiting is disabled (all commands are allowed).
   */
  disabled: boolean;
}

/**
 * Result of a rate limit check.
 */
export interface RateLimitCheckResult {
  /**
   * True if the command is allowed, false if rate limit exceeded.
   */
  allowed: boolean;

  /**
   * Current count of commands in the time window.
   */
  currentCount: number;

  /**
   * Maximum allowed commands in the time window.
   */
  maxCommands: number;

  /**
   * Time in milliseconds until the rate limit resets.
   */
  resetMs?: number;

  /**
   * Optional error message if rate limit is exceeded.
   */
  error?: string;
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
 * Rate limiter for detection emulation commands.
 *
 * This provides temporal throttling to prevent abuse of emulation commands.
 * It works alongside:
 * - Feature flag (wholesale enable/disable)
 * - Per-command RBAC (authorization control)
 * - Host allowlist (endpoint-level restrictions)
 * - Audit logger (tracking and accountability)
 *
 * The rate limiter tracks commands per space and enforces a sliding window
 * limit (e.g., 100 commands per hour).
 */
export class EmulationRateLimiter {
  private readonly config: EmulationRateLimiterConfig;
  private readonly logger: Logger;
  private readonly commandHistory: Map<string, CommandEntry[]>;

  constructor(config: EmulationRateLimiterConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.commandHistory = new Map();

    this.logger.debug(
      `Emulation rate limiter initialized: maxCommands=${config.maxCommands}, windowMs=${config.windowMs}, disabled=${config.disabled}`
    );
  }

  /**
   * Check if a command is allowed under the current rate limit.
   * This method only checks, it does not record the command.
   *
   * @param spaceId - The space ID for rate limiting scope
   * @returns Rate limit check result
   */
  check(spaceId: string): RateLimitCheckResult {
    // If rate limiting is disabled, allow all commands
    if (this.config.disabled) {
      this.logger.debug(`Rate limit check passed: rate limiting is disabled for space ${spaceId}`);

      return {
        allowed: true,
        currentCount: 0,
        maxCommands: this.config.maxCommands,
      };
    }

    // Clean up expired entries for this space
    this.cleanupExpiredEntries(spaceId);

    // Get current command count in the time window
    const entries = this.commandHistory.get(spaceId) || [];
    const currentCount = entries.length;

    // Check if limit is exceeded
    if (currentCount >= this.config.maxCommands) {
      const oldestEntry = entries[0];
      const resetMs = oldestEntry
        ? Math.max(0, this.config.windowMs - (Date.now() - oldestEntry.timestamp))
        : 0;

      const error = `Rate limit exceeded for space ${spaceId}: ${currentCount}/${this.config.maxCommands} commands in the last ${this.config.windowMs}ms. Reset in ${resetMs}ms.`;

      this.logger.warn(error);

      return {
        allowed: false,
        currentCount,
        maxCommands: this.config.maxCommands,
        resetMs,
        error,
      };
    }

    this.logger.debug(
      `Rate limit check passed for space ${spaceId}: ${currentCount}/${this.config.maxCommands} commands`
    );

    return {
      allowed: true,
      currentCount,
      maxCommands: this.config.maxCommands,
    };
  }

  /**
   * Record a command execution for rate limiting.
   * Should be called after successfully dispatching a command.
   *
   * @param spaceId - The space ID for rate limiting scope
   * @param emulationId - The emulation ID
   * @param command - The command that was executed
   */
  record(spaceId: string, emulationId: string, command: string): void {
    if (this.config.disabled) {
      this.logger.debug(
        `Skipping rate limit record: rate limiting is disabled for space ${spaceId}`
      );
      return;
    }

    const entry: CommandEntry = {
      timestamp: Date.now(),
      emulationId,
      command,
    };

    const entries = this.commandHistory.get(spaceId) || [];
    entries.push(entry);
    this.commandHistory.set(spaceId, entries);

    this.logger.debug(
      `Recorded command for rate limiting in space ${spaceId}: ${command} (emulation: ${emulationId}), total: ${entries.length}/${this.config.maxCommands}`
    );
  }

  /**
   * Check and record a command in a single operation.
   * This is a convenience method that combines check() and record().
   *
   * @param spaceId - The space ID for rate limiting scope
   * @param emulationId - The emulation ID
   * @param command - The command to check and record
   * @returns Rate limit check result
   */
  checkAndRecord(spaceId: string, emulationId: string, command: string): RateLimitCheckResult {
    const result = this.check(spaceId);

    if (result.allowed) {
      this.record(spaceId, emulationId, command);
    }

    return result;
  }

  /**
   * Clean up expired command entries for a specific space.
   * Removes entries older than the configured time window.
   *
   * @param spaceId - The space ID to clean up
   */
  private cleanupExpiredEntries(spaceId: string): void {
    const entries = this.commandHistory.get(spaceId);
    if (!entries || entries.length === 0) {
      return;
    }

    const cutoffTime = Date.now() - this.config.windowMs;
    const validEntries = entries.filter((entry) => entry.timestamp > cutoffTime);

    if (validEntries.length !== entries.length) {
      const removedCount = entries.length - validEntries.length;
      this.logger.debug(
        `Cleaned up ${removedCount} expired rate limit entries for space ${spaceId}`
      );

      if (validEntries.length === 0) {
        this.commandHistory.delete(spaceId);
      } else {
        this.commandHistory.set(spaceId, validEntries);
      }
    }
  }

  /**
   * Clean up all expired entries across all spaces.
   * This should be called periodically to prevent memory leaks.
   */
  cleanupAllExpiredEntries(): void {
    const spaceIds = Array.from(this.commandHistory.keys());
    let totalRemoved = 0;

    for (const spaceId of spaceIds) {
      const beforeCount = this.commandHistory.get(spaceId)?.length || 0;
      this.cleanupExpiredEntries(spaceId);
      const afterCount = this.commandHistory.get(spaceId)?.length || 0;
      totalRemoved += beforeCount - afterCount;
    }

    if (totalRemoved > 0) {
      this.logger.debug(`Cleaned up ${totalRemoved} expired rate limit entries across all spaces`);
    }
  }

  /**
   * Get the current command count for a space.
   *
   * @param spaceId - The space ID to check
   * @returns Current number of commands in the time window
   */
  getCurrentCount(spaceId: string): number {
    this.cleanupExpiredEntries(spaceId);
    return this.commandHistory.get(spaceId)?.length || 0;
  }

  /**
   * Reset the rate limit for a specific space.
   * Clears all command history for that space.
   *
   * @param spaceId - The space ID to reset
   */
  reset(spaceId: string): void {
    const previousCount = this.commandHistory.get(spaceId)?.length || 0;
    this.commandHistory.delete(spaceId);

    this.logger.info(`Reset rate limit for space ${spaceId} (removed ${previousCount} entries)`);
  }

  /**
   * Reset the rate limit for all spaces.
   * Clears all command history.
   */
  resetAll(): void {
    const totalEntries = Array.from(this.commandHistory.values()).reduce(
      (sum, entries) => sum + entries.length,
      0
    );
    this.commandHistory.clear();

    this.logger.info(`Reset rate limit for all spaces (removed ${totalEntries} entries)`);
  }

  /**
   * Get the current rate limiter configuration.
   * Returns a copy to prevent external mutation.
   *
   * @returns Current rate limiter configuration
   */
  getConfig(): Readonly<EmulationRateLimiterConfig> {
    return {
      maxCommands: this.config.maxCommands,
      windowMs: this.config.windowMs,
      disabled: this.config.disabled,
    };
  }

  /**
   * Update the rate limiter configuration.
   * This does not clear existing command history.
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<EmulationRateLimiterConfig>): void {
    const previous = { ...this.config };

    if (config.maxCommands !== undefined) {
      this.config.maxCommands = config.maxCommands;
    }
    if (config.windowMs !== undefined) {
      this.config.windowMs = config.windowMs;
    }
    if (config.disabled !== undefined) {
      this.config.disabled = config.disabled;
    }

    this.logger.info(
      `Rate limiter configuration updated: maxCommands ${previous.maxCommands}->${this.config.maxCommands}, windowMs ${previous.windowMs}->${this.config.windowMs}, disabled ${previous.disabled}->${this.config.disabled}`
    );
  }

  /**
   * Get statistics about the rate limiter state.
   *
   * @returns Statistics object with space count and total entries
   */
  getStats(): {
    spaceCount: number;
    totalEntries: number;
    entriesBySpace: Record<string, number>;
  } {
    this.cleanupAllExpiredEntries();

    const entriesBySpace: Record<string, number> = {};
    let totalEntries = 0;

    for (const [spaceId, entries] of this.commandHistory.entries()) {
      entriesBySpace[spaceId] = entries.length;
      totalEntries += entries.length;
    }

    return {
      spaceCount: this.commandHistory.size,
      totalEntries,
      entriesBySpace,
    };
  }
}

/**
 * Create a default emulation rate limiter configuration.
 * Default: 100 commands per hour, enabled.
 *
 * @returns Default rate limiter configuration
 */
export function createDefaultRateLimiterConfig(): EmulationRateLimiterConfig {
  return {
    maxCommands: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    disabled: false,
  };
}

/**
 * Create a permissive rate limiter configuration for testing/development.
 * Default: rate limiting disabled.
 *
 * @returns Permissive rate limiter configuration
 */
export function createPermissiveRateLimiterConfig(): EmulationRateLimiterConfig {
  return {
    maxCommands: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    disabled: true,
  };
}

/**
 * Create a strict rate limiter configuration for production.
 * Default: 50 commands per hour, enabled.
 *
 * @returns Strict rate limiter configuration
 */
export function createStrictRateLimiterConfig(): EmulationRateLimiterConfig {
  return {
    maxCommands: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    disabled: false,
  };
}
