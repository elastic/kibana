/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Pins the run-summary contract CAPABILITY_PROFILE.md documents: `repetitions`
// does not multiply the summaries. The executor loops every repetition inside a
// single `runExperiment` call (kbn_evals_executor/client.ts), which leaves one
// score sink and one `logRunSummary` per dataset execution, so `n` is pooled over
// all repetitions and no per-repetition breakdown is emitted.

import type { Client as TraceEsClient } from '@elastic/elasticsearch';
import type {
  DatasetRunResult,
  DefaultEvaluators,
  EvaluationDataset,
  EvalsExecutorClient,
} from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { goldenDataset, type RuleCreationExample } from '../../datasets/golden';
import type { RuleCreationClient, RuleCreationResult } from '../rule_creation_client';
import {
  createEvaluateDataset,
  RULE_EVALUATOR_DIRECTION,
  type RuleEvaluator,
} from './dataset_evaluator';
import { logRunSummary, withScoreCollection, type ScoreSink } from './run_summary';

const EXAMPLES = goldenDataset.slice(0, 2);
const REPETITIONS = 3;

// Two examples land on opposite scores, so a pooled mean sits between the
// extremes and `n` states how many example-runs the line was built from.
const OUTCOME_EVALUATOR_NAME = 'Test Outcome';
const firstTechnique = EXAMPLES[0].input.technique;

const outcomeEvaluator = (): RuleEvaluator => ({
  direction: RULE_EVALUATOR_DIRECTION,
  name: OUTCOME_EVALUATOR_NAME,
  kind: 'CODE',
  evaluate: async ({ input }) => ({
    score: input.technique === firstTechnique ? 1 : 0,
  }),
});

interface RunExperimentArgs {
  datasets: Array<EvaluationDataset<RuleCreationExample>>;
  task: (example: RuleCreationExample) => Promise<RuleCreationResult>;
}

// Mirrors `runSingleDatasetExperiment`: every repetition is scored against the
// same evaluator list, hence against the same score sink.
const makeExecutor = () => {
  const runExperiment = jest.fn(
    async (args: RunExperimentArgs, evaluators: RuleEvaluator[]): Promise<DatasetRunResult[]> => {
      for (let rep = 0; rep < REPETITIONS; rep++) {
        for (const example of args.datasets[0].examples) {
          const output = await args.task(example);
          for (const evaluator of evaluators) {
            await evaluator.evaluate({
              input: example.input,
              output,
              expected: example.output,
              metadata: undefined,
            });
          }
        }
      }
      return [];
    }
  );
  return runExperiment;
};

const makeLogger = () => {
  const lines: string[] = [];
  const log = {
    info: (message: string) => {
      lines.push(message);
    },
  } as unknown as ToolingLog;
  return { log, lines };
};

const summaryLines = (lines: string[]) => lines.filter((line) => line.startsWith('📊 '));

const makeEvaluateDataset = (log: ToolingLog, runExperiment: ReturnType<typeof makeExecutor>) =>
  createEvaluateDataset({
    ruleCreationClient: {
      run: async () => ({ rule: undefined } as unknown as RuleCreationResult),
    } as unknown as RuleCreationClient,
    evaluators: {} as DefaultEvaluators,
    executorClient: { runExperiment } as unknown as EvalsExecutorClient,
    esClient: {} as EsClient,
    traceEsClient: {} as TraceEsClient,
    log,
  });

const DATASET: EvaluationDataset<RuleCreationExample> = {
  name: 'golden',
  description: 'run-summary contract fixture',
  examples: EXAMPLES,
};

describe('evaluate dataset run summary', () => {
  it('logs one summary per evaluator, with n pooled over every repetition', async () => {
    const { log, lines } = makeLogger();
    const runExperiment = makeExecutor();
    const evaluateDataset = makeEvaluateDataset(log, runExperiment);

    await evaluateDataset({ dataset: DATASET, evaluatorOverrides: [outcomeEvaluator()] });

    expect(runExperiment).toHaveBeenCalledTimes(1);
    expect(summaryLines(lines)).toEqual([
      `📊 golden | ${OUTCOME_EVALUATOR_NAME}: mean 0.500 ±0.438 (n=${
        EXAMPLES.length * REPETITIONS
      })`,
    ]);
  });
});

describe('withScoreCollection', () => {
  it('keeps every observed score, so repeated passes pool into the sink', async () => {
    const sink: ScoreSink = new Map();
    const [wrapped] = withScoreCollection([outcomeEvaluator()], sink);
    const params = {
      input: EXAMPLES[0].input,
      output: {} as RuleCreationResult,
      expected: EXAMPLES[0].output,
      metadata: undefined,
    };

    await wrapped.evaluate(params);
    await wrapped.evaluate(params);

    expect(sink.get(OUTCOME_EVALUATOR_NAME)).toEqual([1, 1]);
  });
});

describe('logRunSummary', () => {
  it('prints exactly one line per evaluator regardless of its pooled sample size', () => {
    const { log, lines } = makeLogger();
    const sink: ScoreSink = new Map([
      [OUTCOME_EVALUATOR_NAME, [1, 0, 1, 0, 1, 0]],
      ['Partial', [null, 1]],
    ]);

    const rows = logRunSummary({ sink, datasetName: 'golden', log });

    expect(rows.map((row) => row.stats.n)).toEqual([6, 1]);
    expect(summaryLines(lines)).toHaveLength(2);
  });
});
