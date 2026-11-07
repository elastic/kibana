/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type {
  DefaultEvaluators,
  EvaluationDataset,
  EvalsExecutorClient,
  Evaluator,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  AUDIT_SCENARIOS,
  getGoldForVariant,
  type AuditReferenceResolver,
} from '../audit_failure_classes/registry';
import { collectReviewArtifact, collectWorkerArtifacts, isReviewSettled } from '../collect';
import type { CohortRouting } from '../cohort_routing';
import { REVIEW_SETTLE_TIMEOUT_MS, REVIEW_WORKFLOW_ID } from '../constants';
import { errorMessage } from '../kibana_api';
import { assertCleanSpace, cleanupSeed, seedScenario } from '../seed';
import { SEEDED_FALSE_POSITIVE_TITLE } from '../audit_failure_classes/scenarios/seeded_false_positive';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import type { AttackDiscoveryWorkerClient } from '../worker_client';
import type { Stage, WorkerArtifacts, WorkerExample, WorkerExpected } from '../worker_types';
import { createAuditConditionalRemediationEvaluator } from './audit_conditional_remediation_evaluator';
import { createAuditForbiddenJoinEvaluator } from './audit_forbidden_join_evaluator';
import { createAuditMetaAlertAsEvidenceEvaluator } from './audit_meta_alert_as_evidence_evaluator';
import { createAuditNegativeControlEvaluator } from './audit_negative_control_evaluator';
import { createAuditPositiveControlRecallEvaluator } from './audit_positive_control_recall_evaluator';
import {
  CODE_SCORERS,
  scoreStageModelResolved,
  stageUsageMetadata,
  type CodeScorer,
} from './code_scores';
import {
  assertCodeScoresPass,
  createRunCollector,
  describeRow,
  logQualityMisses,
  logRunSummary,
  ROW_FAILED_LABEL,
  withScoreCollection,
} from './run_summary';

export type WorkerEvaluator = Evaluator<WorkerExample, WorkerArtifacts>;

export interface JudgeProvenance {
  judgeConnectorId: string;
  judgeConnectorName?: string;
}

const DIRECTION = 'maximize' as const;

/**
 * What a row returns when it threw. The task never throws for a row: the real executor rejects the
 * whole experiment on the first throw, which would skip the final clean-space check and the code
 * score gate. The `null` score with this label is a miss for every CODE evaluator (`isCodeMiss`
 * exempts only `N/A`), and the judges and audit evaluators report it too instead of scoring an
 * empty row.
 */
export const failedRowArtifacts = (rowError: string): WorkerArtifacts => ({
  rowError,
  runnerExecutionId: '',
  runnerStatus: 'not_run',
  runnerStepCount: 0,
  seededAlertCount: 0,
  seededAlertIds: [],
  openAlertIds: [],
  insights: [],
  generationUsage: {
    discoveryCount: 0,
    connectorIds: [],
    models: [],
    discoveriesWithoutConnector: 0,
  },
  persistedAttackIds: [],
  fingerprintMatchFailed: false,
  dispatchedReviewExecutionIds: [],
  reviews: [],
  outcomes: [],
});

const rowFailedResult = (output: WorkerArtifacts) =>
  output.rowError === undefined
    ? undefined
    : { score: null, label: ROW_FAILED_LABEL, explanation: output.rowError };

/** Stamps the stage and the cohort's models on a result, so every score doc carries them. */
const withRoutingMetadata = (
  evaluator: WorkerEvaluator,
  stage: Stage,
  routing: CohortRouting
): WorkerEvaluator => ({
  ...evaluator,
  evaluate: async (params) => {
    const result = await evaluator.evaluate(params);
    return {
      ...result,
      metadata: {
        ...result.metadata,
        stage,
        cohort: routing.cohort,
        generation_model: routing.generationModel,
        review_model: routing.reviewModel,
      },
    };
  },
});

export const createCodeEvaluators = (routing: CohortRouting): WorkerEvaluator[] =>
  [
    ...CODE_SCORERS,
    {
      name: 'StageModelResolved',
      stage: 'pipeline' as const,
      scorer: scoreStageModelResolved(routing),
    },
  ].map(({ name, stage, scorer }: { name: string; stage: Stage; scorer: CodeScorer }) =>
    withRoutingMetadata(
      {
        name,
        kind: 'CODE',
        direction: DIRECTION,
        evaluate: async ({ output, expected }) => {
          const failedRow = rowFailedResult(output);
          if (failedRow) return failedRow;
          if (!expected) {
            return { score: null, label: 'MISSING', explanation: 'row has no expected block' };
          }
          const result = scorer(expected, output);
          // Every code score doc carries the models and tokens each stage actually ran on.
          return { ...result, metadata: { ...stageUsageMetadata(output), ...result.metadata } };
        },
      },
      stage,
      routing
    )
  );

/**
 * The audit evaluators score the baseline gold, which is what the runner's alerts carry. The
 * discoveries arrive already de-anonymized (see `toInsights`), so no replacements are applied.
 */
const baselineResolver: AuditReferenceResolver = (metadata) => {
  const scenarioId =
    typeof metadata === 'object' && metadata !== null
      ? (metadata as { scenarioId?: unknown }).scenarioId
      : undefined;
  const scenario = AUDIT_SCENARIOS.find(({ id }) => id === scenarioId);
  return scenario
    ? { gold: getGoldForVariant(scenario.gold, 'baseline'), replacements: {} }
    : undefined;
};

const adaptAuditEvaluator = (
  audit: Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput>,
  routing: CohortRouting
): WorkerEvaluator =>
  withRoutingMetadata(
    {
      name: audit.name,
      kind: audit.kind,
      direction: audit.direction,
      evaluate: async ({ input, output }) =>
        rowFailedResult(output) ??
        audit.evaluate({
          input: { mode: 'bundledAlerts', anonymizedAlerts: [] },
          output: { insights: output.insights },
          expected: { attackDiscoveries: [] },
          metadata: { scenarioId: input?.scenarioId },
        }),
    },
    'generation',
    routing
  );

/** The generation-quality checks from the audit suite, run over the persisted discoveries. */
export const createAuditEvaluators = (routing: CohortRouting): WorkerEvaluator[] =>
  [
    createAuditForbiddenJoinEvaluator(baselineResolver),
    createAuditMetaAlertAsEvidenceEvaluator(baselineResolver),
    createAuditNegativeControlEvaluator(baselineResolver),
    createAuditPositiveControlRecallEvaluator(baselineResolver),
    createAuditConditionalRemediationEvaluator(baselineResolver),
  ].map((audit) => adaptAuditEvaluator(audit, routing));

export const discoveryNarrativeOf = ({ insights }: WorkerArtifacts): string =>
  insights
    .map(({ title, summaryMarkdown, detailsMarkdown }) =>
      [`# ${title}`, summaryMarkdown, detailsMarkdown].filter(Boolean).join('\n\n')
    )
    .join('\n\n---\n\n');

export const verdictNarrativeOf = ({ reviews }: WorkerArtifacts): string =>
  reviews
    .filter(
      ({ verdict, verdictSummary, verdictRationale }) =>
        verdict && (verdictSummary || verdictRationale)
    )
    .map(({ verdict, verdictSummary, verdictRationale }) =>
      [`Verdict: ${verdict}`, verdictSummary, verdictRationale].filter(Boolean).join('\n\n')
    )
    .join('\n\n---\n\n');

const createRubricEvaluator = ({
  name,
  stage,
  evaluators,
  routing,
  judge,
  criteriaOf,
  narrativeOf,
  absent,
}: {
  name: string;
  stage: Stage;
  evaluators: DefaultEvaluators;
  routing: CohortRouting;
  judge?: JudgeProvenance;
  criteriaOf: (expected: WorkerExpected) => string[];
  narrativeOf: (artifacts: WorkerArtifacts) => string;
  absent: (expected: WorkerExpected, artifacts: WorkerArtifacts) => string | undefined;
}): WorkerEvaluator =>
  withRoutingMetadata(
    {
      name,
      kind: 'LLM',
      direction: DIRECTION,
      evaluate: async ({ input, output, expected }) => {
        const failedRow = rowFailedResult(output);
        if (failedRow) return failedRow;
        const criteria = expected ? criteriaOf(expected) : [];
        if (!expected || criteria.length === 0) {
          return { score: null, label: 'N/A', explanation: 'row has no rubric criteria' };
        }
        const narrative = narrativeOf(output);
        if (!narrative) {
          const reason = absent(expected, output);
          return reason
            ? { score: null, label: 'N/A', explanation: reason }
            : { score: null, label: 'MISSING', explanation: 'no narrative was produced to judge' };
        }
        const result = await evaluators
          .criteria(criteria)
          .evaluate({ input, output: narrative, expected, metadata: undefined });
        return {
          ...result,
          metadata: {
            ...result.metadata,
            ...(judge ? { judge } : {}),
          },
        };
      },
    },
    stage,
    routing
  );

/** LLM rubrics for each stage's prose; reported, never gated. */
export const createJudgeEvaluators = ({
  evaluators,
  routing,
  judge,
}: {
  evaluators: DefaultEvaluators;
  routing: CohortRouting;
  judge?: JudgeProvenance;
}): WorkerEvaluator[] => [
  createRubricEvaluator({
    name: 'DiscoveryNarrativeRubric',
    stage: 'generation',
    evaluators,
    routing,
    judge,
    criteriaOf: ({ generationCriteria }) => generationCriteria,
    narrativeOf: discoveryNarrativeOf,
    absent: (expected) =>
      expected.expectedDiscoveries === 'none'
        ? 'gold expects no discoveries, so there is no narrative to judge'
        : undefined,
  }),
  createRubricEvaluator({
    name: 'VerdictRationaleRubric',
    stage: 'review',
    evaluators,
    routing,
    judge,
    criteriaOf: ({ criteria }) => criteria,
    narrativeOf: verdictNarrativeOf,
    absent: (expected, artifacts) =>
      artifacts.reviews.length === 0 && expected.expectedDiscoveries === 'none'
        ? 'gold expects no discoveries, so no review runs'
        : undefined,
  }),
];

export const createEvaluateDataset =
  ({
    client,
    evaluators,
    executorClient,
    esClient,
    fetch,
    log,
    routing,
    floorWorkflowId,
    judge,
  }: {
    client: AttackDiscoveryWorkerClient;
    evaluators: DefaultEvaluators;
    executorClient: EvalsExecutorClient;
    esClient: Client;
    fetch: HttpHandler;
    log: ToolingLog;
    routing: CohortRouting;
    /** Per-space floor worker workflow that every row starts. */
    floorWorkflowId: string;
    judge?: JudgeProvenance;
  }) =>
  async ({
    dataset,
    evaluatorOverrides,
  }: {
    dataset: EvaluationDataset<WorkerExample>;
    evaluatorOverrides?: WorkerEvaluator[];
  }): Promise<void> => {
    const all = evaluatorOverrides ?? [
      ...createCodeEvaluators(routing),
      ...createAuditEvaluators(routing),
      ...createJudgeEvaluators({ evaluators, routing, judge }),
    ];
    const collector = createRunCollector();
    log.info(
      `Running Attack Discovery Worker evaluation: "${dataset.name}" (${dataset.examples.length} rows, cohort ${routing.cohort}, generation ${routing.generationModel}, review ${routing.reviewModel})`
    );

    // Row failures are recorded here, not thrown, so `runExperiment` resolves and every check below
    // runs once all rows are done.
    const rowErrors: Error[] = [];
    const recordRowError = (rowLabel: string, error: unknown) =>
      rowErrors.push(new Error(`${rowLabel} failed: ${errorMessage(error)}`, { cause: error }));

    // Set once the executor has rejected. A job still queued in the executor's limiter starts
    // after that, so `runRow` must not seed for it, and the row already running is awaited below
    // but handed the placeholder instead of its real output (see `task`). The executor still runs
    // every evaluator on those placeholders after this function returns: they write no ES data
    // and make no judge call on real output, but their `ROW_FAILED` scores may reach `collector`
    // after `logRunSummary`.
    let closed = false;
    let rowsStarted = 0;
    const inFlight = new Set<Promise<WorkerArtifacts>>();
    // Evaluations running on a row's real output; the abort path waits for them (see below).
    const pendingEvaluations = new Set<Promise<unknown>>();
    // The last row to return real output before the abort: normally the job the executor cut short,
    // in its own span code or while its evaluators were still running. A row that starts while the
    // rejection propagates only gets the placeholder, so it does not replace this.
    let lastRealRow: string | undefined;

    const runRow = async (
      input: { scenarioId: string; spaceId: string } | undefined
    ): Promise<WorkerArtifacts> => {
      if (closed) return failedRowArtifacts('experiment aborted');
      rowsStarted += 1;
      const rowLabel = describeRow(input);
      const scenario = AUDIT_SCENARIOS.find(({ id }) => id === input?.scenarioId);
      if (!input || !scenario) {
        const error = new Error(
          `Unknown scenario "${input?.scenarioId ?? 'unknown'}" in dataset "${dataset.name}"`
        );
        recordRowError(rowLabel, error);
        return failedRowArtifacts(error.message);
      }
      const { spaceId } = input;
      const errors: unknown[] = [];
      let artifacts: WorkerArtifacts | undefined;
      let seeded: Awaited<ReturnType<typeof seedScenario>> | undefined;
      try {
        // A failed seed removes its own partial writes; if that removal failed too, the error says
        // so and the final clean-space check reports what is left.
        seeded = await seedScenario({ esClient, log, scenario, spaceId });
        const { execution: run, timedOutAfterMs } = await client.run({
          spaceId,
          // The floor worker is enabled with manual autonomy, which keeps true-positive and
          // inconclusive verdicts at the gate.
          floorWorkflowId,
        });
        artifacts = await collectWorkerArtifacts({
          client,
          esClient,
          run,
          runTimedOutAfterMs: timedOutAfterMs,
          spaceId,
          seeded,
          fetch,
          log,
        });
        // Nothing in the runner reviews the seeded discovery, so the row reviews it itself. Its
        // execution id stays out of `dispatchedReviewExecutionIds` so coverage counts stay the runner's.
        if (seeded.seededDiscoveryId !== undefined) {
          // Reviews the runner dispatched and parked at the analyst gate are read by now, and they
          // hold the review workflow's concurrency slot, which the floor-parent run waits on.
          await client.cancelPending();
          const { execution: review, timedOutAfterMs: reviewTimedOut } = await client.runReview({
            spaceId,
            floorWorkflowId,
            attackDiscoveryId: seeded.seededDiscoveryId,
            title: SEEDED_FALSE_POSITIVE_TITLE,
            maxWaitMs: REVIEW_SETTLE_TIMEOUT_MS,
            isDone: isReviewSettled,
          });
          // The floor's own execution comes back when it ends without dispatching the review; its
          // steps are not a review, so it must not be scored as one.
          if (review.workflowId !== REVIEW_WORKFLOW_ID) {
            throw new Error(
              `The floor-parent run did not start the review "${REVIEW_WORKFLOW_ID}": execution ${
                review.id
              } is of workflow "${String(review.workflowId)}" (status ${review.status}).`
            );
          }
          const artifact = await collectReviewArtifact({
            client,
            review,
            timedOutAfterMs: reviewTimedOut,
            fetch,
            spaceId,
          });
          artifacts = {
            ...artifacts,
            seededDiscoveryId: seeded.seededDiscoveryId,
            reviews: [...artifacts.reviews, artifact],
          };
        }
      } catch (error) {
        errors.push(error);
      }
      if (seeded) {
        // Parked reviews are done being read; cancel them so they do not outlive the row. The
        // seed is removed whether or not that worked, and each failure is kept.
        try {
          await client.cancelPending();
        } catch (error) {
          errors.push(error);
        }
        try {
          await cleanupSeed({ esClient, seeded });
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length === 0 && artifacts) return artifacts;
      if (artifacts) {
        // Collect worked but cancel or cleanup did not: the row still fails, and these are the
        // real artifacts it discards.
        log.warning(
          `${rowLabel} discarded collected artifacts (runner ${artifacts.runnerExecutionId} ${artifacts.runnerStatus}, ${artifacts.reviews.length} reviews) because cancel or cleanup failed`
        );
      }
      errors.forEach((error) => recordRowError(rowLabel, error));
      return failedRowArtifacts(errors.map((error) => errorMessage(error)).join('; '));
    };

    const problems: unknown[] = [];
    try {
      await executorClient.runExperiment(
        {
          name: dataset.name,
          datasets: [dataset],
          concurrency: 1,
          metadata: {
            cohort: routing.cohort,
            generation_model: routing.generationModel,
            review_model: routing.reviewModel,
          },
          task: ({ input }) => {
            // The row's seed is already cancelled and cleaned up when `runRow` settles. If the
            // executor rejected meanwhile, the report is built without this row's evaluators
            // (they run after it), so its real output is withheld and the row is reported here.
            const row = runRow(input).then((artifacts) => {
              if (!closed && artifacts.rowError === undefined) {
                lastRealRow = describeRow(input);
              }
              if (!closed || artifacts.rowError !== undefined) return artifacts;
              const reason = 'aborted mid-row; its output is not scored';
              recordRowError(describeRow(input), new Error(reason));
              return failedRowArtifacts(`experiment ${reason}`);
            });
            inFlight.add(row);
            return row.finally(() => inFlight.delete(row));
          },
        },
        // Includes `evaluatorOverrides`: a throw from any evaluator is recorded as a row error, not
        // thrown into the executor. Overrides are opaque test doubles, so they are not given the
        // `rowError` placeholder check the built-in evaluators have; a failed row is reported by
        // `rowErrors` either way.
        withScoreCollection(
          all,
          collector,
          log,
          (input, evaluatorName, error) =>
            rowErrors.push(
              new Error(
                `${describeRow(input)} evaluator ${evaluatorName} failed: ${errorMessage(error)}`,
                {
                  cause: error,
                }
              )
            ),
          pendingEvaluations
        )
      );
    } catch (error) {
      // Backstop: the wrapper above catches evaluator throws, so only an executor-level failure
      // (not one of ours, e.g. its own span or model lookup) should land here. `runExperiment`
      // rejected at once, so a row may still be mid-run and later jobs are still queued: close the
      // gate so none of those seeds, then let every running row finish its cleanup before the
      // space is checked. The job that threw may have left sibling evaluators of its row running
      // on real output (the executor runs them under `Promise.all`), so those are awaited too; their
      // misses and throws are then in the report. Guarantee: every evaluation started on real
      // output before the report is built has settled. A row queued after `closed` is set only gets
      // the placeholder, which scores `ROW_FAILED` and is not tracked, so the loop ends.
      closed = true;
      problems.push(error);
      await Promise.allSettled([...inFlight]);
      while (pendingEvaluations.size > 0) await Promise.allSettled([...pendingEvaluations]);
      if (lastRealRow !== undefined) {
        rowErrors.push(
          new Error(
            `${lastRealRow} was cut short by the executor abort; its scores may be incomplete`
          )
        );
      }
    }
    // Rows queued behind the abort only get the placeholder, and start after `closed` is set, so how
    // many there are is not known here (the executor queues one job per example per repetition).
    // One summary error, not one per row, and no count: it keeps them from reading as passes.
    // They are not part of this report: their scores land after it is built.
    if (closed) {
      rowErrors.push(
        new Error(
          `the experiment aborted after ${rowsStarted} row run(s) started; rows queued after that are skipped (no seed) and are not part of this report`
        )
      );
    }

    logRunSummary({ sink: collector.scores, datasetName: dataset.name, log });
    logQualityMisses({ failures: collector.codeFailures, datasetName: dataset.name, log });
    // Every row has settled, so each space is checked once more: nothing follows the last row to
    // report a late write the way the next row's `seedScenario` does. Row failures, a dirty
    // space, an executor failure and failed code scores are all reported together.
    problems.unshift(...rowErrors);
    const spaceIds = [...new Set(dataset.examples.flatMap(({ input }) => input?.spaceId ?? []))];
    for (const spaceId of spaceIds) {
      try {
        await assertCleanSpace({ esClient, spaceId, when: 'after the last row' });
      } catch (error) {
        problems.push(error);
      }
    }
    try {
      assertCodeScoresPass(dataset.name, collector.codeFailures);
    } catch (error) {
      problems.push(error);
    }
    if (problems.length === 1) throw problems[0];
    if (problems.length > 1) {
      throw new AggregateError(problems, problems.map((error) => errorMessage(error)).join('; '));
    }
  };
