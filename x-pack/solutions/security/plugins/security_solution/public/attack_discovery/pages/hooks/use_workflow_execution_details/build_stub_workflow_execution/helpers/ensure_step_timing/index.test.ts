/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StubWorkflowExecutionState } from '../stub_execution_state';

import { ensureStepTiming, isTerminalStatus } from '.';

describe('ensure_step_timing', () => {
  const createState = (): StubWorkflowExecutionState => ({
    startedAtMs: 1000,
    stepTimingByStepId: new Map(),
  });

  describe('isTerminalStatus', () => {
    it('returns true for CANCELLED', () => {
      expect(isTerminalStatus(ExecutionStatus.CANCELLED)).toBe(true);
    });

    it('returns true for COMPLETED', () => {
      expect(isTerminalStatus(ExecutionStatus.COMPLETED)).toBe(true);
    });

    it('returns true for FAILED', () => {
      expect(isTerminalStatus(ExecutionStatus.FAILED)).toBe(true);
    });

    it('returns true for SKIPPED', () => {
      expect(isTerminalStatus(ExecutionStatus.SKIPPED)).toBe(true);
    });

    it('returns true for TIMED_OUT', () => {
      expect(isTerminalStatus(ExecutionStatus.TIMED_OUT)).toBe(true);
    });

    it('returns false for RUNNING', () => {
      expect(isTerminalStatus(ExecutionStatus.RUNNING)).toBe(false);
    });

    it('returns false for PENDING', () => {
      expect(isTerminalStatus(ExecutionStatus.PENDING)).toBe(false);
    });
  });

  describe('ensureStepTiming', () => {
    it('sets startedAtMs when step is first observed as RUNNING', () => {
      const state = createState();

      const result = ensureStepTiming({
        nowMs: 2000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.RUNNING,
      });

      expect(result.startedAtMs).toBe(2000);
    });

    it('does not overwrite startedAtMs on subsequent RUNNING observations', () => {
      const state = createState();

      ensureStepTiming({
        nowMs: 2000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.RUNNING,
      });

      const result = ensureStepTiming({
        nowMs: 3000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.RUNNING,
      });

      expect(result.startedAtMs).toBe(2000);
    });

    it('sets finishedAtMs and executionTimeMs for terminal status after RUNNING', () => {
      const state = createState();

      ensureStepTiming({
        nowMs: 2000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.RUNNING,
      });

      const result = ensureStepTiming({
        nowMs: 3500,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.COMPLETED,
      });

      expect(result.finishedAtMs).toBe(3500);
      expect(result.executionTimeMs).toBe(1500);
    });

    it('synthesizes a 500ms duration when terminal status is observed without prior RUNNING', () => {
      const state = createState();

      const result = ensureStepTiming({
        nowMs: 5000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.COMPLETED,
      });

      expect(result.startedAtMs).toBe(4500);
      expect(result.finishedAtMs).toBe(5000);
      expect(result.executionTimeMs).toBe(500);
    });

    it('does not overwrite finishedAtMs on subsequent terminal observations', () => {
      const state = createState();

      ensureStepTiming({
        nowMs: 5000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.COMPLETED,
      });

      const result = ensureStepTiming({
        nowMs: 6000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.COMPLETED,
      });

      expect(result.finishedAtMs).toBe(5000);
    });

    it('persists the last observed status', () => {
      const state = createState();

      ensureStepTiming({
        nowMs: 2000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.RUNNING,
      });

      const result = ensureStepTiming({
        nowMs: 3000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.COMPLETED,
      });

      expect(result.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('ensures executionTimeMs is at least 1', () => {
      const state = createState();
      state.stepTimingByStepId.set('step-1', { startedAtMs: 5000 });

      const result = ensureStepTiming({
        nowMs: 5000,
        state,
        stepId: 'step-1',
        status: ExecutionStatus.COMPLETED,
      });

      expect(result.executionTimeMs).toBe(1);
    });
  });
});
