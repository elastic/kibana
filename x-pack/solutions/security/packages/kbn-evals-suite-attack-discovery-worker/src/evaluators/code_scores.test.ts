/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReviewArtifact, WorkerArtifacts, WorkerExpected } from '../worker_types';
import {
  scoreAlertsRetrieved,
  scoreFingerprintsDispatched,
  scoreOutcomeReported,
  scoreParkedAtGate,
  scoreReviewsSettled,
  scoreRunnerCompleted,
  scoreStageModelResolved,
  stageUsageMetadata,
} from './code_scores';

const NO_GENERATION = {
  discoveryCount: 0,
  connectorIds: [],
  models: [],
  discoveriesWithoutConnector: 0,
};

const generated = (overrides: Partial<WorkerArtifacts['generationUsage']> = {}) => ({
  discoveryCount: 2,
  connectorIds: ['gen-model'],
  models: ['gen-model-name'],
  discoveriesWithoutConnector: 0,
  ...overrides,
});

const analysed = (overrides: Partial<NonNullable<ReviewArtifact['analysis']>> = {}) => ({
  childExecutionId: 'child-1',
  connectorIds: ['review-model'],
  inputTokens: 100,
  outputTokens: 20,
  cachedTokens: 10,
  ...overrides,
});

const artifacts = (overrides: Partial<WorkerArtifacts> = {}): WorkerArtifacts => ({
  runnerExecutionId: 'run-1',
  runnerStatus: 'completed',
  runnerStepCount: 3,
  seededAlertCount: 3,
  seededAlertIds: [],
  openAlertIds: [],
  insights: [],
  generationUsage: NO_GENERATION,
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

describe('scoreAlertsRetrieved', () => {
  const base = { seededAlertIds: ['a', 'b'], openAlertIds: ['a', 'b'], alertsAnalyzed: 2 };

  it('passes when the open set equals the seeded set and the count matches', () => {
    expect(scoreAlertsRetrieved(expected, artifacts(base)).score).toBe(1);
  });

  it('fails when an unseeded alert is open, even though the count covers the seeded ones', () => {
    const result = scoreAlertsRetrieved(
      expected,
      artifacts({ ...base, openAlertIds: ['a', 'b', 'leftover'], alertsAnalyzed: 3 })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('1 unexpected open alerts');
  });

  it('fails when more alerts were analyzed than seeded', () => {
    expect(scoreAlertsRetrieved(expected, artifacts({ ...base, alertsAnalyzed: 3 })).score).toBe(0);
  });

  it('fails when an attack cites an alert that was never seeded', () => {
    const insight = {
      id: 'x',
      alertIds: ['zzz'],
      title: '',
      summaryMarkdown: '',
      detailsMarkdown: '',
    };
    expect(scoreAlertsRetrieved(expected, artifacts({ ...base, insights: [insight] })).score).toBe(
      0
    );
  });

  it('is MISSING without a reported count', () => {
    expect(
      scoreAlertsRetrieved(expected, artifacts({ ...base, alertsAnalyzed: undefined })).label
    ).toBe('MISSING');
  });
});

describe('scoreFingerprintsDispatched', () => {
  const attacks = { persistedAttackIds: ['x'] };

  it('fails when an attack matched an existing fingerprint', () => {
    const result = scoreFingerprintsDispatched(
      expected,
      artifacts({
        ...attacks,
        fingerprintReviewCount: 1,
        fingerprintMatchedCount: 1,
        dispatchedReviewExecutionIds: ['r'],
      })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('existing fingerprint');
  });

  it('does not pass a 0/0 review count for persisted attacks', () => {
    expect(
      scoreFingerprintsDispatched(expected, artifacts({ ...attacks, fingerprintReviewCount: 0 }))
        .score
    ).toBe(0);
  });

  it('passes when every attack was dispatched and none matched', () => {
    expect(
      scoreFingerprintsDispatched(
        expected,
        artifacts({
          ...attacks,
          fingerprintReviewCount: 1,
          fingerprintMatchedCount: 0,
          dispatchedReviewExecutionIds: ['r'],
        })
      ).score
    ).toBe(1);
  });
});

describe('scoreOutcomeReported', () => {
  const event = (stepId: string, attacksPersisted?: number) => ({
    stepId,
    status: 'completed',
    runOutcome: 'produced',
    input: attacksPersisted === undefined ? {} : { attacks_persisted: attacksPersisted },
  });
  const outcomes = (count?: number) => [
    event('report_run_completed', count),
    event('report_worker_run_completed'),
  ];

  it('fails when the reported persisted count disagrees with the persisted attacks', () => {
    const result = scoreOutcomeReported(
      expected,
      artifacts({ persistedAttackIds: ['x'], outcomes: outcomes(2) })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('reported 2 persisted attacks, 1 found');
  });

  it('fails when more reviews were dispatched than attacks persisted', () => {
    const result = scoreOutcomeReported(
      expected,
      artifacts({
        persistedAttackIds: ['x'],
        dispatchedReviewExecutionIds: ['r1', 'r2'],
        outcomes: outcomes(1),
      })
    );
    expect(result.score).toBe(0);
  });

  it('is MISSING when the event carries no count', () => {
    expect(scoreOutcomeReported(expected, artifacts({ outcomes: outcomes(undefined) })).label).toBe(
      'MISSING'
    );
  });

  it('passes when counts agree', () => {
    expect(
      scoreOutcomeReported(
        expected,
        artifacts({
          persistedAttackIds: ['x'],
          dispatchedReviewExecutionIds: ['r1'],
          outcomes: outcomes(1),
        })
      ).score
    ).toBe(1);
  });
});

describe('scoreStageModelResolved', () => {
  const score = scoreStageModelResolved({
    generationModel: 'gen-model',
    reviewModel: 'review-model',
  });
  const withBoth = (a: Partial<WorkerArtifacts> = {}) =>
    artifacts({
      generationUsage: generated(),
      reviews: [review({ analysis: analysed() })],
      ...a,
    });

  it('passes when both stages resolved to the planned endpoints', () => {
    expect(score(expected, withBoth()).score).toBe(1);
  });

  it('fails when generation resolved to a different endpoint than planned', () => {
    const result = score(
      expected,
      withBoth({ generationUsage: generated({ connectorIds: ['other'] }) })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('generation ran on other, planned gen-model');
  });

  it('fails when the review analysis resolved to a different endpoint than planned', () => {
    const result = score(
      expected,
      withBoth({ reviews: [review({ analysis: analysed({ connectorIds: ['other'] }) })] })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('ran on other, planned review-model');
  });

  it('fails, not passes, when the review model cannot be determined', () => {
    const result = score(
      expected,
      withBoth({
        reviews: [
          review({
            analysis: analysed({ connectorIds: [], unresolvedReason: 'no usage reported' }),
          }),
        ],
      })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('undeterminable');
  });

  it('fails when a review recorded no analysis at all', () => {
    expect(score(expected, withBoth({ reviews: [review()] })).score).toBe(0);
  });

  it('fails when a persisted discovery carries no connector id', () => {
    const result = score(
      expected,
      withBoth({ generationUsage: generated({ discoveriesWithoutConnector: 1 }) })
    );
    expect(result.score).toBe(0);
  });

  it('is N/A when no stage produced output', () => {
    const result = score(expected, artifacts());
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('stamps the resolved models and review tokens, and marks generation tokens unavailable', () => {
    expect(score(expected, withBoth()).metadata).toEqual({
      'generation.resolved_model': 'gen-model',
      'generation.reported_model_names': 'gen-model-name',
      'generation.tokens_available': false,
      'review.resolved_model': 'review-model',
      'review.input_tokens': 100,
      'review.output_tokens': 20,
      'review.cached_tokens': 10,
    });
    expect(stageUsageMetadata(artifacts())).not.toHaveProperty('review.input_tokens');
  });
});
