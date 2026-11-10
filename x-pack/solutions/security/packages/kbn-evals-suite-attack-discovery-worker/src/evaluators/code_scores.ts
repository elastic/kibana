/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CohortRouting } from '../cohort_routing';
import type {
  GenerationFault,
  ReviewArtifact,
  Stage,
  WorkerArtifacts,
  WorkerExpected,
  Verdict,
} from '../worker_types';

/**
 * A generation check that missed because the model refused, failed or found nothing, while the
 * pipeline around it worked. It is a miss, reported but not gating (`isGatingCodeFailure`).
 */
export const MODEL_FAULT_LABEL = 'MODEL_FAULT';

/**
 * Score of one CODE check. `score: null` is never a pass: `label: 'N/A'` means the check does
 * not apply to this row, `label: 'MISSING'` means the artifact it needs was absent (a
 * measurement gap, which the gate treats as a failure). `MODEL_FAULT` labels a 0.
 */
export interface CodeScore {
  score: number | null;
  label?: 'N/A' | 'MISSING' | typeof MODEL_FAULT_LABEL;
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

/**
 * The generation fault, only when the runner itself completed cleanly: a runner that errored or
 * timed out is a pipeline failure whatever the model did.
 */
const modelFaultOf = (artifacts: WorkerArtifacts): GenerationFault | undefined =>
  artifacts.runnerStatus === 'completed' &&
  artifacts.runnerTimedOutAfterMs === undefined &&
  !artifacts.runnerError
    ? artifacts.generationFault
    : undefined;

const modelFault = (fault: GenerationFault, explanation: string): CodeScore => ({
  score: 0,
  label: MODEL_FAULT_LABEL,
  explanation: `${explanation}: generation ${fault.kind}${
    fault.message ? ` (${fault.message})` : ''
  }`,
  metadata: { generationFault: fault.kind },
});

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

/** The runner ended, ran at least one step, and ended `completed` within the wait. */
export const scoreRunnerCompleted: CodeScorer = (_expected, artifacts) => {
  if (artifacts.runnerTimedOutAfterMs !== undefined) {
    return fail(
      `runner timed out after ${Math.round(artifacts.runnerTimedOutAfterMs / 60_000)}m (status ${
        artifacts.runnerStatus
      })`
    );
  }
  if (artifacts.runnerStepCount === 0) {
    return fail(
      `runner ended ${artifacts.runnerStatus} with no step executions${
        artifacts.runnerError ? `: ${artifacts.runnerError}` : ''
      }`
    );
  }
  return artifacts.runnerStatus === 'completed'
    ? pass('runner completed')
    : fail(
        `runner ended ${artifacts.runnerStatus}${
          artifacts.runnerError ? `: ${artifacts.runnerError}` : ''
        }`
      );
};

/**
 * Every review completed or parked at the gate within the wait; one that ran out of time, failed
 * or was cancelled fails. The review snapshot is read before teardown cancels a parked review.
 */
export const scoreReviewsSettled: CodeScorer = (_expected, artifacts) =>
  foldReviews(
    artifacts.reviews,
    (review) => {
      if (review.timedOutAfterMs !== undefined) {
        return fail(
          `review timed out after ${Math.round(review.timedOutAfterMs / 60_000)}m (status ${
            review.status
          })`
        );
      }
      // The error is a plain string, so a model refusal cannot be told from a pipeline break
      // here and every failed review gates.
      return review.status === 'failed' || review.status === 'cancelled'
        ? fail(`review ${review.status}${review.error ? `: ${review.error}` : ''}`)
        : pass(`review ${review.status}`);
    },
    'no review ran'
  );

/**
 * Exactly the seeded alerts were read. The generation step reports a count, not ids, so the
 * check has three parts: the space held exactly the seeded ids when the row started, the step
 * analyzed exactly that many, and no attack cites an alert outside the seeded set. A wrong seed
 * always fails; a short count from a refused or failed generation is a `MODEL_FAULT`.
 */
export const scoreAlertsRetrieved: CodeScorer = (_expected, artifacts) => {
  if (artifacts.alertsAnalyzed === undefined) {
    return missing('the generation step reported no alert count');
  }
  const seeded = new Set(artifacts.seededAlertIds);
  const open = new Set(artifacts.openAlertIds);
  const absent = [...seeded].filter((id) => !open.has(id));
  const extra = [...open].filter((id) => !seeded.has(id));
  if (absent.length > 0 || extra.length > 0) {
    return fail(
      `the space's open alerts differ from the seeded set (${absent.length} seeded alerts not open, ${extra.length} unexpected open alerts)`
    );
  }
  if (artifacts.alertsAnalyzed !== seeded.size) {
    const explanation = `${artifacts.alertsAnalyzed} alerts analyzed, ${seeded.size} seeded`;
    // A failed batch counts no alerts, so the shortfall is the model's, not retrieval's. An empty
    // generation succeeded over its batches, so a shortfall there is still retrieval's.
    const fault = modelFaultOf(artifacts);
    return fault && fault.kind !== 'empty' ? modelFault(fault, explanation) : fail(explanation);
  }
  const foreign = artifacts.insights
    .flatMap(({ alertIds }) => alertIds)
    .filter((id) => !seeded.has(id));
  return foreign.length > 0
    ? fail(`${foreign.length} alert ids cited by attacks were never seeded`)
    : pass(`${artifacts.alertsAnalyzed} alerts analyzed, ${seeded.size} seeded`);
};

/**
 * Rows that expect discoveries need at least one persisted. Rows that expect none may still
 * persist some; the audit negative control judges those, so this check is N/A for them.
 */
export const scoreDiscoveriesPersisted: CodeScorer = (expected, artifacts) => {
  if (expected.expectedDiscoveries === 'none') {
    return notApplicable('gold expects no discoveries, so none is a valid outcome');
  }
  if (artifacts.persistedAttackIds.length > 0) {
    return pass(`${artifacts.persistedAttackIds.length} discoveries persisted`);
  }
  const explanation = 'gold expects at least one discovery and none was persisted';
  const fault = modelFaultOf(artifacts);
  return fault ? modelFault(fault, explanation) : fail(explanation);
};

// The matcher stores attack ids cut to this length (`attack_discovery_id.slice(0, 512)`).
const MATCHER_ID_LENGTH = 512;

/**
 * Every persisted attack must be covered: a review of its own, or a same-run sibling attachment
 * that a review declared. The persisted ids are cut to the matcher's length before comparing, so
 * an over-long id cannot read as missing.
 */
const coverageGap = (artifacts: WorkerArtifacts): string | undefined => {
  const covered = new Set([
    ...(artifacts.fingerprintReviewedAttackIds ?? []),
    ...(artifacts.fingerprintSiblingAttackIds ?? []),
  ]);
  const persisted = new Set(
    artifacts.persistedAttackIds.map((id) => id.slice(0, MATCHER_ID_LENGTH))
  );
  const notCovered = [...persisted].filter((id) => !covered.has(id)).length;
  const notPersisted = [...covered].filter((id) => !persisted.has(id)).length;
  return notCovered === 0 && notPersisted === 0
    ? undefined
    : `${notCovered} persisted attacks were in neither a review nor a declared sibling attachment, and ${notPersisted} reviewed or attached ids were not persisted`;
};

/**
 * Fingerprint matching ran, none of the attacks matched or attached to an existing fingerprint,
 * every persisted attack is covered (reviewed, or a same-run sibling of a reviewed group), and every
 * attack it handed back was dispatched for review (zero of zero is not a pass). A match
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
  if ((artifacts.fingerprintMatchedCount ?? 0) > 0) {
    return fail(
      `${artifacts.fingerprintMatchedCount} attacks matched an existing fingerprint in a space that started empty`
    );
  }
  if ((artifacts.fingerprintExistingAttachCount ?? 0) > 0) {
    return fail(
      `${artifacts.fingerprintExistingAttachCount} attacks were attached to an existing fingerprint in a space that started empty, so they were never reviewed`
    );
  }
  if (
    artifacts.fingerprintReviewCount === 0 &&
    artifacts.dispatchedReviewExecutionIds.length === 0
  ) {
    return fail(
      `${artifacts.persistedAttackIds.length} attacks were persisted but none was dispatched for review`
    );
  }
  if (artifacts.fingerprintReviewedAttackIds === undefined) {
    return missing('match_fingerprints output carried no attachments list to check coverage with');
  }
  const uncovered = coverageGap(artifacts);
  if (uncovered) return fail(uncovered);
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
  // The seeded discovery's review covers an attack the runner never persisted.
  const attackIds = artifacts.reviews
    .filter(({ attackDiscoveryId }) => attackDiscoveryId !== artifacts.seededDiscoveryId)
    .map(({ attackDiscoveryId }) => attackDiscoveryId);
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
  if (expected.blindReason)
    return notApplicable(`scored by BlindReviewAbstained: ${expected.blindReason}`);
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
 * For rows the review cannot see (`blindReason`): the right answer is to abstain. A definite
 * verdict means the model claimed evidence the workflow never gave it. Reported only (threshold 0
 * in `CODE_PASS_THRESHOLDS`), because the gap is the workflow's, not the model's.
 */
export const scoreBlindReviewAbstained: CodeScorer = (expected, artifacts) => {
  if (!expected.blindReason) return notApplicable("the review can see this row's evidence");
  if (artifacts.reviews.length === 0) return notApplicable('no review ran');
  return foldReviews(
    artifacts.reviews,
    (review) => {
      if (!review.verdict) return missing(`review is ${review.status} with no verdict`);
      return review.verdict === 'inconclusive'
        ? pass('abstained (inconclusive) without a source for the evidence')
        : fail(`returned ${review.verdict} without a source for the evidence`);
    },
    'no review ran'
  );
};

/**
 * True-positive and inconclusive verdicts stop at the analyst gate. A review that finished with
 * a decision recorded was actioned without an analyst; one that is not provably waiting on an
 * open escalation gate (see `isParkedAtGate`) never reached it.
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
      return review.parked
        ? pass('parked at the analyst gate')
        : fail(`not parked at the gate (review ${review.status})`);
    },
    'no review reached a verdict that escalates'
  );

const numberField = (
  record: Record<string, unknown> | undefined,
  key: string
): number | undefined => {
  const value = record?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
    ? Number(value)
    : undefined;
};

/**
 * Both worker outcome events fired, and their outcome and counts agree with what the run
 * produced: the runner's reported persisted count is checked against a separate count of the
 * attack discovery index scoped to the run's generation uuids, not against the runner's own
 * generation output (which the reported count is derived from).
 */
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
  const dispatched = artifacts.dispatchedReviewExecutionIds.length;
  const reportedPersisted = numberField(run.input, 'attacks_persisted');
  if (reportedPersisted === undefined) {
    return missing('the run event carried no attacks_persisted count');
  }
  const { indexedAttackCount } = artifacts;
  if (indexedAttackCount === undefined) {
    return missing('the persisted attack count could not be read from the attack discovery index');
  }
  if (reportedPersisted !== indexedAttackCount) {
    return fail(
      `run event reported ${reportedPersisted} persisted attacks, ${indexedAttackCount} found in the index`
    );
  }
  if (dispatched > reportedPersisted) {
    return fail(`${dispatched} reviews dispatched for ${reportedPersisted} persisted attacks`);
  }
  const claimedEmpty = [run.runOutcome, worker.runOutcome].filter((outcome) =>
    EMPTY_RUN_OUTCOMES.includes(outcome)
  );
  return produced && claimedEmpty.length > 0
    ? fail(`attacks were persisted but the run reported ${claimedEmpty.join(', ')}`)
    : pass(`reported ${run.runOutcome} and ${worker.runOutcome}`);
};

type StageRouting = Pick<CohortRouting, 'generationModel' | 'reviewModel'>;

const joined = (values: readonly string[]): string => (values.length > 0 ? values.join(', ') : '-');

/**
 * Per-stage model and token facts read from the run, for stamping on score metadata. Keys are
 * absent when the value could not be read; generation tokens are never reported by the runner.
 */
export const stageUsageMetadata = (artifacts: WorkerArtifacts): Record<string, unknown> => {
  const { generationUsage: generation, reviews } = artifacts;
  const analyses = reviews.flatMap(({ analysis }) => (analysis ? [analysis] : []));
  const sum = (pick: (usage: (typeof analyses)[number]) => number | undefined) =>
    analyses.some((usage) => pick(usage) !== undefined)
      ? analyses.reduce((total, usage) => total + (pick(usage) ?? 0), 0)
      : undefined;
  const entries: Array<[string, unknown]> = [
    ['generation.resolved_model', joined(generation.connectorIds)],
    ['generation.reported_model_names', joined(generation.models)],
    ['generation.tokens_available', false],
    ['review.resolved_model', joined(analyses.flatMap(({ connectorIds }) => connectorIds))],
    ['review.input_tokens', sum(({ inputTokens }) => inputTokens)],
    ['review.output_tokens', sum(({ outputTokens }) => outputTokens)],
    ['review.cached_tokens', sum(({ cachedTokens }) => cachedTokens)],
  ];
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined));
};

/**
 * Each stage that produced output ran on the endpoint the cohort planned. Generation is read
 * from the persisted discoveries' `api_config.connector_id`, the review from the connector id
 * in the usage of the analysis child's `analyze` step. A stage whose model cannot be read fails:
 * an unverifiable model is not the planned one. A stage with no output is N/A.
 */
export const scoreStageModelResolved =
  ({ generationModel, reviewModel }: StageRouting): CodeScorer =>
  (_expected, artifacts) => {
    const problems: string[] = [];
    const checked: string[] = [];
    const metadata = stageUsageMetadata(artifacts);

    const { generationUsage: generation } = artifacts;
    if (generation.discoveryCount > 0) {
      const { connectorIds } = generation;
      if (connectorIds.length === 0 || generation.discoveriesWithoutConnector > 0) {
        problems.push(
          `generation model undeterminable: ${generation.discoveriesWithoutConnector} of ${generation.discoveryCount} persisted discoveries carry no api_config.connector_id`
        );
      } else if (connectorIds.some((id) => id !== generationModel)) {
        problems.push(`generation ran on ${joined(connectorIds)}, planned ${generationModel}`);
      } else {
        checked.push(`generation ${generationModel}`);
      }
    }

    artifacts.reviews.forEach((review) => {
      const label = review.attackDiscoveryId ?? review.executionId;
      const { analysis } = review;
      if (!analysis) {
        problems.push(`review ${label} model undeterminable: it ran no analysis step`);
      } else if (analysis.unresolvedReason || analysis.connectorIds.length === 0) {
        problems.push(
          `review ${label} model undeterminable: ${
            analysis.unresolvedReason ?? 'no connector id reported'
          }`
        );
      } else if (analysis.connectorIds.some((id) => id !== reviewModel)) {
        problems.push(
          `review ${label} ran on ${joined(analysis.connectorIds)}, planned ${reviewModel}`
        );
      } else {
        checked.push(`review ${label} ${reviewModel}`);
      }
    });

    if (problems.length > 0) return { ...fail(problems.join('; ')), metadata };
    if (checked.length === 0) {
      return { ...notApplicable('no stage produced output to attribute a model to'), metadata };
    }
    return { ...pass(`resolved as planned: ${checked.join('; ')}`), metadata };
  };

/** Scorer and the stage it belongs to, so generation and review quality can be read apart. */
export const CODE_SCORERS: ReadonlyArray<{ name: string; stage: Stage; scorer: CodeScorer }> = [
  { name: 'RunnerCompleted', stage: 'pipeline', scorer: scoreRunnerCompleted },
  { name: 'AlertsRetrieved', stage: 'generation', scorer: scoreAlertsRetrieved },
  { name: 'DiscoveriesPersisted', stage: 'generation', scorer: scoreDiscoveriesPersisted },
  { name: 'FingerprintsDispatched', stage: 'pipeline', scorer: scoreFingerprintsDispatched },
  { name: 'ReviewsSettled', stage: 'pipeline', scorer: scoreReviewsSettled },
  { name: 'OneReviewPerAttack', stage: 'pipeline', scorer: scoreOneReviewPerAttack },
  { name: 'InvestigationOpened', stage: 'review', scorer: scoreInvestigationOpened },
  { name: 'VerdictMatchesGold', stage: 'review', scorer: scoreVerdictMatchesGold },
  { name: 'BlindReviewAbstained', stage: 'review', scorer: scoreBlindReviewAbstained },
  { name: 'ParkedAtGate', stage: 'review', scorer: scoreParkedAtGate },
  { name: 'OutcomeReported', stage: 'pipeline', scorer: scoreOutcomeReported },
];
