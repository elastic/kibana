/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReviewArtifact, WorkerArtifacts, WorkerExpected } from '../worker_types';
import {
  MODEL_FAULT_LABEL,
  scoreAlertsRetrieved,
  scoreBlindReviewAbstained,
  scoreDiscoveriesPersisted,
  scoreFingerprintsDispatched,
  scoreOutcomeReported,
  scoreOneReviewPerAttack,
  scoreParkedAtGate,
  scoreReviewsSettled,
  scoreRunnerCompleted,
  scoreStageModelResolved,
  scoreVerdictMatchesGold,
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

  it('fails a review whose execution failed, naming the status and the error', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({
        reviews: [
          review({ parked: false, status: 'failed', error: 'analysis step errored: boom' }),
        ],
      })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('review failed');
    expect(result.explanation).toContain('analysis step errored: boom');
  });

  it.each([
    'The model (claude-opus-5-5) refused to complete the response, so generation stopped',
    'The response was stopped by the provider content filter (finish_reason: content_filter).',
  ])('labels a review that failed on a model refusal MODEL_FAULT: %s', (error) => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({ reviews: [review({ parked: false, status: 'failed', error })] })
    );
    expect(result).toMatchObject({ score: 0, label: MODEL_FAULT_LABEL });
    expect(result.explanation).toContain('review failed');
    expect(result.explanation).toContain(error);
  });

  it('still fails a failed review whose error is not a refusal', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({ reviews: [review({ parked: false, status: 'failed', error: 'boom' })] })
    );
    expect(result.score).toBe(0);
    expect(result.label).toBeUndefined();
  });

  it('still fails a cancelled review whose error reads like a refusal', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({
        reviews: [
          review({
            parked: false,
            status: 'cancelled',
            error: 'refused to complete the response',
          }),
        ],
      })
    );
    expect(result.score).toBe(0);
    expect(result.label).toBeUndefined();
  });

  it('does not label the row MODEL_FAULT when a refused review sits beside a pipeline failure', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({
        reviews: [
          review({ status: 'failed', parked: false, error: 'refused to complete the response' }),
          review({ executionId: 'review-2', status: 'failed', parked: false, error: 'boom' }),
        ],
      })
    );
    expect(result.score).toBe(0);
    expect(result.label).toBeUndefined();
  });

  it('keeps a timed-out review a plain failure even when its error is a refusal', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({
        reviews: [
          review({
            parked: false,
            status: 'failed',
            timedOutAfterMs: 300_000,
            error: 'refused to complete the response',
          }),
        ],
      })
    );
    expect(result.score).toBe(0);
    expect(result.label).toBeUndefined();
  });

  it('fails a failed review that has no error message', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({ reviews: [review({ parked: false, status: 'failed' })] })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('review failed');
  });

  it('fails a review that was cancelled while it was not parked at the gate', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({ reviews: [review({ parked: false, status: 'cancelled' })] })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('review cancelled');
  });

  it('fails the row when one of several reviews failed', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({
        reviews: [review(), review({ executionId: 'review-2', parked: false, status: 'failed' })],
      })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('review-2');
  });

  it('passes a completed review', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({ reviews: [review({ parked: false, status: 'completed' })] })
    );
    expect(result.score).toBe(1);
  });

  it('passes a review that is waiting at the analyst gate', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({ reviews: [review({ parked: true, status: 'waiting_for_input' })] })
    );
    expect(result.score).toBe(1);
  });

  it('reports a timeout as a timeout even when the execution also carries a failed status', () => {
    const result = scoreReviewsSettled(
      expected,
      artifacts({
        reviews: [review({ parked: false, status: 'failed', timedOutAfterMs: 300_000 })],
      })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('timed out after 5m');
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

  describe('when generation refused or failed', () => {
    const refused = {
      ...base,
      alertsAnalyzed: 0,
      generationFault: { kind: 'refused' as const, message: 'the model refused' },
    };

    it.each(['refused', 'failed'] as const)(
      'labels a short count MODEL_FAULT on a %s generation',
      (kind) => {
        const result = scoreAlertsRetrieved(
          expected,
          artifacts({ ...refused, generationFault: { kind } })
        );
        expect(result).toMatchObject({ score: 0, label: MODEL_FAULT_LABEL });
        expect(result.explanation).toContain(`generation ${kind}`);
      }
    );

    it('carries the batch error into the explanation', () => {
      expect(scoreAlertsRetrieved(expected, artifacts(refused)).explanation).toContain(
        'the model refused'
      );
    });

    it('still fails a seed that does not match, whatever the model did', () => {
      const result = scoreAlertsRetrieved(
        expected,
        artifacts({ ...refused, openAlertIds: ['a', 'b', 'leftover'] })
      );
      expect(result).toEqual(expect.objectContaining({ score: 0 }));
      expect(result.label).toBeUndefined();
    });

    it.each([
      ['errored', { runnerStatus: 'failed', runnerError: 'boom' }],
      ['timed out', { runnerStatus: 'running', runnerTimedOutAfterMs: 60_000 }],
    ])('still fails when the runner %s', (_case, runner) => {
      expect(
        scoreAlertsRetrieved(expected, artifacts({ ...refused, ...runner })).label
      ).toBeUndefined();
    });

    it('still fails a short count on an empty generation, which did read its batches', () => {
      const result = scoreAlertsRetrieved(
        expected,
        artifacts({ ...base, alertsAnalyzed: 1, generationFault: { kind: 'empty' } })
      );
      expect(result.score).toBe(0);
      expect(result.label).toBeUndefined();
    });

    it('passes a matching count even with a fault set', () => {
      expect(
        scoreAlertsRetrieved(expected, artifacts({ ...base, generationFault: { kind: 'empty' } }))
          .score
      ).toBe(1);
    });
  });
});

describe('scoreDiscoveriesPersisted', () => {
  const expectsSome = { expectedDiscoveries: 'atLeastOne' } as WorkerExpected;

  it('passes when a discovery was persisted', () => {
    expect(
      scoreDiscoveriesPersisted(expectsSome, artifacts({ persistedAttackIds: ['x'] })).score
    ).toBe(1);
  });

  it('is N/A when gold expects none', () => {
    expect(
      scoreDiscoveriesPersisted({ expectedDiscoveries: 'none' } as WorkerExpected, artifacts())
        .label
    ).toBe('N/A');
  });

  it('fails when none was persisted and generation reported no fault', () => {
    const result = scoreDiscoveriesPersisted(expectsSome, artifacts());
    expect(result.score).toBe(0);
    expect(result.label).toBeUndefined();
  });

  it.each(['refused', 'failed', 'empty'] as const)(
    'labels none persisted MODEL_FAULT on a %s generation',
    (kind) => {
      expect(
        scoreDiscoveriesPersisted(expectsSome, artifacts({ generationFault: { kind } }))
      ).toMatchObject({ score: 0, label: MODEL_FAULT_LABEL, metadata: { generationFault: kind } });
    }
  );

  it('still fails when the runner errored, whatever the model did', () => {
    expect(
      scoreDiscoveriesPersisted(
        expectsSome,
        artifacts({ runnerStatus: 'failed', generationFault: { kind: 'refused' } })
      ).label
    ).toBeUndefined();
  });
});

describe('scoreFingerprintsDispatched', () => {
  const attacks = { persistedAttackIds: ['x'] };
  const reviewed = (overrides: Partial<WorkerArtifacts> = {}) =>
    artifacts({
      ...attacks,
      fingerprintReviewCount: 1,
      fingerprintMatchedCount: 0,
      fingerprintAttachCount: 0,
      fingerprintExistingAttachCount: 0,
      fingerprintSiblingAttackIds: [],
      fingerprintReviewedAttackIds: ['x'],
      dispatchedReviewExecutionIds: ['r'],
      ...overrides,
    });

  it('fails when an attack matched an existing fingerprint', () => {
    const result = scoreFingerprintsDispatched(expected, reviewed({ fingerprintMatchedCount: 1 }));
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('existing fingerprint');
  });

  it('fails when an attack was attached to an existing fingerprint, even if every review was dispatched', () => {
    const result = scoreFingerprintsDispatched(
      expected,
      reviewed({ fingerprintAttachCount: 1, fingerprintExistingAttachCount: 1 })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('attached to an existing fingerprint');
  });

  it('passes same-run siblings of a reviewed group in an empty space', () => {
    const result = scoreFingerprintsDispatched(
      expected,
      reviewed({
        persistedAttackIds: ['x', 'y'],
        fingerprintAttachCount: 1,
        fingerprintExistingAttachCount: 0,
        fingerprintSiblingAttackIds: ['y'],
      })
    );
    expect(result.score).toBe(1);
  });

  it('fails a persisted attack that is in neither a review nor a sibling attachment', () => {
    const result = scoreFingerprintsDispatched(
      expected,
      reviewed({ persistedAttackIds: ['x', 'lost'] })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('1 persisted attacks were in neither');
  });

  it('fails a reviewed or attached id that was not persisted', () => {
    const result = scoreFingerprintsDispatched(
      expected,
      reviewed({ fingerprintSiblingAttackIds: ['ghost'] })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('1 reviewed or attached ids were not persisted');
  });

  it('compares ids at the matcher length, so an over-long persisted id is not missing', () => {
    const long = 'a'.repeat(600);
    const result = scoreFingerprintsDispatched(
      expected,
      reviewed({ persistedAttackIds: [long], fingerprintReviewedAttackIds: [long.slice(0, 512)] })
    );
    expect(result.score).toBe(1);
  });

  it('is MISSING when the matcher output carried no attachments list', () => {
    const result = scoreFingerprintsDispatched(
      expected,
      reviewed({ fingerprintReviewedAttackIds: undefined })
    );
    expect(result.label).toBe('MISSING');
  });

  it('does not pass a 0/0 review count for persisted attacks', () => {
    expect(
      scoreFingerprintsDispatched(expected, artifacts({ ...attacks, fingerprintReviewCount: 0 }))
        .score
    ).toBe(0);
  });

  it('passes when every attack was dispatched and none matched', () => {
    expect(scoreFingerprintsDispatched(expected, reviewed()).score).toBe(1);
  });
});

describe('scoreOneReviewPerAttack', () => {
  it('excludes the seeded review from the runner review count', () => {
    const seededDiscoveryId = 'a'.repeat(64);
    const result = scoreOneReviewPerAttack(
      expected,
      artifacts({
        persistedAttackIds: ['runner-attack'],
        fingerprintReviewCount: 1,
        dispatchedReviewExecutionIds: ['runner-review'],
        seededDiscoveryId,
        reviews: [
          review({ executionId: 'runner-review', attackDiscoveryId: 'runner-attack' }),
          review({ executionId: 'seeded-review', attackDiscoveryId: seededDiscoveryId }),
        ],
      })
    );
    expect(result.score).toBe(1);
  });

  it('is MISSING, not silently excluded, when a runner review reports no attack on a no-seed row', () => {
    // `seededDiscoveryId` is absent unless the scenario seeds an FP discovery; with both undefined
    // the old `attackDiscoveryId !== seededDiscoveryId` filter dropped the unidentified review and
    // the MISSING branch below could never fire.
    const result = scoreOneReviewPerAttack(
      expected,
      artifacts({
        persistedAttackIds: ['runner-attack'],
        fingerprintReviewCount: 1,
        dispatchedReviewExecutionIds: ['runner-review'],
        reviews: [review({ executionId: 'runner-review', attackDiscoveryId: undefined })],
      })
    );
    expect(result.label).toBe('MISSING');
    expect(result.explanation).toContain('did not report which attack they cover');
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

  it('fails when the reported persisted count disagrees with the index count', () => {
    const result = scoreOutcomeReported(
      expected,
      artifacts({ persistedAttackIds: ['x', 'y'], indexedAttackCount: 1, outcomes: outcomes(2) })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('reported 2 persisted attacks, 1 found in the index');
  });

  it('is MISSING, not a pass, when the index count could not be read', () => {
    const result = scoreOutcomeReported(
      expected,
      artifacts({ persistedAttackIds: ['x'], outcomes: outcomes(1) })
    );
    expect(result.label).toBe('MISSING');
  });

  it('fails when more reviews were dispatched than attacks persisted', () => {
    const result = scoreOutcomeReported(
      expected,
      artifacts({
        persistedAttackIds: ['x'],
        indexedAttackCount: 1,
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
          indexedAttackCount: 1,
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

describe('blind rows (the review has no source for the evidence)', () => {
  const blind = {
    goldVerdict: 'false_positive',
    blindReason: 'no host',
  } as unknown as WorkerExpected;
  const sighted = { goldVerdict: 'false_positive' } as unknown as WorkerExpected;
  const withVerdict = (verdict: string) =>
    artifacts({ reviews: [review({ verdict: verdict as ReviewArtifact['verdict'] })] });

  it('leaves a blind row out of VerdictMatchesGold, whatever the verdict', () => {
    expect(scoreVerdictMatchesGold(blind, withVerdict('true_positive')).label).toBe('N/A');
    expect(scoreVerdictMatchesGold(blind, withVerdict('inconclusive')).label).toBe('N/A');
  });

  it('still scores a sighted row against gold', () => {
    expect(scoreVerdictMatchesGold(sighted, withVerdict('false_positive')).score).toBe(1);
    expect(scoreVerdictMatchesGold(sighted, withVerdict('true_positive')).score).toBe(0);
  });

  it('passes a blind row that abstains and fails one that commits', () => {
    expect(scoreBlindReviewAbstained(blind, withVerdict('inconclusive')).score).toBe(1);
    expect(scoreBlindReviewAbstained(blind, withVerdict('false_positive')).score).toBe(0);
    expect(scoreBlindReviewAbstained(blind, withVerdict('true_positive')).score).toBe(0);
  });

  it('is N/A for a sighted row and for a blind row with no review', () => {
    expect(scoreBlindReviewAbstained(sighted, withVerdict('inconclusive')).label).toBe('N/A');
    expect(scoreBlindReviewAbstained(blind, artifacts()).label).toBe('N/A');
  });
});
