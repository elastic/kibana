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
import { collectWorkerArtifacts } from '../collect';
import type { CohortRouting } from '../cohort_routing';
import { SCHEDULE_INTERVAL } from '../constants';
import { cleanupSeed, seedScenario } from '../seed';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import type { AttackDiscoveryWorkerClient } from '../worker_client';
import type { Stage, WorkerArtifacts, WorkerExample, WorkerExpected } from '../worker_types';
import { createAuditConditionalRemediationEvaluator } from './audit_conditional_remediation_evaluator';
import { createAuditForbiddenJoinEvaluator } from './audit_forbidden_join_evaluator';
import { createAuditMetaAlertAsEvidenceEvaluator } from './audit_meta_alert_as_evidence_evaluator';
import { createAuditNegativeControlEvaluator } from './audit_negative_control_evaluator';
import { createAuditPositiveControlRecallEvaluator } from './audit_positive_control_recall_evaluator';
import { CODE_SCORERS } from './code_scores';
import {
  assertCodeScoresPass,
  createRunCollector,
  logRunSummary,
  withScoreCollection,
} from './run_summary';

export type WorkerEvaluator = Evaluator<WorkerExample, WorkerArtifacts>;

export interface JudgeProvenance {
  judgeConnectorId: string;
  judgeConnectorName?: string;
}

const DIRECTION = 'maximize' as const;

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
  CODE_SCORERS.map(({ name, stage, scorer }) =>
    withRoutingMetadata(
      {
        name,
        kind: 'CODE',
        direction: DIRECTION,
        evaluate: async ({ output, expected }) =>
          expected
            ? scorer(expected, output)
            : { score: null, label: 'MISSING', explanation: 'row has no expected block' },
      },
      stage,
      routing
    )
  );

/** The audit evaluators score the baseline gold, which is what the runner's alerts carry. */
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
      evaluate: ({ input, output }) =>
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
    judge,
  }: {
    client: AttackDiscoveryWorkerClient;
    evaluators: DefaultEvaluators;
    executorClient: EvalsExecutorClient;
    esClient: Client;
    fetch: HttpHandler;
    log: ToolingLog;
    routing: CohortRouting;
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
        task: async ({ input }) => {
          const scenario = AUDIT_SCENARIOS.find(({ id }) => id === input?.scenarioId);
          if (!input || !scenario) {
            throw new Error(`Unknown scenario "${input?.scenarioId}" in dataset "${dataset.name}"`);
          }
          const { spaceId } = input;
          const seeded = await seedScenario({ esClient, log, scenario, spaceId });
          try {
            const { execution: run, timedOutAfterMs } = await client.run({
              spaceId,
              inputs: {
                schedule_interval: SCHEDULE_INTERVAL,
                // Manual autonomy keeps true-positive and inconclusive verdicts at the gate.
                autonomy: 'manual',
                ...(routing.runnerConnectorId ? { connector_id: routing.runnerConnectorId } : {}),
              },
            });
            return await collectWorkerArtifacts({
              client,
              run,
              runTimedOutAfterMs: timedOutAfterMs,
              spaceId,
              seeded,
              fetch,
              log,
            });
          } finally {
            // Parked reviews are done being read; cancel them so they do not outlive the row.
            await client.cancelPending();
            await cleanupSeed({ esClient, log, seeded });
          }
        },
      },
      withScoreCollection(all, collector, log)
    );

    logRunSummary({ sink: collector.scores, datasetName: dataset.name, log });
    assertCodeScoresPass(dataset.name, collector.codeFailures);
  };
