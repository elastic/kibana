/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { DefaultEvaluators, EvalsExecutorClient, Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { AUDIT_SCENARIOS } from '../audit_failure_classes/registry';
import { buildWorkerRows } from '../../datasets/worker_rows';
import { collectWorkerArtifacts } from '../collect';
import type { CohortRouting } from '../cohort_routing';
import { assertCleanSpace, cleanupSeed, seedScenario } from '../seed';
import type { WorkerArtifacts, WorkerExample } from '../worker_types';
import type { AttackDiscoveryWorkerClient } from '../worker_client';
import { createEvaluateDataset } from './dataset_evaluator';

jest.mock('../collect', () => ({ collectWorkerArtifacts: jest.fn() }));
jest.mock('../seed', () => ({
  assertCleanSpace: jest.fn(),
  seedScenario: jest.fn(),
  cleanupSeed: jest.fn(),
}));

/**
 * Positive control for the gate seam. The scorers and the assertion each have unit tests; this
 * drives them as one wired unit (executor, task, evaluator callbacks, score collector, gate)
 * against a stub executor, and checks that known-bad output turns the dataset red while
 * known-good output passes. Without it a wiring regression would leave every row green while
 * measuring nothing.
 */

const collect = collectWorkerArtifacts as jest.MockedFunction<typeof collectWorkerArtifacts>;
const seed = seedScenario as jest.MockedFunction<typeof seedScenario>;
const cleanup = cleanupSeed as jest.MockedFunction<typeof cleanupSeed>;
const assertClean = assertCleanSpace as jest.MockedFunction<typeof assertCleanSpace>;

const routing: CohortRouting = {
  cohort: 'generation',
  generationModel: 'model-under-test',
  reviewModel: 'reference-model',
  runnerConnectorId: 'model-under-test',
  features: [],
};

const rowFor = (scenarioId: string): WorkerExample => {
  const row = buildWorkerRows(routing).find(({ id }) => id === scenarioId);
  if (!row) throw new Error(`no row for ${scenarioId}`);
  return row;
};

const outcome = (stepId: string, attacksPersisted = 0) => ({
  stepId,
  status: 'completed',
  runOutcome: 'completed',
  input: { attacks_persisted: attacksPersisted },
});

const SEEDED_IDS = ['a1', 'a2', 'a3'];

/** A benign row where the Worker found nothing: every applicable CODE check passes. */
const quietArtifacts = (overrides: Partial<WorkerArtifacts> = {}): WorkerArtifacts => ({
  runnerExecutionId: 'run-1',
  runnerStatus: 'completed',
  runnerStepCount: 4,
  seededAlertCount: 3,
  seededAlertIds: SEEDED_IDS,
  openAlertIds: SEEDED_IDS,
  alertsAnalyzed: 3,
  insights: [],
  generationUsage: {
    discoveryCount: 0,
    connectorIds: [],
    models: [],
    discoveriesWithoutConnector: 0,
  },
  persistedAttackIds: [],
  indexedAttackCount: 0,
  fingerprintMatchFailed: false,
  dispatchedReviewExecutionIds: [],
  reviews: [],
  outcomes: [outcome('report_run_completed'), outcome('report_worker_run_completed')],
  ...overrides,
});

/** The attack row where the review parked a true positive at the analyst gate. */
const attackArtifacts = (overrides: Partial<WorkerArtifacts> = {}): WorkerArtifacts => {
  const chainIds = [
    ...(AUDIT_SCENARIOS.find(({ id }) => id === 'positive-chain-with-noise')?.gold.alertGroups[
      'clickfix-chain'
    ] ?? []),
  ];
  return quietArtifacts({
    seededAlertCount: chainIds.length,
    seededAlertIds: chainIds,
    openAlertIds: chainIds,
    alertsAnalyzed: chainIds.length,
    outcomes: [outcome('report_run_completed', 1), outcome('report_worker_run_completed', 1)],
    insights: [
      {
        id: 'attack-1',
        alertIds: chainIds,
        title: 'ClickFix chain',
        summaryMarkdown: 'summary',
        detailsMarkdown: 'details',
      },
    ],
    generationUsage: {
      discoveryCount: 1,
      connectorIds: ['model-under-test'],
      models: [],
      discoveriesWithoutConnector: 0,
    },
    persistedAttackIds: ['attack-1'],
    indexedAttackCount: 1,
    fingerprintReviewCount: 1,
    fingerprintAttachCount: 0,
    fingerprintExistingAttachCount: 0,
    fingerprintSiblingAttackIds: [],
    fingerprintReviewedAttackIds: ['attack-1'],
    dispatchedReviewExecutionIds: ['review-1'],
    reviews: [
      {
        executionId: 'review-1',
        attackDiscoveryId: 'attack-1',
        status: 'waiting_for_input',
        parked: true,
        verdict: 'true_positive',
        investigationOpened: true,
        steps: [],
        analysis: { connectorIds: ['reference-model'], inputTokens: 1, outputTokens: 1 },
      },
    ],
    ...overrides,
  });
};

/**
 * Runs rows the way the real executor does (`kibana_evals_executor/client.ts`): one job per row on
 * a concurrency-1 limiter that starts the next job once the previous one settles, `task` then the
 * evaluators inside the job, no per-row catch, and `Promise.all` over the jobs. The first throw
 * rejects `runExperiment` at once while later queued jobs keep running detached.
 *
 * `abort` models a throw from the executor's own code (a span wrapper, `getModel`) in the job at
 * `index`: `after-task` once that row's task has settled, `during-task` while it is still running.
 */
interface ExecutorAbort {
  index: number;
  when: 'after-task' | 'during-task';
  error: Error;
}

const realStyleExecutor = (abort?: ExecutorAbort): EvalsExecutorClient =>
  ({
    runExperiment: async (
      {
        datasets,
        task,
      }: {
        datasets: Array<{ examples: WorkerExample[] }>;
        task: (example: WorkerExample) => Promise<WorkerArtifacts>;
      },
      evaluators: Array<Evaluator<WorkerExample, WorkerArtifacts>>
    ) => {
      let tail: Promise<unknown> = Promise.resolve();
      const limited = <T>(job: () => Promise<T>): Promise<T> => {
        const run = tail.then(job, job);
        tail = run.catch(() => undefined);
        return run;
      };
      const jobs = datasets.flatMap(({ examples }) =>
        examples.map((example, index) =>
          limited(async () => {
            if (abort?.index === index && abort.when === 'during-task') {
              void task(example);
              throw abort.error;
            }
            const taskOutput = await task(example);
            if (abort?.index === index) throw abort.error;
            await Promise.all(
              evaluators.map((evaluator) =>
                evaluator.evaluate({
                  input: example.input,
                  output: { ...taskOutput, traceId: 'trace-1' } as WorkerArtifacts,
                  expected: example.output,
                  metadata: example.metadata,
                })
              )
            );
          })
        )
      );
      await Promise.all(jobs);
      return [];
    },
    getDatasetRunResults: async () => [],
  } as unknown as EvalsExecutorClient);

const judgeStub = (): Evaluator => ({
  name: 'criteria',
  kind: 'LLM',
  direction: 'maximize',
  evaluate: async () => ({ score: 0, explanation: 'stub judge always disagrees' }),
});

const evaluators = {
  criteria: judgeStub,
  correctnessAnalysis: judgeStub,
  groundednessAnalysis: judgeStub,
} as unknown as DefaultEvaluators;

const log = { info: jest.fn(), warning: jest.fn(), debug: jest.fn() } as unknown as ToolingLog;

const client = {
  run: jest.fn(async () => ({
    execution: { id: 'run-1', status: 'completed', stepExecutions: [] },
  })),
  cancelPending: jest.fn(async () => undefined),
} as unknown as AttackDiscoveryWorkerClient;

const evaluateExamples = (
  examples: WorkerExample[],
  evaluatorOverrides?: Array<Evaluator<WorkerExample, WorkerArtifacts>>
) =>
  createEvaluateDataset({
    client,
    evaluators,
    executorClient: realStyleExecutor(),
    esClient: {} as Client,
    fetch: jest.fn() as unknown as HttpHandler,
    log,
    routing,
  })({
    dataset: { name: 'seam', description: 'real-style', examples },
    evaluatorOverrides,
  });

const evaluateRows = (scenarioIds: string[], abort?: ExecutorAbort) =>
  createEvaluateDataset({
    client,
    evaluators,
    executorClient: realStyleExecutor(abort),
    esClient: {} as Client,
    fetch: jest.fn() as unknown as HttpHandler,
    log,
    routing,
  })({
    dataset: { name: 'seam', description: 'real-style', examples: scenarioIds.map(rowFor) },
  });

const evaluateRow = (scenarioId: string) => evaluateRows([scenarioId]);

/** The settled error of a rejected promise, or a failure when it resolved. */
const rejectionOf = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected the evaluation to reject');
};

describe('createEvaluateDataset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assertClean.mockReset();
    collect.mockReset();
    seed.mockResolvedValue({
      runMarker: 'marker',
      spaceId: 'space',
      goldIdBySeededId: new Map(),
      alertCount: 3,
      openAlertIds: SEEDED_IDS,
    });
  });

  it('seeds, runs the Worker in manual autonomy, routes the runner model and cleans up', async () => {
    collect.mockResolvedValue(quietArtifacts());
    await expect(evaluateRow('benign-batch')).resolves.toBeUndefined();
    expect(client.run).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: expect.objectContaining({ autonomy: 'manual', connector_id: 'model-under-test' }),
      })
    );
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('passes a parked true positive on the attack row, ignoring the judges', async () => {
    collect.mockResolvedValue(attackArtifacts());
    await expect(evaluateRow('positive-chain-with-noise')).resolves.toBeUndefined();
  });

  it('turns the dataset red when the Worker persisted an attack on a benign row', async () => {
    collect.mockResolvedValue(
      quietArtifacts({
        insights: [
          {
            id: 'x',
            alertIds: [],
            title: 'Invented chain',
            summaryMarkdown: '',
            detailsMarkdown: '',
          },
        ],
      })
    );
    await expect(evaluateRow('benign-batch')).rejects.toThrow(/NegativeControl/);
  });

  it('turns the dataset red when the verdict disagrees with gold', async () => {
    const artifacts = attackArtifacts();
    collect.mockResolvedValue(
      attackArtifacts({ reviews: [{ ...artifacts.reviews[0], verdict: 'false_positive' }] })
    );
    await expect(evaluateRow('positive-chain-with-noise')).rejects.toThrow(/VerdictMatchesGold/);
  });

  it('turns the dataset red when a true positive was actioned without an analyst', async () => {
    const artifacts = attackArtifacts();
    collect.mockResolvedValue(
      attackArtifacts({
        reviews: [
          {
            ...artifacts.reviews[0],
            parked: false,
            status: 'completed',
            proposalDecision: 'approved',
          },
        ],
      })
    );
    await expect(evaluateRow('positive-chain-with-noise')).rejects.toThrow(/ParkedAtGate/);
  });

  it('turns the dataset red when generation ran on a model other than the planned one', async () => {
    collect.mockResolvedValue(
      attackArtifacts({
        generationUsage: {
          discoveryCount: 1,
          connectorIds: ['silently-substituted'],
          models: [],
          discoveriesWithoutConnector: 0,
        },
      })
    );
    await expect(evaluateRow('positive-chain-with-noise')).rejects.toThrow(/StageModelResolved/);
  });

  it('turns the dataset red when the review model cannot be determined', async () => {
    const artifacts = attackArtifacts();
    collect.mockResolvedValue(
      attackArtifacts({
        reviews: [{ ...artifacts.reviews[0], analysis: undefined }],
      })
    );
    await expect(evaluateRow('positive-chain-with-noise')).rejects.toThrow(/StageModelResolved/);
  });

  it('turns the dataset red when the verdict is missing rather than counting it as a pass', async () => {
    const artifacts = attackArtifacts();
    collect.mockResolvedValue(
      attackArtifacts({ reviews: [{ ...artifacts.reviews[0], verdict: undefined }] })
    );
    await expect(evaluateRow('positive-chain-with-noise')).rejects.toThrow(/VerdictMatchesGold/);
  });

  it('checks the space once more after the last row and fails when a late write is there', async () => {
    collect.mockResolvedValue(quietArtifacts());
    await evaluateRow('benign-batch');
    expect(assertClean).toHaveBeenCalledTimes(1);
    expect(assertClean).toHaveBeenCalledWith(
      expect.objectContaining({ when: 'after the last row' })
    );

    assertClean.mockRejectedValueOnce(new Error('Space is not clean after the last row'));
    await expect(evaluateRow('benign-batch')).rejects.toThrow(/not clean after the last row/);
  });

  it('reports a dirty space together with failed code scores', async () => {
    collect.mockResolvedValue(quietArtifacts());
    assertClean.mockRejectedValueOnce(new Error('Space is not clean after the last row'));
    await expect(evaluateRow('positive-chain-with-noise')).rejects.toThrow(
      /not clean after the last row.*VerdictMatchesGold|VerdictMatchesGold.*not clean after the last row/s
    );
  });

  it('cancels pending executions and removes the seed even when collection throws', async () => {
    collect.mockRejectedValue(new Error('collect failed'));
    await expect(evaluateRow('benign-batch')).rejects.toThrow(/collect failed/);
    expect(client.cancelPending).toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('still removes the seed when cancelling pending executions throws', async () => {
    collect.mockResolvedValue(quietArtifacts());
    (client.cancelPending as jest.Mock).mockRejectedValueOnce(new Error('cancel failed'));
    await expect(evaluateRow('benign-batch')).rejects.toThrow(/cancel failed/);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('reports a cancel failure under the row, naming the execution', async () => {
    collect.mockResolvedValue(quietArtifacts());
    (client.cancelPending as jest.Mock).mockRejectedValueOnce(
      new Error('Could not cancel execution review-1 (HTTP 500): boom')
    );
    const error = await rejectionOf(evaluateRows(['benign-batch']));
    expect(error.message).toMatch(
      new RegExp(`: benign-batch failed: Could not cancel execution review-1 \\(HTTP 500\\): boom`)
    );
  });

  describe('with an executor that rejects on the first thrown row, like the real one', () => {
    const LAST = 'positive-chain-with-noise';
    const FIRST = 'benign-batch';

    it('reports a seed rejection on the last row together with a dirty space at the final check', async () => {
      collect.mockResolvedValue(quietArtifacts());
      seed
        .mockResolvedValueOnce({
          runMarker: 'm',
          spaceId: 'space',
          goldIdBySeededId: new Map(),
          alertCount: 3,
          openAlertIds: SEEDED_IDS,
        })
        .mockRejectedValueOnce(new Error('seed bulk socket hang up'));
      assertClean.mockImplementation(async ({ when }) => {
        if (when === 'after the last row') throw new Error('late write left alerts behind');
      });
      const error = await rejectionOf(evaluateRows([FIRST, LAST]));
      expect(error.message).toMatch(new RegExp(`${LAST} failed: seed bulk socket hang up`));
      expect(error.message).toMatch(/late write left alerts behind/);
    });

    it('lets row 2 run after a seed rejection on row 1 and reports both', async () => {
      seed.mockRejectedValueOnce(new Error('row one seed failed'));
      collect.mockResolvedValue(attackArtifacts());
      const error = await rejectionOf(evaluateRows([FIRST, LAST]));
      expect(collect).toHaveBeenCalledTimes(1);
      expect(seed).toHaveBeenCalledTimes(2);
      expect(error.message).toMatch(new RegExp(`${FIRST} failed: row one seed failed`));
      // Row 2 was scored: its own scores are in the summary and pass, so only row 1 is a miss.
      expect(error.message).toMatch(/CODE evaluator miss/);
      expect(error.message).not.toMatch(new RegExp(`\\[[^\\]]*${LAST}\\]`));
    });

    it('turns a judge that throws on row 1 into a reported error, and still runs row 2', async () => {
      collect.mockResolvedValueOnce(attackArtifacts()).mockResolvedValueOnce(quietArtifacts());
      assertClean.mockImplementation(async ({ when }) => {
        if (when === 'after the last row') throw new Error('late write left alerts behind');
      });
      const flakyJudge: Evaluator<WorkerExample, WorkerArtifacts> = {
        name: 'FlakyJudge',
        kind: 'LLM',
        evaluate: async ({ input }: { input?: { scenarioId?: string } }) => {
          if (input?.scenarioId === LAST) throw new Error('Missing scores for criterion 2');
          return { score: 1 };
        },
      } as unknown as Evaluator<WorkerExample, WorkerArtifacts>;
      const error = await rejectionOf(
        evaluateExamples([rowFor(LAST), rowFor(FIRST)], [flakyJudge])
      );
      // Row 2's collect ran before the evaluation settled: nothing was left detached.
      expect(collect).toHaveBeenCalledTimes(2);
      expect(seed).toHaveBeenCalledTimes(2);
      expect(error.message).toMatch(
        new RegExp(`: ${LAST} evaluator FlakyJudge failed: Missing scores for criterion 2`)
      );
      expect(error.message).toMatch(/late write left alerts behind/);
    });

    it('reports a throwing built-in judge with its space, scenario and evaluator name', async () => {
      collect.mockResolvedValueOnce(attackArtifacts()).mockResolvedValueOnce(quietArtifacts());
      const throwingJudge = () =>
        ({
          name: 'criteria',
          kind: 'LLM',
          evaluate: async () => {
            throw new Error('inference connector unavailable');
          },
        } as unknown as Evaluator);
      const error = await rejectionOf(
        createEvaluateDataset({
          client,
          evaluators: {
            criteria: throwingJudge,
            correctnessAnalysis: throwingJudge,
            groundednessAnalysis: throwingJudge,
          } as unknown as DefaultEvaluators,
          executorClient: realStyleExecutor(),
          esClient: {} as Client,
          fetch: jest.fn() as unknown as HttpHandler,
          log,
          routing,
        })({
          dataset: {
            name: 'seam',
            description: 'real-style',
            examples: [rowFor(LAST), rowFor(FIRST)],
          },
        })
      );
      expect(collect).toHaveBeenCalledTimes(2);
      expect(error.message).toMatch(
        /: positive-chain-with-noise evaluator (DiscoveryNarrativeRubric|VerdictRationaleRubric) failed: inference connector unavailable/
      );
    });

    it('does not throw from a CODE evaluator on a row whose input is undefined', async () => {
      const noInput = { ...rowFor(FIRST), input: undefined } as unknown as WorkerExample;
      const error = await rejectionOf(evaluateExamples([noInput]));
      expect(error).not.toBeInstanceOf(TypeError);
      expect(error.message).toContain(
        'unknown row failed: Unknown scenario "unknown" in dataset "seam"'
      );
      expect(error.message).not.toMatch(/: unknown failed/);
      expect(error.message).toMatch(/CODE evaluator miss/);
      expect(error.message).toMatch(
        /unknown row.*(ROW_FAILED|miss)|(ROW_FAILED|miss).*unknown row/s
      );
    });

    it('reports a collect error and a cleanup error from the same row', async () => {
      collect.mockRejectedValue(new Error('collect blew up'));
      cleanup.mockRejectedValueOnce(new Error('cleanup blew up'));
      const error = await rejectionOf(evaluateRows([FIRST]));
      expect(error.message).toMatch(/collect blew up/);
      expect(error.message).toMatch(/cleanup blew up/);
    });

    it('counts a failed row as code misses, never as passes or N/A', async () => {
      seed.mockRejectedValueOnce(new Error('seed failed'));
      const error = await rejectionOf(evaluateRows([FIRST]));
      expect(error.message).toMatch(/CODE evaluator miss/);
      expect(error.message).toMatch(/: benign-batch: \d+ code evaluator\(s\) ROW_FAILED/);
      // One line for the row, not one per evaluator.
      expect(error.message.match(/ROW_FAILED/g)).toHaveLength(1);
    });

    describe('when the executor itself throws', () => {
      const ROWS = [
        'benign-batch',
        'shared-ci-egress',
        'same-display-name-cross-account',
        'threshold-meta-alerts',
      ];
      const executorError = new Error('executor span failed');

      it('does not seed queued rows after the executor rejected, and says they did not run', async () => {
        collect.mockResolvedValue(quietArtifacts());
        const error = await rejectionOf(
          evaluateRows(ROWS, { index: 0, when: 'after-task', error: executorError })
        );
        const seedCallsAtSettle = seed.mock.calls.length;
        // Let the jobs still queued in the executor's limiter start.
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(seed).toHaveBeenCalledTimes(seedCallsAtSettle);
        // The next job can start in the same tick the executor rejects; it is awaited, not
        // detached. The rest never start.
        expect(seedCallsAtSettle).toBeLessThan(ROWS.length);
        expect(error.message).toContain('executor span failed');
        expect(error.message).toContain(
          `${ROWS.length - seedCallsAtSettle} queued row(s) did not run`
        );
      });

      it('rejects with the executor error itself when nothing else went wrong', async () => {
        collect.mockResolvedValue(quietArtifacts());
        const error = await rejectionOf(
          evaluateRows(ROWS.slice(0, 1), { index: 0, when: 'after-task', error: executorError })
        );
        expect(error.message).toContain('executor span failed');
        expect(error.message).not.toMatch(/did not run/);
      });

      it('checks the space only after the row that was still running has cleaned up', async () => {
        collect.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(quietArtifacts()), 20))
        );
        const error = await rejectionOf(
          evaluateRows(ROWS, { index: 0, when: 'during-task', error: executorError })
        );
        expect(error.message).toContain('executor span failed');
        const finalCheck = assertClean.mock.calls.findIndex(
          ([args]) => args.when === 'after the last row'
        );
        expect(finalCheck).toBeGreaterThanOrEqual(0);
        // Every row that started was cleaned up before the space was checked.
        expect(cleanup).toHaveBeenCalledTimes(seed.mock.calls.length);
        cleanup.mock.invocationCallOrder.forEach((order) =>
          expect(order).toBeLessThan(assertClean.mock.invocationCallOrder[finalCheck])
        );
      });
    });

    it('runs the final clean-space check even though the executor would have rejected', async () => {
      seed.mockRejectedValueOnce(new Error('seed failed'));
      await rejectionOf(evaluateRows([FIRST]));
      expect(assertClean).toHaveBeenCalledWith(
        expect.objectContaining({ when: 'after the last row' })
      );
    });
  });
});
