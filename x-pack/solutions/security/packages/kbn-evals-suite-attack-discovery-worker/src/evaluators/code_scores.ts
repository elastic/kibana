/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ReviewArtifact,
  Stage,
  WorkerArtifacts,
  WorkerExpected,
  Verdict,
} from '../worker_types';

/**
 * Score of one CODE check. `score: null` is never a pass: `label: 'N/A'` means the check does
 * not apply to this row, `label: 'MISSING'` means the artifact it needs was absent (a
 * measurement gap, which the gate treats as a failure).
 */
export interface CodeScore {
  score: number | null;
  label?: 'N/A' | 'MISSING';
  explanation: string;
  metadata?: Record<string, unknown>;
}

export const notApplicable = (explanation: string): CodeScore => ({
  score: null,
  label: 'N/A',
  explanation,
});

export const missing = (explanation: string): CodeScore => ({
  score: null,
  label: 'MISSING',
  explanation,
});

export const pass = (explanation: string): CodeScore => ({ score: 1, explanation });

export const fail = (explanation: string): CodeScore => ({ score: 0, explanation });

export type CodeScorer = (expected: WorkerExpected, artifacts: WorkerArtifacts) => CodeScore;

const EMPTY_RUN_OUTCOMES: readonly string[] = [
  'empty_no_alerts',
  'failed_all_batches',
  'empty_all_duplicates',
  'empty_no_attacks',
  'empty_nothing_pending',
  'failed_all_items',
  'empty_nothing_found',
];

const PARKING_VERDICTS: readonly Verdict[] = ['true_positive', 'inconclusive'];

/** Folds per-review results: any 0 fails, then any gap is MISSING, else pass. */
const foldReviews = (
  reviews: readonly ReviewArtifact[],
  check: (review: ReviewArtifact) => CodeScore,
  emptyExplanation: string
): CodeScore => {
  const results = reviews.map((review) => ({ review, result: check(review) }));
  const applicable = results.filter(({ result }) => result.label !== 'N/A');
  if (applicable.length === 0) return notApplicable(emptyExplanation);
  const describe = (items: typeof applicable): string =>
    items
      .map(
        ({ review, result }) =>
          `${review.attackDiscoveryId ?? review.executionId}: ${result.explanation}`
      )
      .join('; ');
  const failures = applicable.filter(({ result }) => result.score === 0);
  if (failures.length > 0) return fail(describe(failures));
  const gaps = applicable.filter(({ result }) => result.label === 'MISSING');
  if (gaps.length > 0) return missing(describe(gaps));
  return pass(describe(applicable));
};

export const scoreRunnerCompleted: CodeScorer = (_expected, artifacts) =>
  artifacts.runnerStatus === 'completed'
    ? pass('runner completed')
    : fail(
        `runner ended ${artifacts.runnerStatus}${
          artifacts.runnerError ? `: ${artifacts.runnerError}` : ''
        }`
      );

/** Every seeded alert was in the window the generation step read. */
export const scoreAlertsRetrieved: CodeScorer = (_expected, artifacts) => {
  if (artifacts.alertsAnalyzed === undefined) {
    return missing('the generation step reported no alert count');
  }
  return artifacts.alertsAnalyzed >= artifacts.seededAlertCount
    ? pass(`${artifacts.alertsAnalyzed} alerts analyzed, ${artifacts.seededAlertCount} seeded`)
    : fail(`${artifacts.alertsAnalyzed} alerts analyzed, ${artifacts.seededAlertCount} seeded`);
};

/**
 * Rows that expect discoveries need at least one persisted. Rows that expect none may still
 * persist some; the audit negative control judges those, so this check is N/A for them.
 */
export const scoreDiscoveriesPersisted: CodeScorer = (expected, artifacts) => {
  if (expected.expectedDiscoveries === 'none') {
    return notApplicable('gold expects no discoveries, so none is a valid outcome');
  }
  return artifacts.persistedAttackIds.length > 0
    ? pass(`${artifacts.persistedAttackIds.length} discoveries persisted`)
    : fail('gold expects at least one discovery and none was persisted');
};

/**
 * Fingerprint matching ran, and every attack it handed back was dispatched for review. A match
 * step that failed closed hides the matcher, so it fails here even though reviews still run.
 */
export const scoreFingerprintsDispatched: CodeScorer = (_expected, artifacts) => {
  if (artifacts.persistedAttackIds.length === 0) {
    return notApplicable('no attacks were persisted, so there is nothing to match');
  }
  if (artifacts.fingerprintMatchFailed) {
    return fail('match_fingerprints failed, so every attack fell back to an unmatched review');
  }
  if (artifacts.fingerprintReviewCount === undefined) {
    return missing('match_fingerprints produced no output');
  }
  return artifacts.dispatchedReviewExecutionIds.length === artifacts.fingerprintReviewCount
    ? pass(
        `${artifacts.dispatchedReviewExecutionIds.length} of ${artifacts.fingerprintReviewCount} reviews dispatched`
      )
    : fail(
        `${artifacts.dispatchedReviewExecutionIds.length} reviews dispatched, matcher asked for ${artifacts.fingerprintReviewCount}`
      );
};

/** Exactly one review execution per unmatched attack. */
export const scoreOneReviewPerAttack: CodeScorer = (_expected, artifacts) => {
  if (artifacts.persistedAttackIds.length === 0) {
    return notApplicable('no attacks were persisted');
  }
  const unmatched = artifacts.fingerprintMatchFailed
    ? artifacts.persistedAttackIds.length
    : artifacts.fingerprintReviewCount;
  if (unmatched === undefined) return missing('the number of unmatched attacks is unknown');
  const attackIds = artifacts.reviews.map(({ attackDiscoveryId }) => attackDiscoveryId);
  const unidentified = attackIds.filter((id) => id === undefined).length;
  const distinct = new Set(attackIds.filter((id) => id !== undefined)).size;
  if (artifacts.dispatchedReviewExecutionIds.length !== unmatched) {
    return fail(
      `${artifacts.dispatchedReviewExecutionIds.length} reviews for ${unmatched} unmatched attacks`
    );
  }
  if (unidentified > 0) {
    return missing(`${unidentified} reviews did not report which attack they cover`);
  }
  return distinct === unmatched
    ? pass(`${unmatched} unmatched attacks, ${distinct} distinct reviews`)
    : fail(`${unmatched} unmatched attacks but ${distinct} distinct attacks reviewed`);
};

export const scoreInvestigationOpened: CodeScorer = (_expected, artifacts) =>
  foldReviews(
    artifacts.reviews,
    (review) =>
      review.investigationOpened
        ? pass('Investigation opened')
        : fail('no Investigation exists for this attack'),
    'no review ran'
  );

/** Verdict against gold. A review with no verdict yet is a gap, not a wrong answer. */
export const scoreVerdictMatchesGold: CodeScorer = (expected, artifacts) => {
  const accepted = [expected.goldVerdict, ...(expected.alsoAccepts ?? [])];
  if (artifacts.reviews.length === 0) {
    return expected.expectedDiscoveries === 'none'
      ? notApplicable('gold expects no discoveries, so no review runs')
      : missing('no review ran to produce a verdict');
  }
  return foldReviews(
    artifacts.reviews,
    (review) => {
      if (!review.verdict) return missing(`review is ${review.status} with no verdict`);
      return accepted.includes(review.verdict as (typeof accepted)[number])
        ? pass(`verdict ${review.verdict}`)
        : fail(`verdict ${review.verdict}, gold ${accepted.join(' or ')}`);
    },
    'no review ran'
  );
};

/**
 * True-positive and inconclusive verdicts stop at the analyst gate. A review that finished with
 * a decision recorded was actioned without an analyst; one that ended any other way never
 * reached the gate.
 */
export const scoreParkedAtGate: CodeScorer = (_expected, artifacts) =>
  foldReviews(
    artifacts.reviews,
    (review) => {
      if (!review.verdict || !PARKING_VERDICTS.includes(review.verdict)) {
        return notApplicable('only true-positive and inconclusive verdicts reach the gate');
      }
      if (review.proposalDecision) {
        return fail(`actioned without an analyst (decision ${review.proposalDecision})`);
      }
      return review.parked || review.proposalStatus === 'pending'
        ? pass('parked at the analyst gate')
        : fail(`not parked at the gate (review ${review.status})`);
    },
    'no review reached a verdict that escalates'
  );

/** Both worker outcome events fired, and their outcome agrees with what the run produced. */
export const scoreOutcomeReported: CodeScorer = (_expected, artifacts) => {
  const run = artifacts.outcomes.find(({ stepId }) => stepId === 'report_run_completed');
  const worker = artifacts.outcomes.find(({ stepId }) => stepId === 'report_worker_run_completed');
  if (!run || !worker) {
    return missing(
      `outcome step(s) not executed: ${[
        !run && 'report_run_completed',
        !worker && 'report_worker_run_completed',
      ]
        .filter(Boolean)
        .join(', ')}`
    );
  }
  if (run.status !== 'completed' || worker.status !== 'completed') {
    return fail(`outcome steps ended ${run.status} and ${worker.status}`);
  }
  if (!run.runOutcome || !worker.runOutcome) {
    return missing('an outcome event carried no run_outcome');
  }
  const produced = artifacts.persistedAttackIds.length > 0;
  const claimedEmpty = [run.runOutcome, worker.runOutcome].filter((outcome) =>
    EMPTY_RUN_OUTCOMES.includes(outcome)
  );
  return produced && claimedEmpty.length > 0
    ? fail(`attacks were persisted but the run reported ${claimedEmpty.join(', ')}`)
    : pass(`reported ${run.runOutcome} and ${worker.runOutcome}`);
};

/** Scorer and the stage it belongs to, so generation and review quality can be read apart. */
export const CODE_SCORERS: ReadonlyArray<{ name: string; stage: Stage; scorer: CodeScorer }> = [
  { name: 'RunnerCompleted', stage: 'pipeline', scorer: scoreRunnerCompleted },
  { name: 'AlertsRetrieved', stage: 'generation', scorer: scoreAlertsRetrieved },
  { name: 'DiscoveriesPersisted', stage: 'generation', scorer: scoreDiscoveriesPersisted },
  { name: 'FingerprintsDispatched', stage: 'pipeline', scorer: scoreFingerprintsDispatched },
  { name: 'OneReviewPerAttack', stage: 'pipeline', scorer: scoreOneReviewPerAttack },
  { name: 'InvestigationOpened', stage: 'review', scorer: scoreInvestigationOpened },
  { name: 'VerdictMatchesGold', stage: 'review', scorer: scoreVerdictMatchesGold },
  { name: 'ParkedAtGate', stage: 'review', scorer: scoreParkedAtGate },
  { name: 'OutcomeReported', stage: 'pipeline', scorer: scoreOutcomeReported },
];
