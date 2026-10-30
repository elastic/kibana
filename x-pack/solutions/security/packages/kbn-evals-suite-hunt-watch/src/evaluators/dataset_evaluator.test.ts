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
import { collectHuntArtifacts, type HuntArtifacts, type HuntReportArtifacts } from '../collect';
import type { HuntWatchClient } from '../hunt_watch_client';
import { resetHuntReport } from '../seed_hunt_data';
import type { HuntWatchExample } from '../types';
import { createCanaryEvaluators, createEvaluateDataset } from './dataset_evaluator';

jest.mock('../collect', () => ({ collectHuntArtifacts: jest.fn() }));
jest.mock('../seed_hunt_data', () => ({ applyHuntFault: jest.fn(), resetHuntReport: jest.fn() }));

/**
 * Positive control for the gate seam. The scorers and the assertion each have unit tests; this
 * drives them as one wired unit (executor, task, evaluator callbacks, score collector, gate)
 * against a stub executor, and checks that a known-bad output turns the dataset red. Without it
 * a regression in the wiring would leave every row green while measuring nothing.
 */

const collect = collectHuntArtifacts as jest.MockedFunction<typeof collectHuntArtifacts>;
const reset = resetHuntReport as jest.MockedFunction<typeof resetHuntReport>;

const REPORT_ID = 'blocked-report';
const SPACE_ID = 'hunt-blocked';

/** The blocked-scope path: every applicable CODE check on it is exact, nothing is judged. */
const blockedRow: HuntWatchExample = {
  id: 'seam-blocked',
  cohort: 'golden',
  input: { spaceId: SPACE_ID, reportIds: [REPORT_ID] },
  output: {
    expected: {
      indexScopeBlocked: true,
      reports: [
        {
          reportId: REPORT_ID,
          hasConfirmedHit: false,
          pendingProposals: 0,
          evidenceWritten: false,
          sseAttachment: false,
          investigationStatus: 'none',
        },
      ],
    },
    criteria: [],
  },
};

const blockedReport = (overrides: Partial<HuntReportArtifacts> = {}): HuntReportArtifacts => ({
  reportId: REPORT_ID,
  selected: false,
  stages: {},
  sseEvents: [],
  proposals: [],
  narrative: '',
  reportDoc: {},
  ...overrides,
});

const blockedArtifacts = (
  overrides: Partial<HuntArtifacts> = {},
  report: Partial<HuntReportArtifacts> = {}
): HuntArtifacts => ({
  spaceId: SPACE_ID,
  workflowExecutionId: 'w',
  executionStatus: 'completed',
  runStartedAt: '2026-01-01T12:00:00.000Z',
  indexScopeBlocked: true,
  selectedIds: [],
  skipped: [],
  pendingProposalsInSpace: [],
  reports: { [REPORT_ID]: blockedReport(report) },
  ...overrides,
});

/** Runs the task and every evaluator per example the way `@kbn/evals` executors do. */
const stubExecutor = (): EvalsExecutorClient =>
  ({
    runExperiment: async (
      {
        datasets,
        task,
      }: {
        datasets: Array<{ examples: HuntWatchExample[] }>;
        task: (example: HuntWatchExample) => Promise<HuntArtifacts>;
      },
      evaluators: Array<Evaluator<HuntWatchExample, HuntArtifacts>>
    ) => {
      for (const dataset of datasets) {
        for (const example of dataset.examples) {
          const output = await task(example);
          for (const evaluator of evaluators) {
            await evaluator.evaluate({
              input: example.input,
              output,
              expected: example.output,
              metadata: null,
            });
          }
        }
      }
      return [];
    },
    getDatasetRunResults: async () => [],
  } as unknown as EvalsExecutorClient);

const judgeStub = (name: string): Evaluator => ({
  name,
  kind: 'LLM',
  direction: 'maximize',
  evaluate: async () => ({ score: 1, explanation: 'stub judge' }),
});

const evaluators = {
  criteria: () => judgeStub('criteria'),
  correctnessAnalysis: () => judgeStub('correctness'),
  groundednessAnalysis: () => judgeStub('groundedness'),
} as unknown as DefaultEvaluators;

const log = { info: jest.fn(), warning: jest.fn(), debug: jest.fn() } as unknown as ToolingLog;

const huntWatchClient = {
  run: jest.fn(async () => ({
    spaceId: SPACE_ID,
    workflowExecutionId: 'w',
    execution: {},
    stepExecutions: [],
  })),
} as unknown as HuntWatchClient;

const evaluateDataset = createEvaluateDataset({
  huntWatchClient,
  evaluators,
  executorClient: stubExecutor(),
  esClient: {} as Client,
  fetch: jest.fn() as unknown as HttpHandler,
  log,
});

const dataset = { name: 'seam', description: 'positive control', examples: [blockedRow] };

describe('createEvaluateDataset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets the report, runs the Worker, and passes when every CODE check holds', async () => {
    collect.mockResolvedValue(blockedArtifacts());
    await expect(evaluateDataset({ dataset })).resolves.toBeUndefined();
    expect(reset).toHaveBeenCalledWith(
      expect.objectContaining({ reportId: REPORT_ID, spaceId: SPACE_ID })
    );
    expect(huntWatchClient.run).toHaveBeenCalledWith({ spaceId: SPACE_ID, reportIds: [REPORT_ID] });
    expect(collect).toHaveBeenCalledTimes(1);
  });

  it('turns the dataset red, naming the evaluator and row, when a CODE check scores 0', async () => {
    collect.mockResolvedValue(blockedArtifacts({ indexScopeBlocked: false }));
    await expect(evaluateDataset({ dataset })).rejects.toThrow(
      /Index Scope Gate \[hunt-blocked: blocked-report\]/
    );
  });

  it('turns the dataset red when an artifact a pinned check needs is missing', async () => {
    collect.mockResolvedValue(blockedArtifacts({}, { reportDoc: undefined }));
    await expect(evaluateDataset({ dataset })).rejects.toThrow(/Evidence Honesty/);
  });

  it('turns the dataset red when the run minted a Proposal on a zero row', async () => {
    collect.mockResolvedValue(
      blockedArtifacts(
        {},
        {
          proposals: [
            { id: 'p1', status: 'succeeded', createdAt: '2026-01-01T12:05:00.000Z' },
          ] as HuntReportArtifacts['proposals'],
        }
      )
    );
    await expect(evaluateDataset({ dataset })).rejects.toThrow(/Proposal Presence/);
  });

  it('runs evaluator overrides through the same gate', async () => {
    collect.mockResolvedValue(
      blockedArtifacts({}, { outcome: 'failed', hunt: { status: 'failed', hit: false } })
    );
    await expect(
      evaluateDataset({ dataset, evaluatorOverrides: createCanaryEvaluators() })
    ).rejects.toThrow(/Canary Inverted/);
  });
});
