/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { EmulationConcurrencyGate, createDefaultConcurrencyGateConfig } from './concurrency_gate';

const makeLogger = () => loggingSystemMock.createLogger();

describe('EmulationConcurrencyGate', () => {
  describe('single-slot enforcement', () => {
    it('admits a single in-flight reservation per space', () => {
      const gate = new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), makeLogger());

      const result = gate.acquire('space-1', 'fingerprint-1');

      expect(result.allowed).toBe(true);
      expect(result.token).toBeDefined();
      expect(gate.getInflightCount('space-1')).toBe(1);
    });

    it('rejects a second concurrent acquire and surfaces the in-flight scenario', () => {
      const gate = new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), makeLogger());

      const first = gate.acquire('space-1', 'scenario-A');
      expect(first.allowed).toBe(true);

      const second = gate.acquire('space-1', 'scenario-B');
      expect(second.allowed).toBe(false);
      expect(second.reason).toBe('concurrency_exceeded');
      expect(second.inflightScenarioFingerprint).toBe('scenario-A');
      expect(second.retryAfterSeconds).toBe(600); // 10min default staleMs
      expect(second.error).toMatch(/Concurrency limit exceeded for space space-1/);
      expect(second.error).toMatch(/scenario-A/);
    });

    it('admits a second acquire after the first releases', () => {
      const gate = new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), makeLogger());

      const first = gate.acquire('space-1', 'scenario-A');
      expect(first.allowed).toBe(true);
      gate.release(first.token);
      expect(gate.getInflightCount('space-1')).toBe(0);

      const second = gate.acquire('space-1', 'scenario-B');
      expect(second.allowed).toBe(true);
    });
  });

  describe('per-space isolation', () => {
    it('a saturated space-A does not block space-B', () => {
      const gate = new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), makeLogger());

      expect(gate.acquire('space-A', 'scenario-A').allowed).toBe(true);
      expect(gate.acquire('space-A', 'scenario-A2').allowed).toBe(false);
      expect(gate.acquire('space-B', 'scenario-B').allowed).toBe(true);
    });
  });

  describe('release safety (try/finally semantics)', () => {
    it("release() is idempotent — calling twice doesn't corrupt the slot count", () => {
      const gate = new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), makeLogger());

      const first = gate.acquire('space-1', 'scenario-A');
      gate.release(first.token);
      gate.release(first.token); // second call should be a no-op
      expect(gate.getInflightCount('space-1')).toBe(0);

      // Slot is genuinely free.
      expect(gate.acquire('space-1', 'scenario-B').allowed).toBe(true);
    });

    it('release(undefined) is a no-op (caller had no token to release)', () => {
      const gate = new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), makeLogger());

      // Simulates the caller's `let token; try { token = acquire(); }
      // catch { /* never assigned */ } finally { release(token); }`
      // happy-path equivalent: release should not throw on undefined.
      expect(() => gate.release(undefined)).not.toThrow();
      expect(gate.getInflightCount('space-1')).toBe(0);
    });
  });

  describe('stale-entry sweeper', () => {
    it('sweeps an entry older than staleMs on the next acquire (process-crash recovery)', () => {
      const gate = new EmulationConcurrencyGate(
        { maxConcurrent: 1, staleMs: 50, disabled: false },
        makeLogger()
      );

      // First acquire succeeds and is then ignored — simulates a crash
      // where the runner never reached its release().
      expect(gate.acquire('space-1', 'crashed-scenario').allowed).toBe(true);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // After staleMs the next acquire should sweep the stale entry
          // and admit the new one.
          const next = gate.acquire('space-1', 'fresh-scenario');
          expect(next.allowed).toBe(true);
          expect(gate.getInflightCount('space-1')).toBe(1);
          resolve();
        }, 60);
      });
    });

    it('does NOT sweep an entry younger than staleMs', () => {
      const gate = new EmulationConcurrencyGate(
        { maxConcurrent: 1, staleMs: 60_000, disabled: false },
        makeLogger()
      );

      gate.acquire('space-1', 'in-flight-scenario');
      // Immediate retry should still be rejected (entry is fresh).
      expect(gate.acquire('space-1', 'second-scenario').allowed).toBe(false);
    });
  });

  describe('disabled config short-circuits the gate', () => {
    it('admits unlimited concurrent acquires when disabled', () => {
      const gate = new EmulationConcurrencyGate(
        { maxConcurrent: 1, staleMs: 60_000, disabled: true },
        makeLogger()
      );

      expect(gate.acquire('space-1', 'a').allowed).toBe(true);
      expect(gate.acquire('space-1', 'b').allowed).toBe(true);
      expect(gate.acquire('space-1', 'c').allowed).toBe(true);
    });
  });

  describe('default config sanity', () => {
    it('createDefaultConcurrencyGateConfig() returns 1 concurrent + 10min stale + enabled', () => {
      const cfg = createDefaultConcurrencyGateConfig();
      expect(cfg.maxConcurrent).toBe(1);
      expect(cfg.staleMs).toBe(10 * 60 * 1000);
      expect(cfg.disabled).toBe(false);
    });
  });
});
