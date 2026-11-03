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
import { cleanupSeed, seedScenario } from '../seed';
import type { WorkerArtifacts, WorkerExample } from '../worker_types';
import type { AttackDiscoveryWorkerClient } from '../worker_client';
import { createEvaluateDataset } from './dataset_evaluator';

jest.mock('../collect', () => ({ collectWorkerArtifacts: jest.fn() }));
jest.mock('../seed', () => ({ seedScenario: jest.fn(), cleanupSeed: jest.fn() }));

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
    fingerprintReviewCount: 1,
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

const stubExecutor = (): EvalsExecutorClient =>
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
      for (const dataset of datasets) {
        for (const example of dataset.examples) {
          const output = await task(example);
          for (const evaluator of evaluators) {
            await evaluator.evaluate({
              input: example.input,
              output,
              expected: example.output,
              metadata: example.metadata,
            });
          }
        }
      }
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

const evaluateRow = (scenarioId: string) =>
  createEvaluateDataset({
    client,
    evaluators,
    executorClient: stubExecutor(),
    esClient: {} as Client,
    fetch: jest.fn() as unknown as HttpHandler,
    log,
    routing,
  })({
    dataset: { name: 'seam', description: 'positive control', examples: [rowFor(scenarioId)] },
  });

describe('createEvaluateDataset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
