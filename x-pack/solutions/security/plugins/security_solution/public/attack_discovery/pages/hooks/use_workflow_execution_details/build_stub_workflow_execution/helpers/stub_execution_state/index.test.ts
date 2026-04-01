/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOrCreateStubExecutionState, pruneStubStateCache, stubExecutionStateByRunId } from '.';

describe('stub_execution_state', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  beforeEach(() => {
    stubExecutionStateByRunId.clear();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('getOrCreateStubExecutionState', () => {
    it('returns a new state for a previously unseen workflowRunId', () => {
      const state = getOrCreateStubExecutionState('run-1');

      expect(state.startedAtMs).toBe(new Date('2024-01-01T00:00:00.000Z').getTime());
      expect(state.stepTimingByStepId.size).toBe(0);
    });

    it('returns the same state on subsequent calls for the same workflowRunId', () => {
      const first = getOrCreateStubExecutionState('run-1');
      const second = getOrCreateStubExecutionState('run-1');

      expect(first).toBe(second);
    });

    it('returns different states for different workflowRunIds', () => {
      const first = getOrCreateStubExecutionState('run-1');
      const second = getOrCreateStubExecutionState('run-2');

      expect(first).not.toBe(second);
    });

    it('prunes oldest entries when exceeding MAX_STUB_STATE_ENTRIES', () => {
      for (let i = 0; i < 101; i++) {
        getOrCreateStubExecutionState(`run-${i}`);
      }

      expect(stubExecutionStateByRunId.has('run-0')).toBe(false);
      expect(stubExecutionStateByRunId.has('run-1')).toBe(true);
      expect(stubExecutionStateByRunId.size).toBe(100);
    });
  });

  describe('pruneStubStateCache', () => {
    it('does nothing when cache size is within limit', () => {
      getOrCreateStubExecutionState('run-1');
      getOrCreateStubExecutionState('run-2');

      pruneStubStateCache();

      expect(stubExecutionStateByRunId.size).toBe(2);
    });

    it('removes the oldest entry when cache exceeds limit', () => {
      for (let i = 0; i < 102; i++) {
        stubExecutionStateByRunId.set(`run-${i}`, {
          startedAtMs: Date.now(),
          stepTimingByStepId: new Map(),
        });
      }

      pruneStubStateCache();

      expect(stubExecutionStateByRunId.has('run-0')).toBe(false);
      expect(stubExecutionStateByRunId.size).toBe(101);
    });
  });
});
