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
import { WORKER_AUDIT_SCENARIOS } from '../scenarios';
import { buildWorkerRows } from '../../datasets/worker_rows';
import { collectReviewArtifact, collectWorkerArtifacts } from '../collect';
import type { CohortRouting } from '../cohort_routing';
import { assertCleanSpace, cleanupSeed, seedScenario } from '../seed';
import type { ReviewArtifact, WorkerArtifacts, WorkerExample } from '../worker_types';
import type { AttackDiscoveryWorkerClient } from '../worker_client';
import {
  chainAlertIdsOf,
  createAuditEvaluators,
  createCodeEvaluators,
  createEvaluateDataset,
} from './dataset_evaluator';

jest.mock('../collect', () => ({
  collectWorkerArtifacts: jest.fn(),
  collectReviewArtifact: jest.fn(),
  isReviewSettled: jest.fn(() => true),
  // Real on purpose: it reads the run the stubbed client returns, which is how the row learns
  // which discoveries are its own.
  generationUuidsOf: jest.requireActual('../collect').generationUuidsOf,
}));
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
const collectReview = collectReviewArtifact as jest.MockedFunction<typeof collectReviewArtifact>;
const seed = seedScenario as jest.MockedFunction<typeof seedScenario>;
const cleanup = cleanupSeed as jest.MockedFunction<typeof cleanupSeed>;
const assertClean = assertCleanSpace as jest.MockedFunction<typeof assertCleanSpace>;

const routing: CohortRouting = {
  cohort: 'whole',
  generationModel: 'model-under-test',
  reviewModel: 'model-under-test',
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
  stepTimings: [],
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
const attackArtifacts = (
  overrides: Partial<WorkerArtifacts> = {},
  scenarioId = 'positive-chain-with-noise'
): WorkerArtifacts => {
  const chainIds = [
    ...(WORKER_AUDIT_SCENARIOS.find(({ id }) => id === scenarioId)?.gold.alertGroups[
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
        alertIds: [...chainIds],
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
        analysis: { connectorIds: ['model-under-test'], inputTokens: 1, outputTokens: 1 },
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
 * `abort` models a throw from the executor's own code (a span wrapper, `getModel`) in the job of
 * the example at `index` in repetition 0: `after-task` once that row's task has settled,
 * `during-task` while it is still running, `during-scoring` once its first evaluator has resolved
 * while its siblings (run under `Promise.all`, as the real executor does) are still pending.
 *
 * `repetitions` queues one job per example per repetition, repetition-major like `client.ts`.
 *
 * `onJobs` receives the queued job promises as soon as they exist, so a test can await the jobs
 * that outlive the rejected `runExperiment` (`Promise.allSettled(jobs)`) or react to one job's
 * rejection, without any timer. A `during-task` row's task keeps running after the throw, and the
 * real executor then scores its output; `onJobs` also receives that scoring promise (it resolves
 * to the evaluator results).
 */
interface ExecutorAbort {
  index: number;
  when: 'after-task' | 'during-task' | 'during-scoring';
  error: Error;
}

const realStyleExecutor = (
  abort?: ExecutorAbort,
  onJobs?: (jobs: Array<Promise<void>>, detachedScoring: Array<Promise<unknown[]>>) => void,
  repetitions = 1
): EvalsExecutorClient =>
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
      const startScoring = (example: WorkerExample, taskOutput: WorkerArtifacts) =>
        evaluators.map((evaluator) =>
          evaluator.evaluate({
            input: example.input,
            output: { ...taskOutput, traceId: 'trace-1' } as WorkerArtifacts,
            expected: example.output,
            metadata: example.metadata,
          })
        );
      const score = (example: WorkerExample, taskOutput: WorkerArtifacts) =>
        Promise.all(startScoring(example, taskOutput));
      const detachedScoring: Array<Promise<unknown[]>> = [];
      const jobs = Array.from({ length: repetitions }, (_, rep) => rep).flatMap((rep) =>
        datasets.flatMap(({ examples }) =>
          examples.map((example, index) =>
            limited(async () => {
              const aborts = rep === 0 && abort?.index === index ? abort : undefined;
              if (aborts?.when === 'during-task') {
                detachedScoring.push(
                  task(example).then((taskOutput) => score(example, taskOutput))
                );
                throw aborts.error;
              }
              const taskOutput = await task(example);
              if (aborts?.when === 'during-scoring') {
                const running = startScoring(example, taskOutput);
                detachedScoring.push(Promise.all(running));
                await running[0];
                throw aborts.error;
              }
              if (aborts) throw aborts.error;
              await score(example, taskOutput);
            })
          )
        )
      );
      onJobs?.(jobs, detachedScoring);
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
  runReview: jest.fn(async () => ({
    execution: {
      id: 'review-1',
      workflowId: 'system-security-attack-discovery-review',
      status: 'completed',
      stepExecutions: [],
    },
  })),
  runViaFloorParent: jest.fn(async () => ({
    execution: {
      id: 'run-batched',
      workflowId: 'system-security-attack-discovery-worker',
      status: 'completed',
      stepExecutions: [],
    },
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
    floorWorkflowId: 'floor-wf',
  })({
    dataset: { name: 'seam', description: 'real-style', examples },
    evaluatorOverrides,
  });

const evaluateRows = (
  scenarioIds: string[],
  abort?: ExecutorAbort,
  onJobs?: (jobs: Array<Promise<void>>, detachedScoring: Array<Promise<unknown[]>>) => void,
  repetitions = 1
) =>
  createEvaluateDataset({
    client,
    evaluators,
    executorClient: realStyleExecutor(abort, onJobs, repetitions),
    esClient: {} as Client,
    fetch: jest.fn() as unknown as HttpHandler,
    log,
    routing,
    floorWorkflowId: 'floor-wf',
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
      worldDocs: [],
    });
  });

  it('seeds, starts the floor worker in the eval space and cleans up', async () => {
    collect.mockResolvedValue(quietArtifacts());
    await expect(evaluateRow('benign-batch')).resolves.toBeUndefined();
    expect(client.run).toHaveBeenCalledWith(
      expect.objectContaining({
        floorWorkflowId: 'floor-wf',
      })
    );
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  describe('the large-batch row', () => {
    it('starts the runner through the floor parent with batch_size 50 and literal inputs', async () => {
      collect.mockResolvedValue(attackArtifacts({}, 'positive-chain-large-batch'));
      await expect(evaluateRow('positive-chain-large-batch')).resolves.toBeUndefined();
      expect(client.runViaFloorParent).toHaveBeenCalledWith(
        expect.objectContaining({
          floorWorkflowId: 'floor-wf',
          targetWorkflowId: 'system-security-attack-discovery-worker',
          inputs: { schedule_interval: '24h', max_alerts: 10000, batch_size: 50 },
        })
      );
      expect(client.run).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('leaves every other row on the plain runner start, with no batch size', async () => {
      collect.mockResolvedValue(attackArtifacts());
      await expect(evaluateRow('positive-chain-with-noise')).resolves.toBeUndefined();
      expect(client.run).toHaveBeenCalledTimes(1);
      expect(client.runViaFloorParent).not.toHaveBeenCalled();
    });

    it('fails the row when the floor ended without starting the runner, and reads no artifact', async () => {
      collect.mockResolvedValue(quietArtifacts());
      (client.runViaFloorParent as jest.Mock).mockResolvedValueOnce({
        execution: {
          id: 'floor-1',
          workflowId: 'floor-wf',
          status: 'completed',
          stepExecutions: [],
        },
      });
      await expect(evaluateRow('positive-chain-large-batch')).rejects.toThrow(
        /did not start the runner.*execution floor-1.*"floor-wf"/
      );
      expect(collect).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  it('dispatches the review workflow itself on the seeded false-positive row', async () => {
    const seededDiscoveryId = 'a'.repeat(64);
    seed.mockResolvedValue({
      runMarker: 'marker',
      spaceId: 'space',
      goldIdBySeededId: new Map(),
      alertCount: 4,
      openAlertIds: SEEDED_IDS,
      worldDocs: [],
      seededDiscoveryId,
    });
    collect.mockResolvedValue(quietArtifacts());
    collectReview.mockResolvedValue({
      executionId: 'review-1',
      attackDiscoveryId: seededDiscoveryId,
      status: 'completed',
      parked: false,
      verdict: 'false_positive',
      investigationOpened: true,
      steps: [],
      analysis: { connectorIds: ['model-under-test'], inputTokens: 1, outputTokens: 1 },
    });
    await expect(evaluateRow('seeded-false-positive')).resolves.toBeUndefined();
    expect(client.runReview).toHaveBeenCalledWith(
      expect.objectContaining({
        attackDiscoveryId: seededDiscoveryId,
        floorWorkflowId: expect.any(String),
      })
    );
    expect(collectReview).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'ad-worker-eval', fetch: expect.any(Function) })
    );
    // The row folds the seeded review in so the verdict checks score it; gold is false_positive.
    expect(qualityMissWarning()).toBeUndefined();
  });

  describe('the seeded false-positive row', () => {
    const seededDiscoveryId = 'a'.repeat(64);
    const settledReview: ReviewArtifact = {
      executionId: 'review-1',
      attackDiscoveryId: seededDiscoveryId,
      status: 'completed',
      parked: false,
      verdict: 'false_positive',
      investigationOpened: true,
      steps: [],
      analysis: { connectorIds: ['model-under-test'], inputTokens: 1, outputTokens: 1 },
    };
    const seedWithDiscovery = () =>
      seed.mockResolvedValue({
        runMarker: 'marker',
        spaceId: 'space',
        goldIdBySeededId: new Map(),
        alertCount: 4,
        openAlertIds: SEEDED_IDS,
        worldDocs: [],
        seededDiscoveryId,
      });

    it('fails the row when the floor ended without starting the review, and reads no artifact', async () => {
      seedWithDiscovery();
      collect.mockResolvedValue(quietArtifacts());
      (client.runReview as jest.Mock).mockResolvedValueOnce({
        execution: {
          id: 'floor-1',
          workflowId: 'floor-wf',
          status: 'completed',
          stepExecutions: [],
        },
      });
      await expect(evaluateRow('seeded-false-positive')).rejects.toThrow(
        /did not start the review.*execution floor-1.*"floor-wf"/
      );
      expect(collectReview).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('gates the row on ReviewsSettled when the review ran out of time', async () => {
      seedWithDiscovery();
      collect.mockResolvedValue(quietArtifacts());
      (client.runReview as jest.Mock).mockResolvedValueOnce({
        execution: {
          id: 'review-1',
          workflowId: 'system-security-attack-discovery-review',
          status: 'running',
          stepExecutions: [],
        },
        timedOutAfterMs: 20 * 60_000,
      });
      collectReview.mockImplementation(async ({ timedOutAfterMs }) => ({
        ...settledReview,
        status: 'running',
        timedOutAfterMs,
      }));
      await expect(evaluateRow('seeded-false-positive')).rejects.toThrow(
        /ReviewsSettled.*timed out after 20m/s
      );
    });

    it('reports a rejected review as a row error and still removes the seed', async () => {
      seedWithDiscovery();
      collect.mockResolvedValue(quietArtifacts());
      (client.runReview as jest.Mock).mockRejectedValueOnce(new Error('floor PUT refused'));
      await expect(evaluateRow('seeded-false-positive')).rejects.toThrow(
        /seeded-false-positive failed: floor PUT refused/
      );
      expect(client.cancelPending).toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('cancels the runner-dispatched reviews that are parked before the floor is rewritten', async () => {
      seedWithDiscovery();
      const events: string[] = [];
      const parked: string[] = [];
      // Collecting makes the client track a review the runner dispatched and left at the analyst
      // gate (`collect.ts` calls `client.track`); it holds the review workflow's slot until cancelled.
      collect.mockImplementation(async () => {
        parked.push('parked-review');
        return quietArtifacts();
      });
      collectReview.mockResolvedValue(settledReview);
      (client.cancelPending as jest.Mock).mockImplementationOnce(async () => {
        events.push(...parked.splice(0).map((id) => `cancel ${id}`));
      });
      (client.runReview as jest.Mock).mockImplementationOnce(async () => {
        events.push('floor rewrite');
        return {
          execution: {
            id: 'review-1',
            workflowId: 'system-security-attack-discovery-review',
            status: 'completed',
            stepExecutions: [],
          },
        };
      });
      await expect(evaluateRow('seeded-false-positive')).resolves.toBeUndefined();
      expect(events).toEqual(['cancel parked-review', 'floor rewrite']);
    });

    it('keeps the seeded review out of the runner-dispatched review ids', async () => {
      seedWithDiscovery();
      collect.mockResolvedValue(
        quietArtifacts({ dispatchedReviewExecutionIds: ['runner-review'] })
      );
      collectReview.mockResolvedValue(settledReview);
      const seen: WorkerArtifacts[] = [];
      const capture = {
        name: 'Capture',
        kind: 'CODE',
        evaluate: async ({ output }: { output: WorkerArtifacts }) => {
          seen.push(output);
          return { score: 1 };
        },
      } as unknown as Evaluator<WorkerExample, WorkerArtifacts>;
      await evaluateExamples([rowFor('seeded-false-positive')], [capture]);
      expect(seen).toHaveLength(1);
      expect(seen[0].dispatchedReviewExecutionIds).toEqual(['runner-review']);
      expect(seen[0].reviews.map(({ executionId }) => executionId)).toEqual(['review-1']);
    });
  });

  it('passes a parked true positive on the attack row, ignoring the judges', async () => {
    collect.mockResolvedValue(attackArtifacts());
    await expect(evaluateRow('positive-chain-with-noise')).resolves.toBeUndefined();
  });

  const qualityMissWarning = () =>
    (log.warning as jest.Mock).mock.calls
      .map(([message]) => String(message))
      .find((message) => message.includes('quality miss(es) (reported, not gating)'));

  it('reports, but does not fail on, an attack the Worker persisted on a benign row', async () => {
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
    await expect(evaluateRow('benign-batch')).resolves.toBeUndefined();
    expect(qualityMissWarning()).toContain('NegativeControl');
  });

  it('reports, but does not fail on, a verdict that disagrees with gold', async () => {
    const artifacts = attackArtifacts();
    collect.mockResolvedValue(
      attackArtifacts({ reviews: [{ ...artifacts.reviews[0], verdict: 'false_positive' }] })
    );
    await expect(evaluateRow('positive-chain-with-noise')).resolves.toBeUndefined();
    expect(qualityMissWarning()).toContain('VerdictMatchesGold');
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

  describe('the ConditionalRemediation screen on a confirmed-only discovery', () => {
    const scenario = WORKER_AUDIT_SCENARIOS.find(({ id }) => id === 'positive-chain-with-noise');
    const chainIds = scenario?.gold.alertGroups['clickfix-chain'] ?? [];
    const benignIp = String(
      scenario?.alerts.find(({ id }) => !chainIds.includes(id))?.fields['source.ip']
    );
    const remediation = async (detailsMarkdown: string) => {
      const evaluator = createAuditEvaluators({ routing }).find(
        ({ name }) => name === 'ConditionalRemediation'
      );
      if (!evaluator) throw new Error('no ConditionalRemediation evaluator');
      return evaluator.evaluate({
        input: rowFor('positive-chain-with-noise').input,
        output: attackArtifacts({
          insights: [
            {
              id: 'attack-1',
              alertIds: [...chainIds],
              title: 'ClickFix chain',
              summaryMarkdown: 'summary',
              detailsMarkdown,
            },
          ],
        }),
        expected: rowFor('positive-chain-with-noise').output,
        metadata: undefined,
      });
    };

    it('scores a discovery that cites only confirmed alerts but tells the analyst to block a benign entity', async () => {
      expect(benignIp).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(await remediation(`Block ${benignIp} at the firewall immediately.`)).toMatchObject({
        score: 0,
        label: 'unconditional_containment',
      });
    });

    it('stays N/A for a confirmed-only discovery that names no unconfirmed entity', async () => {
      expect(await remediation('Isolate the affected workstation.')).toMatchObject({
        score: null,
        label: 'N/A',
      });
    });
  });

  describe('the discoveries a row owns at cleanup', () => {
    const generationStep = (stepId: string, uuids: unknown) => ({
      stepId,
      status: 'completed',
      output: { execution_uuids: uuids },
    });
    const runnerReporting = (...steps: Array<ReturnType<typeof generationStep>>) =>
      (client.run as jest.Mock).mockResolvedValueOnce({
        execution: { id: 'run-1', status: 'completed', stepExecutions: steps },
      });
    const lastCleanup = () => cleanup.mock.calls[cleanup.mock.calls.length - 1]?.[0];

    it('hands the cleanup the uuids the runner reported, from either step that carries them', async () => {
      runnerReporting(
        generationStep('run_generation', ['g1', 'g2']),
        generationStep('emit_result', 'g2, g3')
      );
      collect.mockResolvedValue(quietArtifacts());
      await expect(evaluateRow('benign-batch')).resolves.toBeUndefined();
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(lastCleanup()?.executionUuids).toEqual(['g1', 'g2', 'g3']);
    });

    it('hands the cleanup no uuids when the runner reported none, never a guess', async () => {
      collect.mockResolvedValue(quietArtifacts());
      await expect(evaluateRow('benign-batch')).resolves.toBeUndefined();
      expect(lastCleanup()?.executionUuids).toEqual([]);
    });

    it('still hands the cleanup the uuids when collecting the artifacts throws', async () => {
      runnerReporting(generationStep('run_generation', ['g1']));
      collect.mockRejectedValue(new Error('collect blew up'));
      await expect(evaluateRow('benign-batch')).rejects.toThrow(/collect blew up/);
      expect(lastCleanup()?.executionUuids).toEqual(['g1']);
    });

    it('still hands the cleanup the uuids when a later step of the row throws', async () => {
      const seededDiscoveryId = 'a'.repeat(64);
      seed.mockResolvedValue({
        runMarker: 'marker',
        spaceId: 'space',
        goldIdBySeededId: new Map(),
        alertCount: 4,
        openAlertIds: SEEDED_IDS,
        worldDocs: [],
        seededDiscoveryId,
      });
      runnerReporting(generationStep('run_generation', ['g1']));
      collect.mockResolvedValue(quietArtifacts());
      (client.runReview as jest.Mock).mockRejectedValueOnce(new Error('review start failed'));
      await expect(evaluateRow('seeded-false-positive')).rejects.toThrow(/review start failed/);
      expect(lastCleanup()?.executionUuids).toEqual(['g1']);
    });

    describe('through the real cleanup', () => {
      const EXECUTION_UUID = 'kibana.alert.rule.execution.uuid';
      const CITED_IDS = 'kibana.alert.attack_discovery.alert_ids';
      type Discovery = Record<string, unknown> & { _id: string };

      const storeWith = (): Discovery[] => [
        { _id: 'owned-empty', [EXECUTION_UUID]: 'g1', [CITED_IDS]: [] },
        { _id: 'owned-foreign', [EXECUTION_UUID]: 'g1', [CITED_IDS]: ['other-run-1'] },
        { _id: 'cites-run', [EXECUTION_UUID]: 'g0', [CITED_IDS]: ['marker-alert-0'] },
        { _id: 'unrelated', [EXECUTION_UUID]: 'g9', [CITED_IDS]: ['other-run-2'] },
      ];

      const matches = (doc: Discovery, query: unknown): boolean => {
        const { bool } = query as {
          bool?: { should?: Array<Record<string, Record<string, unknown>>> };
        };
        if (bool?.should === undefined) {
          throw new Error(`unbounded selector: ${JSON.stringify(query)}`);
        }
        return bool.should.some((clause) => {
          if ('ids' in clause) return (clause.ids.values as string[]).includes(doc._id);
          if ('prefix' in clause) {
            const [[field, prefix]] = Object.entries(clause.prefix);
            return ((doc[field] as string[]) ?? []).some((id) => id.startsWith(String(prefix)));
          }
          if ('terms' in clause) {
            const [[field, values]] = Object.entries(clause.terms);
            return (values as unknown[]).includes(doc[field]);
          }
          throw new Error(`unknown clause: ${JSON.stringify(clause)}`);
        });
      };

      const discoveryIndex = jest
        .requireActual('../constants')
        .attackDiscoveryIndexForSpace('space');

      /** An ES whose discovery index applies the selectors the real cleanup sends. */
      const storeEs = (store: Discovery[]) => {
        const deleteByQuery = jest.fn(
          async ({ index, query }: { index: string; query?: unknown }) => {
            if (index !== discoveryIndex) return {};
            const doomed = store.filter((doc) => matches(doc, query));
            doomed.forEach((doc) => store.splice(store.indexOf(doc), 1));
            return { deleted: doomed.length, total: doomed.length };
          }
        );
        const esClient = {
          deleteByQuery,
          indices: { refresh: jest.fn(async () => ({})) },
          count: jest.fn(async ({ index, query }: { index: string; query?: unknown }) => ({
            count: index === discoveryIndex ? store.filter((doc) => matches(doc, query)).length : 0,
          })),
        } as unknown as Client;
        return { esClient, deleteByQuery };
      };

      const evaluateWith = (esClient: Client) =>
        createEvaluateDataset({
          client,
          evaluators,
          executorClient: realStyleExecutor(),
          esClient,
          fetch: jest.fn() as unknown as HttpHandler,
          log,
          routing,
          floorWorkflowId: 'floor-wf',
        })({
          dataset: {
            name: 'seam',
            description: 'real-style',
            examples: [rowFor('benign-batch')],
          },
        });

      const ids = (store: Discovery[]) => store.map(({ _id }) => _id);

      beforeEach(() => {
        cleanup.mockImplementation(jest.requireActual('../seed').cleanupSeed);
      });
      afterEach(() => {
        cleanup.mockReset();
      });

      it('removes the discoveries the run wrote, citing nothing or foreign alerts, and keeps the rest', async () => {
        const store = storeWith();
        const { esClient } = storeEs(store);
        runnerReporting(generationStep('run_generation', ['g1']));
        collect.mockResolvedValue(quietArtifacts());
        await expect(evaluateWith(esClient)).resolves.toBeUndefined();
        expect(ids(store)).toEqual(['unrelated']);
      });

      it('does not scan the space when the runner reported no uuids: the owned ones stay', async () => {
        const store = storeWith();
        const { esClient, deleteByQuery } = storeEs(store);
        collect.mockResolvedValue(quietArtifacts());
        await expect(evaluateWith(esClient)).resolves.toBeUndefined();
        // Ownership is unknown, so the row cannot claim them; nothing widened into a delete of the space.
        expect(ids(store)).toEqual(['owned-empty', 'owned-foreign', 'unrelated']);
        const discoveryQueries = deleteByQuery.mock.calls
          .filter(([{ index }]) => index === discoveryIndex)
          .map(([{ query }]) => JSON.stringify(query));
        expect(discoveryQueries.length).toBeGreaterThan(0);
        discoveryQueries.forEach((query) => {
          expect(query).not.toContain('match_all');
          expect(query).not.toContain(EXECUTION_UUID);
        });
      });
    });
  });

  describe('a runner that completed but analyzed none of the seeded alerts', () => {
    const emptyRun = (overrides: Partial<WorkerArtifacts> = {}) =>
      attackArtifacts({
        alertsAnalyzed: 0,
        insights: [],
        persistedAttackIds: [],
        reviews: [],
        dispatchedReviewExecutionIds: [],
        ...overrides,
      });
    const { seededAlertCount } = emptyRun();
    const scoreOf = async (name: string, output: WorkerArtifacts) => {
      const evaluator = [
        ...createCodeEvaluators(routing),
        ...createAuditEvaluators({ routing }),
      ].find((candidate) => candidate.name === name);
      if (!evaluator) throw new Error(`no evaluator ${name}`);
      return evaluator.evaluate({
        input: rowFor('positive-chain-with-noise').input,
        output,
        expected: rowFor('positive-chain-with-noise').output,
        metadata: undefined,
      });
    };

    it('fails the row instead of scoring the empty output, with the swallowed error', async () => {
      const output = emptyRun({ runnerError: 'step timed out' });
      for (const name of ['AlertsRetrieved', 'PositiveControlRecall', 'RunnerCompleted']) {
        expect(await scoreOf(name, output)).toMatchObject({
          score: null,
          label: 'ROW_FAILED',
          explanation: `runner completed but analyzed 0 alerts, ${seededAlertCount} seeded: step timed out`,
        });
      }
    });

    it('falls back to the runner error, and to no cause when none was read', async () => {
      expect(
        await scoreOf('AlertsRetrieved', emptyRun({ runnerError: 'step timed out' }))
      ).toMatchObject({
        label: 'ROW_FAILED',
        explanation: `runner completed but analyzed 0 alerts, ${seededAlertCount} seeded: step timed out`,
      });
      expect(await scoreOf('AlertsRetrieved', emptyRun())).toMatchObject({
        label: 'ROW_FAILED',
        explanation: `runner completed but analyzed 0 alerts, ${seededAlertCount} seeded`,
      });
    });

    it('keeps a generation that refused every batch a scored MODEL_FAULT, not a failed row', async () => {
      const output = emptyRun({ generationFault: { kind: 'refused', message: 'I cannot help' } });
      for (const name of ['AlertsRetrieved', 'DiscoveriesPersisted']) {
        expect(await scoreOf(name, output)).toMatchObject({ score: 0, label: 'MODEL_FAULT' });
      }
    });

    it('keeps a generation that exhausted its attempts on model output a scored MODEL_FAULT, not a failed row', async () => {
      const output = emptyRun({
        generationFault: {
          kind: 'exhausted',
          message:
            'Maximum hallucination failures (5) reached. Try sending fewer alerts to this model.',
        },
      });
      for (const name of ['AlertsRetrieved', 'DiscoveriesPersisted']) {
        expect(await scoreOf(name, output)).toMatchObject({ score: 0, label: 'MODEL_FAULT' });
      }
    });

    it('does not let the gate fail a dataset whose generation refused every batch', async () => {
      collect.mockResolvedValue(
        emptyRun({ generationFault: { kind: 'refused', message: 'I cannot help' } })
      );
      await expect(evaluateRow('positive-chain-with-noise')).resolves.toBeUndefined();
    });

    it('does not let the gate fail a dataset whose generation exhausted its attempts on model output', async () => {
      collect.mockResolvedValue(
        emptyRun({
          generationFault: {
            kind: 'exhausted',
            message:
              'Maximum generation attempts (5) reached. Try sending fewer alerts to this model.',
          },
        })
      );
      await expect(evaluateRow('positive-chain-with-noise')).resolves.toBeUndefined();
    });

    // `failed` is every batch failure that is not a model refusal: a broken alert query, a
    // persistence error, or a failure whose cause could not be read. None of them says anything
    // about the model, so none may turn into a green row.
    it.each([
      ['an alert query error', 'search_phase_execution_exception: alerts index missing'],
      [
        'a persistence error',
        'failed to persist attack discovery: version_conflict_engine_exception',
      ],
      ['an unreadable cause', undefined],
    ])(
      'fails the row when every batch failed with %s, naming the cause when one was read',
      async (_label, message) => {
        const output = emptyRun({ generationFault: { kind: 'failed', message } });
        for (const name of ['AlertsRetrieved', 'DiscoveriesPersisted', 'RunnerCompleted']) {
          expect(await scoreOf(name, output)).toMatchObject({
            score: null,
            label: 'ROW_FAILED',
            explanation: `runner completed but analyzed 0 alerts, ${seededAlertCount} seeded${
              message ? `: ${message}` : ''
            }`,
          });
        }
      }
    );

    it('turns the dataset red through the gate when every batch failed for a non-model reason', async () => {
      collect.mockResolvedValue(
        emptyRun({ generationFault: { kind: 'failed', message: 'alerts query failed' } })
      );
      const error = await rejectionOf(evaluateRow('positive-chain-with-noise'));
      expect(error.message).toMatch(
        /positive-chain-with-noise: \d+ code evaluator\(s\) ROW_FAILED/
      );
    });

    it('leaves rows without an alert count, or with nothing seeded, to the regular checks', async () => {
      expect(
        await scoreOf('AlertsRetrieved', emptyRun({ alertsAnalyzed: undefined }))
      ).toMatchObject({ label: 'MISSING' });
      expect(
        await scoreOf(
          'AlertsRetrieved',
          emptyRun({ seededAlertCount: 0, seededAlertIds: [], openAlertIds: [] })
        )
      ).not.toMatchObject({ label: 'ROW_FAILED' });
    });

    it('turns the dataset red through the gate', async () => {
      collect.mockResolvedValue(emptyRun());
      const error = await rejectionOf(evaluateRow('positive-chain-with-noise'));
      expect(error.message).toMatch(
        /positive-chain-with-noise: \d+ code evaluator\(s\) ROW_FAILED/
      );
    });
  });

  it('records a missing verdict as a quality miss, never as a pass', async () => {
    const artifacts = attackArtifacts();
    collect.mockResolvedValue(
      attackArtifacts({ reviews: [{ ...artifacts.reviews[0], verdict: undefined }] })
    );
    await expect(evaluateRow('positive-chain-with-noise')).resolves.toBeUndefined();
    expect(qualityMissWarning()).toContain('VerdictMatchesGold');
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
      /not clean after the last row.*DiscoveriesPersisted|DiscoveriesPersisted.*not clean after the last row/s
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
          worldDocs: [],
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
          floorWorkflowId: 'floor-wf',
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

      it('does not seed queued rows after the executor rejected, and says the experiment aborted', async () => {
        collect.mockResolvedValue(quietArtifacts());
        let jobs: Array<Promise<void>> = [];
        const error = await rejectionOf(
          evaluateRows(ROWS, { index: 0, when: 'after-task', error: executorError }, (queued) => {
            jobs = queued;
          })
        );
        const seedCallsAtSettle = seed.mock.calls.length;
        // Every job still queued in the executor's limiter has now started and finished.
        expect(jobs).toHaveLength(ROWS.length);
        await Promise.allSettled(jobs);
        expect(seed).toHaveBeenCalledTimes(seedCallsAtSettle);
        // The next job can start in the same tick the executor rejects; it is awaited, not
        // detached. The rest never start.
        expect(seedCallsAtSettle).toBeLessThan(ROWS.length);
        expect(error.message).toContain('executor span failed');
        expect(error.message).toContain(
          `the experiment aborted after ${seedCallsAtSettle} row run(s) started; rows queued after that are skipped (no seed) and are not part of this report`
        );
      });

      it('names the row whose job the executor cut short after its task', async () => {
        collect.mockResolvedValue(quietArtifacts());
        const error = await rejectionOf(
          evaluateRows(ROWS, { index: 0, when: 'after-task', error: executorError })
        );
        expect(error.message).toMatch(
          /: benign-batch was cut short by the executor abort; its scores may be incomplete/
        );
      });

      it('waits for sibling evaluators of the aborting row and reports their misses', async () => {
        // `fast` resolves first and the stub then throws the job; `slow` is still pending on the
        // row's real output. It is released only after the macrotask queue turns, i.e. after any
        // report built from microtasks alone (the mocked space checks) would have been written.
        const afterMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));
        let release: () => void = () => undefined;
        const gateOpen = new Promise<void>((resolve) => {
          release = resolve;
        });
        const codeEvaluator = (
          name: string,
          evaluate: (scenarioId: unknown) => Promise<{ score: number }>
        ): Evaluator<WorkerExample, WorkerArtifacts> => ({
          name,
          kind: 'CODE',
          direction: 'maximize',
          evaluate: ({ input }) => evaluate((input as { scenarioId?: string })?.scenarioId),
        });
        const assertCallsWhenSlowSettled: number[] = [];
        const overrides = [
          codeEvaluator('fast', async () => ({ score: 1 })),
          codeEvaluator('slow', async (scenarioId) => {
            if (scenarioId !== 'benign-batch') return { score: 1 };
            await gateOpen;
            assertCallsWhenSlowSettled.push(assertClean.mock.calls.length);
            return { score: 0 };
          }),
        ];
        collect.mockResolvedValue(quietArtifacts());
        const error = await rejectionOf(
          createEvaluateDataset({
            client,
            evaluators,
            executorClient: realStyleExecutor(
              { index: 0, when: 'during-scoring', error: executorError },
              (jobs) => {
                jobs[0].catch(() => afterMicrotasks().then(release));
              }
            ),
            esClient: {} as Client,
            fetch: jest.fn() as unknown as HttpHandler,
            log,
            routing,
            floorWorkflowId: 'floor-wf',
          })({
            dataset: { name: 'seam', description: 'real-style', examples: ROWS.map(rowFor) },
            evaluatorOverrides: overrides,
          })
        );
        expect(error.message).toContain('executor span failed');
        // The sibling's miss is in the report, and it settled before any space check.
        expect(error.message).toMatch(/slow \[.*benign-batch\]: 0/);
        expect(assertCallsWhenSlowSettled).toEqual([0]);
        expect(error.message).toMatch(
          /: benign-batch was cut short by the executor abort; its scores may be incomplete/
        );
      });

      it('reports an abort even for a single row, without claiming a count of skipped rows', async () => {
        collect.mockResolvedValue(quietArtifacts());
        const error = await rejectionOf(
          evaluateRows(ROWS.slice(0, 1), { index: 0, when: 'after-task', error: executorError })
        );
        expect(error.message).toContain('executor span failed');
        expect(error.message).toContain('the experiment aborted after 1 row run(s) started');
        expect(error.message).not.toMatch(/\d+ queued row/);
      });

      it('withholds the real output of the row still running at the abort and reports it', async () => {
        const judgeCalls = jest.fn();
        const spyJudge = (): Evaluator => ({
          name: 'criteria',
          kind: 'LLM',
          direction: 'maximize',
          evaluate: async () => {
            judgeCalls();
            return { score: 1 };
          },
        });
        // One deferred for every collect: the next queued job can start in the tick the executor
        // rejects, so it may be mid-row too, and must not be left waiting.
        let release: (artifacts: WorkerArtifacts) => void = () => undefined;
        const released = new Promise<WorkerArtifacts>((resolve) => {
          release = resolve;
        });
        collect.mockImplementation(() => released);
        let scoring: Array<Promise<unknown[]>> = [];
        const error = await rejectionOf(
          createEvaluateDataset({
            client,
            evaluators: {
              criteria: spyJudge,
              correctnessAnalysis: spyJudge,
              groundednessAnalysis: spyJudge,
            } as unknown as DefaultEvaluators,
            executorClient: realStyleExecutor(
              { index: 0, when: 'during-task', error: executorError },
              (jobs, detachedScoring) => {
                scoring = detachedScoring;
                // Real output that does not match the row's gold (a benign row with an attack).
                jobs[0].catch(() => release(attackArtifacts()));
              }
            ),
            esClient: {} as Client,
            fetch: jest.fn() as unknown as HttpHandler,
            log,
            routing,
            floorWorkflowId: 'floor-wf',
          })({
            dataset: { name: 'seam', description: 'real-style', examples: ROWS.map(rowFor) },
          })
        );
        expect(error.message).toContain('executor span failed');
        expect(error.message).toMatch(
          /: benign-batch failed: aborted mid-row; its output is not scored/
        );
        // The executor scores the row after the report. It sees the placeholder, not real output.
        expect(scoring).toHaveLength(1);
        const results = (await scoring[0]) as Array<{ label?: string }>;
        expect(results.length).toBeGreaterThan(0);
        expect(results.map(({ label }) => label)).toEqual(results.map(() => 'ROW_FAILED'));
        expect(judgeCalls).not.toHaveBeenCalled();
        // The row was cleaned up before the space was checked.
        const finalCheck = assertClean.mock.calls.findIndex(
          ([args]) => args.when === 'after the last row'
        );
        expect(cleanup).toHaveBeenCalledTimes(seed.mock.calls.length);
        cleanup.mock.invocationCallOrder.forEach((order) =>
          expect(order).toBeLessThan(assertClean.mock.invocationCallOrder[finalCheck])
        );
      });

      it('checks the space only after the row that was still running has cleaned up', async () => {
        // The running row's `collect` stays pending until the executor has rejected, so the row is
        // provably still mid-run (seeded, not cleaned up) when the rejection reaches the dataset.
        let release: (artifacts: ReturnType<typeof quietArtifacts>) => void = () => undefined;
        const released = new Promise<ReturnType<typeof quietArtifacts>>((resolve) => {
          release = resolve;
        });
        collect.mockImplementation(() => released);
        let cleanupsAtReject = -1;
        const error = await rejectionOf(
          evaluateRows(ROWS, { index: 0, when: 'during-task', error: executorError }, (jobs) => {
            jobs[0].catch(() => {
              cleanupsAtReject = cleanup.mock.calls.length;
              release(quietArtifacts());
            });
          })
        );
        expect(cleanupsAtReject).toBe(0);
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

    describe('with repetitions: 2', () => {
      const ROWS = ['benign-batch', 'shared-ci-egress'];
      const spaceCount = new Set(ROWS.map((id) => rowFor(id).input?.spaceId)).size;
      const finalChecks = () =>
        assertClean.mock.calls.filter(([args]) => args.when === 'after the last row');

      it('seeds, cleans up and scores each row once per repetition', async () => {
        collect.mockResolvedValue(quietArtifacts());
        const scored: string[] = [];
        const counting: Evaluator<WorkerExample, WorkerArtifacts> = {
          name: 'counting',
          kind: 'CODE',
          direction: 'maximize',
          evaluate: async ({ input }) => {
            scored.push(String((input as { scenarioId?: string })?.scenarioId));
            return { score: 1 };
          },
        };
        await createEvaluateDataset({
          client,
          evaluators,
          executorClient: realStyleExecutor(undefined, undefined, 2),
          esClient: {} as Client,
          fetch: jest.fn() as unknown as HttpHandler,
          log,
          routing,
          floorWorkflowId: 'floor-wf',
        })({
          dataset: { name: 'seam', description: 'real-style', examples: ROWS.map(rowFor) },
          evaluatorOverrides: [counting],
        });
        expect(seed).toHaveBeenCalledTimes(ROWS.length * 2);
        expect(cleanup).toHaveBeenCalledTimes(ROWS.length * 2);
        expect([...scored].sort()).toEqual([...ROWS, ...ROWS].sort());
        expect(finalChecks()).toHaveLength(spaceCount);
      });

      it('seeds no later job of either repetition after an abort, and reports it once', async () => {
        collect.mockResolvedValue(quietArtifacts());
        let jobs: Array<Promise<void>> = [];
        const error = await rejectionOf(
          evaluateRows(
            ROWS,
            { index: 0, when: 'after-task', error: new Error('executor span failed') },
            (queued) => {
              jobs = queued;
            },
            2
          )
        );
        const seedCallsAtSettle = seed.mock.calls.length;
        expect(jobs).toHaveLength(ROWS.length * 2);
        await Promise.allSettled(jobs);
        expect(seed).toHaveBeenCalledTimes(seedCallsAtSettle);
        expect(seedCallsAtSettle).toBeLessThan(ROWS.length * 2);
        expect(error.message.match(/the experiment aborted after/g)).toHaveLength(1);
        expect(finalChecks()).toHaveLength(spaceCount);
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

describe('chainAlertIdsOf', () => {
  const scenario = (id: string) => {
    const found = WORKER_AUDIT_SCENARIOS.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`no scenario ${id}`);
    return found;
  };

  it('returns the ids of the single gold recall-target group', () => {
    const positive = scenario('positive-chain-with-noise');
    const { requiredGroup, alertGroups } = positive.gold;
    expect(requiredGroup).toBeDefined();
    expect(chainAlertIdsOf(positive)).toEqual([...alertGroups[requiredGroup as string]]);
  });

  it('omits the indicator when the baseline gold accepts any of several groups', () => {
    // Top-level gold names prod-deploy-bot, but its baseline override accepts prod or sandbox.
    const crossAccount = scenario('same-display-name-cross-account');
    expect(crossAccount.gold.requiredGroup).toBe('prod-deploy-bot');
    expect(chainAlertIdsOf(crossAccount)).toBeUndefined();
  });
});
