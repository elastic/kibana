/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * Configuration for the emulation concurrency gate.
 */
export interface EmulationConcurrencyGateConfig {
  /**
   * Maximum number of concurrent real-execution validateRule scenarios
   * permitted per Kibana space. Default 1.
   */
  maxConcurrent: number;
  /**
   * Stale-entry threshold in milliseconds. An in-flight reservation
   * older than this is considered abandoned (process crash, runaway
   * runner, etc.) and the sweeper auto-releases it on the next
   * `acquire()` so a stuck entry can't permanently block the gate.
   * Default 10 minutes.
   */
  staleMs: number;
  /**
   * When true the gate is bypassed and every acquire succeeds. Useful
   * for tests and the
   * `xpack.securitySolution.detectionEmulation.concurrencyGate.disabled`
   * escape hatch.
   */
  disabled: boolean;
}

/**
 * Result of an `acquire()` attempt.
 */
export interface ConcurrencyGateAcquireResult {
  /** True if the slot was reserved and the caller may proceed. */
  allowed: boolean;
  /**
   * Reason code surfaced when `allowed` is false. Always
   * `concurrency_exceeded` in the v1 implementation.
   */
  reason?: 'concurrency_exceeded';
  /**
   * Identifier of the in-flight scenario currently holding the slot.
   * Surfaced so the operator can correlate the rejection with the
   * specific run that needs to drain.
   */
  inflightScenarioFingerprint?: string;
  /**
   * Retry-After hint in seconds. Conservative: matches the stale
   * window so the caller doesn't hot-spin on a slow scenario.
   */
  retryAfterSeconds?: number;
  /** Optional human-readable error message. */
  error?: string;
  /** Token for `release()` if acquire succeeded. */
  token?: ConcurrencyAcquireToken;
}

/**
 * Tracked in-flight reservation entry.
 */
interface ConcurrencyEntry {
  scenarioFingerprint: string;
  acquiredAt: number;
}

/**
 * Opaque token returned by `acquire()`. Pass back to `release()` in a
 * `try/finally` (or equivalent) so the slot is freed regardless of
 * whether the scenario succeeded or failed.
 */
export interface ConcurrencyAcquireToken {
  spaceId: string;
  entry: ConcurrencyEntry;
}

/**
 * Per-space in-memory concurrency gate for detection-emulation
 * `validateRule` real_execution scenarios (PROD-5).
 *
 * The gate fires AFTER the allowlist and rate limiter (so we don't
 * waste work on runs that other gates would reject) and BEFORE the
 * runner dispatches any payload. Holding a slot through the runner's
 * full payload-iteration protects the host-side response-action queue
 * from a second multi-payload scenario landing on top of an in-flight
 * one in the same space.
 *
 * Failure modes covered by this v1:
 *   - Sequential bursts in the same space: a second call while the
 *     first is in-flight is rejected with a 429 + `concurrency_exceeded`.
 *   - Process crash during a scenario: the next acquire after `staleMs`
 *     auto-sweeps the abandoned entry so the gate doesn't wedge.
 *
 * Failure modes EXPLICITLY out of scope, deferred to Phase 2 / GA:
 *   - FIFO queueing of rejected calls (today they get a hard reject
 *     with a Retry-After hint; the caller decides whether to back off
 *     or surface the rejection to the user).
 *   - Cross-node coordination (the gate is per-Kibana-process; on a
 *     multi-instance cluster the effective limit is N×maxConcurrent).
 *     Will require a saved-object lock or distributed coordination
 *     primitive when the feature graduates to GA.
 */
export class EmulationConcurrencyGate {
  private readonly config: EmulationConcurrencyGateConfig;
  private readonly logger: Logger;
  private readonly inflight: Map<string, ConcurrencyEntry[]> = new Map();

  constructor(config: EmulationConcurrencyGateConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.logger.debug(
      `Emulation concurrency gate initialized: maxConcurrent=${config.maxConcurrent}, staleMs=${config.staleMs}, disabled=${config.disabled}`
    );
  }

  /**
   * Atomically reserve a concurrency slot for `spaceId`. Returns
   * `{ allowed: true, token }` on success, or `{ allowed: false, ... }`
   * if the space is already at `maxConcurrent`. The stale sweeper runs
   * before the check so a previously-leaked entry that's older than
   * `staleMs` is collected on the spot rather than blocking forever.
   *
   * `scenarioFingerprint` is recorded with the entry so when a later
   * call is rejected the response can name the in-flight scenario the
   * caller is contending with.
   */
  acquire(spaceId: string, scenarioFingerprint: string): ConcurrencyGateAcquireResult {
    if (this.config.disabled) {
      this.logger.debug(`Concurrency gate bypassed: gate is disabled (${spaceId})`);
      return { allowed: true };
    }

    this.sweepStale(spaceId);

    const entries = this.inflight.get(spaceId) ?? [];
    if (entries.length >= this.config.maxConcurrent) {
      const inflightScenarioFingerprint = entries[0]?.scenarioFingerprint;
      const retryAfterSeconds = Math.ceil(this.config.staleMs / 1000);
      const error = `Concurrency limit exceeded for space ${spaceId}: ${entries.length}/${
        this.config.maxConcurrent
      } real_execution scenario(s) in flight. In-flight scenario: ${
        inflightScenarioFingerprint ?? 'unknown'
      }. Retry after ${retryAfterSeconds}s.`;
      this.logger.warn(error);
      return {
        allowed: false,
        reason: 'concurrency_exceeded',
        inflightScenarioFingerprint,
        retryAfterSeconds,
        error,
      };
    }

    const entry: ConcurrencyEntry = { scenarioFingerprint, acquiredAt: Date.now() };
    entries.push(entry);
    this.inflight.set(spaceId, entries);
    this.logger.debug(
      `Concurrency slot acquired for space ${spaceId}: ${entries.length}/${this.config.maxConcurrent} (scenario=${scenarioFingerprint})`
    );
    return {
      allowed: true,
      token: { spaceId, entry },
    };
  }

  /**
   * Release a slot previously reserved by `acquire()`. No-op if the
   * token is missing, expired, or already removed (e.g. swept by the
   * stale collector). Safe to call from a `finally` block on any path.
   */
  release(token?: ConcurrencyAcquireToken): void {
    if (!token || this.config.disabled) {
      return;
    }
    const entries = this.inflight.get(token.spaceId);
    if (!entries) {
      return;
    }
    const idx = entries.indexOf(token.entry);
    if (idx === -1) {
      return;
    }
    entries.splice(idx, 1);
    if (entries.length === 0) {
      this.inflight.delete(token.spaceId);
    }
    this.logger.debug(
      `Concurrency slot released for space ${token.spaceId} (scenario=${token.entry.scenarioFingerprint})`
    );
  }

  /**
   * Test/debug helper: number of in-flight reservations currently
   * held for a space. Sweeps stale entries on read.
   */
  getInflightCount(spaceId: string): number {
    this.sweepStale(spaceId);
    return this.inflight.get(spaceId)?.length ?? 0;
  }

  /**
   * Operator-driven cancel: drops every in-flight reservation for one
   * space (or every space when `spaceId` is omitted) and emits one
   * `WARN`-level audit log entry per cancelled scenario so SIEM rules
   * can correlate the halt event with the original dispatch.
   *
   * Pairs with the runtime kill switch
   * (`detectionEmulation.realExecutionEnabled`): the kill switch blocks
   * NEW dispatches; this method releases the slots already in flight
   * so a fresh `acquire()` in the same space succeeds immediately
   * after the operator flips the switch. The two together implement a
   * "stop everything" story without restarting Kibana.
   *
   * Returns the count of slots actually released. Calling on a space
   * with no in-flight reservations is a no-op (returns 0). Safe to
   * invoke when `disabled: true` — the gate has nothing tracked, so
   * nothing is cancelled.
   *
   * Note: this method only frees the gate's reservation. It does NOT
   * try to terminate the dispatched response action on the EDR side
   * (the EDR has its own queue that the runner cannot reach into
   * after `runner.run(cmd)` returns). The companion halt route is
   * responsible for surfacing the cancellation to the SOC, who can
   * decide whether to follow up with the EDR-side cancel command.
   *
   * Closes register row #10 residual / R-N3 — see
   * `detection-emulation-production-risk-analysis.html`.
   */
  cancelAllInflight(spaceId?: string): { cancelled: number } {
    if (this.config.disabled) {
      this.logger.debug(
        `Concurrency gate cancelAllInflight no-op: gate is disabled${
          spaceId ? ` (space=${spaceId})` : ''
        }`
      );
      return { cancelled: 0 };
    }
    const targetSpaces = spaceId ? [spaceId] : Array.from(this.inflight.keys());
    let cancelled = 0;
    for (const space of targetSpaces) {
      const entries = this.inflight.get(space);
      if (entries && entries.length > 0) {
        for (const entry of entries) {
          const heldMs = Date.now() - entry.acquiredAt;
          this.logger.warn(
            `[detection-emulation-halt] Concurrency slot cancelled for space ${space}: scenario=${entry.scenarioFingerprint} held for ${heldMs}ms`
          );
          cancelled++;
        }
        this.inflight.delete(space);
      }
    }
    if (cancelled > 0) {
      this.logger.warn(
        `[detection-emulation-halt] Cancelled ${cancelled} in-flight emulation reservation(s)${
          spaceId ? ` for space ${spaceId}` : ' across all spaces'
        }`
      );
    } else {
      this.logger.debug(
        `Concurrency gate cancelAllInflight: nothing to cancel${
          spaceId ? ` (space=${spaceId})` : ''
        }`
      );
    }
    return { cancelled };
  }

  /**
   * Drop any in-flight entry older than `staleMs` for the given
   * space. This is the safety net for process crashes / runaway
   * runners that never reach their `release()` — without it the gate
   * could wedge a space permanently after a single bad run.
   */
  private sweepStale(spaceId: string): void {
    const entries = this.inflight.get(spaceId);
    if (!entries || entries.length === 0) {
      return;
    }
    const cutoffTime = Date.now() - this.config.staleMs;
    const validEntries = entries.filter((entry) => {
      if (entry.acquiredAt > cutoffTime) {
        return true;
      }
      this.logger.warn(
        `Concurrency gate sweeping stale entry for space ${spaceId}: scenario=${
          entry.scenarioFingerprint
        } held for ${Date.now() - entry.acquiredAt}ms (>= ${this.config.staleMs}ms staleMs)`
      );
      return false;
    });
    if (validEntries.length === entries.length) {
      return;
    }
    if (validEntries.length === 0) {
      this.inflight.delete(spaceId);
    } else {
      this.inflight.set(spaceId, validEntries);
    }
  }
}

/**
 * Default config: 1 concurrent real_execution per space, 10-minute
 * stale window, gate enabled.
 *
 * Rationale for `maxConcurrent: 1`: a single validateRule
 * real_execution iterates over multiple payloads × multiple
 * endpoints and waits for telemetry to flow back, taking on the
 * order of minutes per scenario. A second concurrent run in the same
 * space competes for the per-host response-action queue (PROD-4
 * defends one slot at a time) AND drowns the audit trail with
 * interleaved comments. If a tenant legitimately needs to validate
 * multiple rules in parallel they should run them in different
 * Kibana spaces.
 *
 * Rationale for `staleMs: 10min`: validateRule's worst-case
 * `wallBudgetMs` is bounded around 5 minutes by the route schema
 * (the sum of payload-dispatch + telemetry-poll), so 10 minutes is
 * 2× the worst case — generous enough to never sweep a healthy run
 * but tight enough to recover within one user-coffee-break of a
 * crash.
 *
 * TODO: thread this through Kibana config (xpack.securitySolution.detectionEmulation.*)
 * once the feature graduates from experimental.
 */
export function createDefaultConcurrencyGateConfig(): EmulationConcurrencyGateConfig {
  return {
    maxConcurrent: 1,
    staleMs: 10 * 60 * 1000,
    disabled: false,
  };
}
