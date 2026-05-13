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
});
