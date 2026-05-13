/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import {
  EmulationRateLimiter,
  createDefaultRateLimiterConfig,
  type EmulationRateLimiterConfig,
} from './rate_limiter';

const makeLogger = () => loggingSystemMock.createLogger();

const SPACE = 'space-1';

const baseConfig = (
  overrides: Partial<EmulationRateLimiterConfig> = {}
): EmulationRateLimiterConfig => ({
  maxCommands: 100,
  windowMs: 60 * 60 * 1000,
  disabled: false,
  ...overrides,
});

// PROD-4 dedicated test suite. The original integration tests in
// detection_emulation.integration.test.ts already cover the per-space
// bucket through the runner; this file focuses on the per-host bucket
// added in PROD-4: atomic acquire across both buckets, partial-rollback
// on per-host rejection, and backward-compat when `perHost` is omitted.

describe('EmulationRateLimiter — PROD-4 per-host bucket', () => {
  describe('per-space bucket exhaustion (PROD-4 regression for the existing path)', () => {
    it('rejects when per-space capacity is hit and surfaces no blocked_endpoints', () => {
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 2,
          perHost: { capacity: 10, windowMs: 60_000 },
        }),
        makeLogger()
      );

      expect(limiter.acquire(SPACE, 'emu-1', 'execute', ['ep-A']).allowed).toBe(true);
      expect(limiter.acquire(SPACE, 'emu-2', 'execute', ['ep-B']).allowed).toBe(true);

      const blocked = limiter.acquire(SPACE, 'emu-3', 'execute', ['ep-C']);
      expect(blocked.allowed).toBe(false);
      expect(blocked.currentCount).toBe(2);
      expect(blocked.maxCommands).toBe(2);
      expect(blocked.error).toMatch(/Rate limit exceeded for space space-1/);
      // Per-space rejection path should NOT advertise per-host info — the
      // operator's remediation is "wait for the window to roll", not
      // "swap your endpoints".
      expect(blocked.blockedEndpoints).toBeUndefined();
    });
  });

  describe('per-host bucket exhaustion', () => {
    it('rejects with the saturated endpoint named in blocked_endpoints', () => {
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 100,
          perHost: { capacity: 2, windowMs: 60_000 },
        }),
        makeLogger()
      );

      // Burn ep-A's per-host budget to capacity.
      expect(limiter.acquire(SPACE, 'emu-1', 'execute', ['ep-A']).allowed).toBe(true);
      expect(limiter.acquire(SPACE, 'emu-2', 'execute', ['ep-A']).allowed).toBe(true);

      const blocked = limiter.acquire(SPACE, 'emu-3', 'execute', ['ep-A', 'ep-B']);
      expect(blocked.allowed).toBe(false);
      expect(blocked.error).toMatch(/Per-host rate limit exceeded/);
      expect(blocked.blockedEndpoints).toEqual(['ep-A']);
      // Per-host rejection MUST NOT have advanced the per-space counter:
      // the entire reservation rolled back atomically.
      expect(limiter.getCurrentCount(SPACE)).toBe(2);
    });

    it('lists every saturated endpoint when multiple hosts are over capacity', () => {
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 100,
          perHost: { capacity: 1, windowMs: 60_000 },
        }),
        makeLogger()
      );

      // Both ep-A and ep-B at cap.
      expect(limiter.acquire(SPACE, 'emu-1', 'execute', ['ep-A']).allowed).toBe(true);
      expect(limiter.acquire(SPACE, 'emu-2', 'execute', ['ep-B']).allowed).toBe(true);

      const blocked = limiter.acquire(SPACE, 'emu-3', 'execute', ['ep-A', 'ep-B', 'ep-C']);
      expect(blocked.allowed).toBe(false);
      expect(blocked.blockedEndpoints).toEqual(['ep-A', 'ep-B']);
      // ep-C was below capacity, but the call still rejects atomically —
      // ep-C's bucket must remain at 0, no partial reservation.
      expect(limiter.getCurrentHostCount(SPACE, 'ep-C')).toBe(0);
    });

    it('rolls back the per-space reservation when the per-host check fails', () => {
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 5,
          perHost: { capacity: 1, windowMs: 60_000 },
        }),
        makeLogger()
      );

      // Saturate ep-A's per-host bucket.
      expect(limiter.acquire(SPACE, 'emu-1', 'execute', ['ep-A']).allowed).toBe(true);
      expect(limiter.getCurrentCount(SPACE)).toBe(1);

      // Targeting ep-A now must fail and leave per-space at 1, not 2.
      const blocked = limiter.acquire(SPACE, 'emu-2', 'execute', ['ep-A']);
      expect(blocked.allowed).toBe(false);
      expect(limiter.getCurrentCount(SPACE)).toBe(1);

      // A subsequent call to a fresh host should still succeed —
      // the failed attempt didn't burn the slot.
      const success = limiter.acquire(SPACE, 'emu-3', 'execute', ['ep-B']);
      expect(success.allowed).toBe(true);
      expect(limiter.getCurrentCount(SPACE)).toBe(2);
    });
  });

  describe('happy path: both buckets pass', () => {
    it('records the reservation in per-space AND every per-host bucket', () => {
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 10,
          perHost: { capacity: 5, windowMs: 60_000 },
        }),
        makeLogger()
      );

      const result = limiter.acquire(SPACE, 'emu-1', 'execute', ['ep-A', 'ep-B', 'ep-C']);
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.token).toBeDefined();
      expect(limiter.getCurrentHostCount(SPACE, 'ep-A')).toBe(1);
      expect(limiter.getCurrentHostCount(SPACE, 'ep-B')).toBe(1);
      expect(limiter.getCurrentHostCount(SPACE, 'ep-C')).toBe(1);
    });

    it('release() rolls back per-space AND every per-host bucket', () => {
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 10,
          perHost: { capacity: 1, windowMs: 60_000 },
        }),
        makeLogger()
      );

      const result = limiter.acquire(SPACE, 'emu-1', 'execute', ['ep-A', 'ep-B']);
      expect(result.allowed).toBe(true);
      // Both per-host buckets are now at capacity.
      expect(limiter.acquire(SPACE, 'emu-2', 'execute', ['ep-A']).allowed).toBe(false);

      limiter.release(result.token);

      // After release, both buckets should be free again.
      expect(limiter.getCurrentCount(SPACE)).toBe(0);
      expect(limiter.getCurrentHostCount(SPACE, 'ep-A')).toBe(0);
      expect(limiter.getCurrentHostCount(SPACE, 'ep-B')).toBe(0);
      expect(limiter.acquire(SPACE, 'emu-3', 'execute', ['ep-A']).allowed).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('skips per-host limiting when `perHost` config is omitted', () => {
      const limiter = new EmulationRateLimiter(baseConfig({ maxCommands: 100 }), makeLogger());

      // Hammer the same endpoint many times — without `perHost`, only
      // per-space applies, so this stays well under cap.
      for (let i = 0; i < 50; i++) {
        const r = limiter.acquire(SPACE, `emu-${i}`, 'execute', ['ep-only']);
        expect(r.allowed).toBe(true);
      }
      expect(limiter.getCurrentHostCount(SPACE, 'ep-only')).toBe(0);
    });

    it('skips per-host limiting when endpointIds is empty even with `perHost` configured', () => {
      // validateRule's log_injection mode and the pre-PROD-4 callers
      // pass no endpoint IDs — the per-host bucket must not engage and
      // currentCount must reflect per-space-only counting.
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 5,
          perHost: { capacity: 1, windowMs: 60_000 },
        }),
        makeLogger()
      );

      expect(limiter.acquire(SPACE, 'emu-1', 'validate-rule').allowed).toBe(true);
      expect(limiter.acquire(SPACE, 'emu-2', 'validate-rule').allowed).toBe(true);
      expect(limiter.acquire(SPACE, 'emu-3', 'validate-rule').allowed).toBe(true);
      expect(limiter.getCurrentCount(SPACE)).toBe(3);
    });

    it('disabled config short-circuits both buckets', () => {
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 1,
          disabled: true,
          perHost: { capacity: 1, windowMs: 60_000 },
        }),
        makeLogger()
      );

      // Way over both caps — disabled wins.
      for (let i = 0; i < 10; i++) {
        expect(limiter.acquire(SPACE, `emu-${i}`, 'execute', ['ep-A']).allowed).toBe(true);
      }
    });
  });

  describe('per-space isolation', () => {
    it('per-host buckets are scoped per space (same endpoint ID in two spaces)', () => {
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 100,
          perHost: { capacity: 1, windowMs: 60_000 },
        }),
        makeLogger()
      );

      expect(limiter.acquire('space-A', 'emu-1', 'execute', ['ep-A']).allowed).toBe(true);
      // ep-A in space-A is at cap; ep-A in space-B is unaffected.
      expect(limiter.acquire('space-A', 'emu-2', 'execute', ['ep-A']).allowed).toBe(false);
      expect(limiter.acquire('space-B', 'emu-3', 'execute', ['ep-A']).allowed).toBe(true);
    });
  });

  describe('default config wires per-host budget on by default', () => {
    it('createDefaultRateLimiterConfig() returns 100/space + 3/host per hour', () => {
      const cfg = createDefaultRateLimiterConfig();
      expect(cfg.maxCommands).toBe(100);
      expect(cfg.windowMs).toBe(60 * 60 * 1000);
      expect(cfg.perHost).toEqual({ capacity: 3, windowMs: 60 * 60 * 1000 });
      expect(cfg.disabled).toBe(false);
    });
  });

  // The per-call `effectiveConfig` override is the load-bearing wiring
  // for Kibana Advanced Settings. These tests lock the four mutation
  // semantics promised by `acquire()`'s docstring so a future refactor
  // that "simplifies" the override path doesn't silently regress
  // operator-tunable guardrails.
  describe('per-call `effectiveConfig` override (Advanced Settings runtime tuning)', () => {
    it('lower override `maxCommands` is enforced on the next acquire — existing entries stay but new acquires reject sooner', () => {
      const limiter = new EmulationRateLimiter(baseConfig({ maxCommands: 5 }), makeLogger());

      // Fill the bucket to 3 under the constructor-time cap of 5.
      for (let i = 0; i < 3; i++) {
        expect(limiter.acquire(SPACE, `emu-${i}`, 'execute').allowed).toBe(true);
      }

      // Operator drops the cap to 2 via Advanced Settings. The next
      // acquire under the override sees 3 ≥ 2 and rejects.
      const result = limiter.acquire(
        SPACE,
        'emu-after',
        'execute',
        [],
        baseConfig({ maxCommands: 2 })
      );
      expect(result.allowed).toBe(false);
      expect(result.maxCommands).toBe(2);
    });

    it('higher override `maxCommands` takes effect immediately', () => {
      const limiter = new EmulationRateLimiter(baseConfig({ maxCommands: 2 }), makeLogger());

      expect(limiter.acquire(SPACE, 'emu-1', 'execute').allowed).toBe(true);
      expect(limiter.acquire(SPACE, 'emu-2', 'execute').allowed).toBe(true);
      // At cap with no override.
      expect(limiter.acquire(SPACE, 'emu-3', 'execute').allowed).toBe(false);
      // Operator raises cap to 5 via Advanced Settings — next acquire passes.
      expect(
        limiter.acquire(SPACE, 'emu-3', 'execute', [], baseConfig({ maxCommands: 5 })).allowed
      ).toBe(true);
    });

    it('override `disabled: true` short-circuits even when the constructor config is enforcing', () => {
      const limiter = new EmulationRateLimiter(baseConfig({ maxCommands: 1 }), makeLogger());
      expect(limiter.acquire(SPACE, 'emu-1', 'execute').allowed).toBe(true);
      expect(limiter.acquire(SPACE, 'emu-2', 'execute').allowed).toBe(false);

      // Operator disables via Advanced Settings (note: production
      // doesn't expose `disabled` in Advanced Settings — but the
      // override path must still respect it for symmetry with
      // `this.config`, in case a future surface ever surfaces it).
      expect(
        limiter.acquire(SPACE, 'emu-3', 'execute', [], baseConfig({ disabled: true })).allowed
      ).toBe(true);
    });

    it('override `perHost.capacity` is enforced on the next acquire', () => {
      const limiter = new EmulationRateLimiter(
        baseConfig({
          maxCommands: 100,
          perHost: { capacity: 10, windowMs: 60_000 },
        }),
        makeLogger()
      );

      // Constructor capacity is 10. Drop to 1 via override; second
      // acquire on same host rejects.
      const tightOverride = baseConfig({
        maxCommands: 100,
        perHost: { capacity: 1, windowMs: 60_000 },
      });
      expect(limiter.acquire(SPACE, 'emu-1', 'execute', ['ep-A'], tightOverride).allowed).toBe(
        true
      );
      const second = limiter.acquire(SPACE, 'emu-2', 'execute', ['ep-A'], tightOverride);
      expect(second.allowed).toBe(false);
      expect(second.blockedEndpoints).toEqual(['ep-A']);
    });

    it('shorter override `windowMs` evicts older per-space entries on the next acquire', () => {
      // Window of 1h on the constructor; with an override window of 1ms,
      // any pre-existing entry is immediately stale and cleanup drops it.
      // The override-cap is 1, so the new acquire must succeed (count == 0).
      const limiter = new EmulationRateLimiter(baseConfig({ maxCommands: 100 }), makeLogger());
      expect(limiter.acquire(SPACE, 'emu-old', 'execute').allowed).toBe(true);
      expect(limiter.getCurrentCount(SPACE)).toBe(1);

      // Wait one tick so the entry is clearly older than `windowMs: 1`.
      jest.useFakeTimers().setSystemTime(Date.now() + 5);

      const tightOverride = baseConfig({ maxCommands: 1, windowMs: 1 });
      const result = limiter.acquire(SPACE, 'emu-fresh', 'execute', [], tightOverride);
      expect(result.allowed).toBe(true);
      expect(result.maxCommands).toBe(1);

      jest.useRealTimers();
    });
  });
});
