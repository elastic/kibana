/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReviewArtifact, WorkerArtifacts, WorkerExpected } from '../worker_types';
import { scoreParkedAtGate, scoreReviewsSettled, scoreRunnerCompleted } from './code_scores';

const artifacts = (overrides: Partial<WorkerArtifacts> = {}): WorkerArtifacts => ({
  runnerExecutionId: 'run-1',
  runnerStatus: 'completed',
  runnerStepCount: 3,
  seededAlertCount: 3,
  insights: [],
  persistedAttackIds: [],
  fingerprintMatchFailed: false,
  dispatchedReviewExecutionIds: [],
  reviews: [],
  outcomes: [],
  ...overrides,
});

const review = (overrides: Partial<ReviewArtifact> = {}): ReviewArtifact => ({
  executionId: 'review-1',
  status: 'waiting_for_input',
  parked: true,
  verdict: 'true_positive',
  investigationOpened: true,
  steps: [],
  ...overrides,
});

const expected = {} as WorkerExpected;

describe('scoreRunnerCompleted', () => {
  it('passes a completed runner that ran steps', () => {
    expect(scoreRunnerCompleted(expected, artifacts()).score).toBe(1);
  });

  it('fails a runner that timed out, labelled with the wait', () => {
    const result = scoreRunnerCompleted(
      expected,
      artifacts({ runnerStatus: 'running', runnerTimedOutAfterMs: 600_000 })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('timed out after 10m');
  });

  it('fails a runner that finished without running any step, even when completed', () => {
    const result = scoreRunnerCompleted(expected, artifacts({ runnerStepCount: 0 }));
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('no step executions');
  });
});

describe('scoreReviewsSettled', () => {
  it('fails a review whose wait ran out', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({ reviews: [review({ parked: false, timedOutAfterMs: 300_000 })] })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('timed out after 5m');
  });

  it('passes reviews that settled', () => {
    expect(scoreReviewsSettled(expected, artifacts({ reviews: [review()] })).score).toBe(1);
  });
});

describe('scoreParkedAtGate', () => {
  const tpExpected = { verdict: 'true_positive' } as unknown as WorkerExpected;

  it('does not accept a pending proposal as a substitute for a parked review', () => {
    const result = scoreParkedAtGate(
      tpExpected,
      artifacts({
        reviews: [review({ parked: false, proposalStatus: 'pending', status: 'waiting' })],
      })
    );
    expect(result.score).toBe(0);
  });

  it('passes a review parked at the gate', () => {
    expect(scoreParkedAtGate(tpExpected, artifacts({ reviews: [review()] })).score).toBe(1);
  });
});
