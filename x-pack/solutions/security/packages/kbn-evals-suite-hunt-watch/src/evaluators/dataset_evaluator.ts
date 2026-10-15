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
import { collectHuntArtifacts, type HuntArtifacts } from '../collect';
import type { HuntWatchClient } from '../hunt_watch_client';
import { applyHuntFault, resetHuntReport } from '../seed_hunt_data';
import type { HuntExpected, HuntWatchExample } from '../types';
import { CODE_SCORERS, scoreCanaryTripped, type CodeScore } from './code_scores';
import {
  createJudgeEvaluators,
  expectsNoNarrative,
  narrativeOf,
  runJudgeAnalyses,
  type JudgeProvenance,
} from './judge_analysis';
import {
  assertCodeScoresPass,
  createRunCollector,
  logRunSummary,
  withScoreCollection,
} from './run_summary';

export type HuntEvaluator = Evaluator<HuntWatchExample, HuntArtifacts>;

const DIRECTION = 'maximize' as const;

const toCodeEvaluator = (
  name: string,
  scorer: (expected: HuntExpected, artifacts: HuntArtifacts) => CodeScore
): HuntEvaluator => ({
  name,
  kind: 'CODE',
  direction: DIRECTION,
  evaluate: async ({ output, expected }) => scorer(expected.expected, output),
});

export const createCodeEvaluators = (): HuntEvaluator[] =>
  Object.entries(CODE_SCORERS).map(([name, scorer]) => toCodeEvaluator(name, scorer));

/** Inverted canary check: 1 means the Worker invented nothing from a prose-only report. */
export const createCanaryEvaluators = (): HuntEvaluator[] => [
  toCodeEvaluator('Canary Inverted', scoreCanaryTripped),
];

/** LLM rubric over the Investigation narrative; reported, never gated. */
export const createNarrativeRubricEvaluator = (
  evaluators: DefaultEvaluators,
  judge?: JudgeProvenance
): HuntEvaluator => ({
  name: 'Narrative Rubric',
  kind: 'LLM',
  direction: DIRECTION,
  evaluate: async ({ input, output, expected }) => {
    const { criteria } = expected;
    if (criteria.length === 0) {
      return { score: null, label: 'N/A', explanation: 'row has no rubric criteria' };
    }
    if (expectsNoNarrative(expected.expected)) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'row expects no Investigation narrative, so there is nothing to judge',
      };
    }
    const narrative = narrativeOf(output);
    if (!narrative) {
      return { score: null, label: 'MISSING', explanation: 'no narrative was posted to evaluate' };
    }
    const result = await evaluators.criteria(criteria).evaluate({
      input,
      output: narrative,
      expected,
      metadata: undefined,
    });
    return {
      ...result,
      metadata: {
        ...(result.metadata as Record<string, unknown> | undefined),
        ...(judge ? { judge } : {}),
      },
    };
  },
});

export const createEvaluateDataset =
  ({
    huntWatchClient,
    evaluators,
    executorClient,
    esClient,
    fetch,
    log,
    judge,
    kibanaUrl,
  }: {
    huntWatchClient: HuntWatchClient;
    evaluators: DefaultEvaluators;
    executorClient: EvalsExecutorClient;
    esClient: Client;
    fetch: HttpHandler;
    log: ToolingLog;
    judge?: JudgeProvenance;
    kibanaUrl?: string;
  }) =>
  async ({
    dataset,
    evaluatorOverrides,
  }: {
    dataset: EvaluationDataset<HuntWatchExample>;
    evaluatorOverrides?: HuntEvaluator[];
  }): Promise<void> => {
    const all = evaluatorOverrides ?? [
      ...createCodeEvaluators(),
      createNarrativeRubricEvaluator(evaluators, judge),
      ...createJudgeEvaluators(judge),
    ];
    const judged = evaluatorOverrides === undefined;
    const collector = createRunCollector();
    log.info(`Running Hunt Watch evaluation: "${dataset.name}" (${dataset.examples.length} rows)`);

    await executorClient.runExperiment(
      {
        name: dataset.name,
        datasets: [dataset],
        concurrency: 1,
        task: async ({ input, output }) => {
          const { spaceId, reportIds, fault } = input;
          // Reset first so every row starts from an unhunted report and no Investigation, then
          // stage the row's fault on that clean slate.
          for (const reportId of reportIds) {
            await resetHuntReport({ esClient, fetch, log, reportId, spaceId });
            if (fault) {
              await applyHuntFault({ fault, fetch, log, reportId, spaceId });
            }
          }
          const run = await huntWatchClient.run({ spaceId, reportIds });
          const artifacts = await collectHuntArtifacts({ run, reportIds, fetch, esClient, log });
          if (!judged) return artifacts;
          const analyses = await runJudgeAnalyses({
            evaluators,
            example: { input, output },
            artifacts,
            kibanaUrl,
            log,
          });
          return { ...artifacts, ...analyses };
        },
      },
      withScoreCollection(all, collector, log)
    );

    logRunSummary({ sink: collector.scores, datasetName: dataset.name, log });
    assertCodeScoresPass(dataset.name, collector.codeFailures);
  };
