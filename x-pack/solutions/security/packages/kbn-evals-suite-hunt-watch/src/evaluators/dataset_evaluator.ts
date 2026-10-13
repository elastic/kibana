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
import { resetHuntReport } from '../seed_hunt_data';
import type { HuntWatchExample } from '../types';
import { CODE_SCORERS, scoreCanaryTripped, type CodeScore } from './code_scores';
import { logRunSummary, withScoreCollection, type ScoreSink } from './run_summary';

export type HuntEvaluator = Evaluator<HuntWatchExample, HuntArtifacts>;

const DIRECTION = 'maximize' as const;

const toCodeEvaluator = (
  name: string,
  scorer: (example: HuntWatchExample, artifacts: HuntArtifacts) => CodeScore
): HuntEvaluator => ({
  name,
  kind: 'CODE',
  direction: DIRECTION,
  evaluate: async ({ input, output, expected }) => {
    const example = { input, output: expected } as unknown as HuntWatchExample;
    const { score, label, explanation, metadata } = scorer(example, output);
    return { score, label, explanation, metadata };
  },
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
  judge?: { judgeConnectorId: string; judgeConnectorName?: string }
): HuntEvaluator => ({
  name: 'Narrative Rubric',
  kind: 'LLM',
  direction: DIRECTION,
  evaluate: async ({ input, output, expected }) => {
    const criteria = (expected as unknown as HuntWatchExample['output']).criteria ?? [];
    const narrative = Object.values(output.reports)
      .map((r) => r.narrative)
      .filter(Boolean)
      .join('\n\n---\n\n');
    if (criteria.length === 0) {
      return { score: null, label: 'N/A', explanation: 'row has no rubric criteria' };
    }
    const reports = (expected as unknown as HuntWatchExample['output']).expected.reports;
    if (reports.every((r) => r.investigationStatus === 'none')) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'row expects no Investigation, so there is no narrative to judge',
      };
    }
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
  }: {
    huntWatchClient: HuntWatchClient;
    evaluators: DefaultEvaluators;
    executorClient: EvalsExecutorClient;
    esClient: Client;
    fetch: HttpHandler;
    log: ToolingLog;
    judge?: { judgeConnectorId: string; judgeConnectorName?: string };
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
    ];
    const sink: ScoreSink = new Map();
    log.info(`Running Hunt Watch evaluation: "${dataset.name}" (${dataset.examples.length} rows)`);

    await executorClient.runExperiment(
      {
        name: dataset.name,
        datasets: [dataset],
        concurrency: 1,
        task: async ({ input }) => {
          const { spaceId, reportIds } = input;
          // Reset first so every row starts from an unhunted report and no Investigation.
          for (const reportId of reportIds) {
            await resetHuntReport({ esClient, fetch, log, reportId, spaceId });
          }
          const run = await huntWatchClient.run({ spaceId, reportIds });
          return collectHuntArtifacts({ run, reportIds, fetch, esClient, log });
        },
      },
      withScoreCollection(all, sink, log)
    );

    logRunSummary({ sink, datasetName: dataset.name, log });
  };
