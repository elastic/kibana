/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildExecutionIdentity,
  assertWorkerAllowlisted,
  assertIndexInRunAsScope,
  indexMatchesPattern,
  OrchestrationIdentityError,
  DEFAULT_ORCHESTRATION_WORKERS,
} from './orchestration_identity';

describe('orchestration_identity (Family D — UNRATIFIED spike-local primitives)', () => {
  describe('D1 — execution subject ≠ approval subject', () => {
    it('separates execution identity from approval identity by default', () => {
      const id = buildExecutionIdentity();
      expect(id.executionSubject).toBe('service-account:watch-orchestrator');
      expect(id.approvalSubject).toBe('analyst');
      expect(id.isSeparated).toBe(true);
    });

    it('flags a mis-configured collapse of the two subjects', () => {
      const id = buildExecutionIdentity('same-principal', 'same-principal');
      expect(id.isSeparated).toBe(false);
    });
  });

  describe('D5 — orchestration.workers allowlist (fail-closed)', () => {
    it('admits an allowlisted worker', () => {
      expect(() => assertWorkerAllowlisted('watch-deep')).not.toThrow();
    });

    it('refuses a non-allowlisted worker', () => {
      expect(() => assertWorkerAllowlisted('watch-rogue')).toThrow(OrchestrationIdentityError);
      try {
        assertWorkerAllowlisted('watch-rogue');
      } catch (e) {
        expect((e as OrchestrationIdentityError).reason).toBe('worker-not-allowlisted');
      }
    });

    it('ships the six canonical Watch tiers in the default allowlist', () => {
      expect(DEFAULT_ORCHESTRATION_WORKERS).toEqual(
        expect.arrayContaining([
          'watch-floor',
          'watch-officer',
          'watch-dark',
          'watch-deep',
          'watch-detection',
          'watch-ad',
        ])
      );
    });
  });

  describe('D2 — run-as role scoping (fail-closed)', () => {
    it('grants a Deep Watch worker read to its own forensic telemetry', () => {
      expect(() =>
        assertIndexInRunAsScope('watch-deep', 'logs-endpoint.events.process-2025.07.20')
      ).not.toThrow();
    });

    it('denies a Deep Watch worker read outside its run-as scope', () => {
      expect(() => assertIndexInRunAsScope('watch-deep', '.security-users')).toThrow(
        OrchestrationIdentityError
      );
      try {
        assertIndexInRunAsScope('watch-deep', '.security-users');
      } catch (e) {
        expect((e as OrchestrationIdentityError).reason).toBe('index-out-of-run-as-scope');
      }
    });

    it('denies an unknown worker (no grants) fail-closed', () => {
      expect(() =>
        assertIndexInRunAsScope('watch-unknown', '.alerts-security.alerts-default')
      ).toThrow(OrchestrationIdentityError);
    });
  });

  describe('indexMatchesPattern', () => {
    it('matches exact and trailing-wildcard patterns', () => {
      expect(
        indexMatchesPattern('logs-endpoint.events.process-x', 'logs-endpoint.events.process-*')
      ).toBe(true);
      expect(
        indexMatchesPattern('.alerts-security.alerts-default', '.alerts-security.alerts-*')
      ).toBe(true);
    });

    it('does not match across a different prefix', () => {
      expect(indexMatchesPattern('.security-users', 'logs-endpoint.events.*')).toBe(false);
    });

    it('does not cross a comma boundary', () => {
      expect(indexMatchesPattern('a,b', 'a*')).toBe(false);
    });
  });
});
