/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import {
  ChatCompletionErrorCode,
  createInferenceProviderError,
  createInferenceRequestAbortedError,
  InferenceTaskError,
} from '@kbn/inference-common';
import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { ComposeVerifiedBriefParams, ComposeVerifiedBriefResult } from '../composition/types';
import { BriefCompositionError } from '../composition/types';
import type { BriefSignal, SignalContext } from '../signals/types';
import { BriefAbortReason, runBrief, toBriefError } from './run_brief';
import type { RunBriefParams } from './run_brief';

const evidence: Evidence = {
  entities: {},
  facts: [
    {
      id: 'F-1',
      kind: 'attack_discovery',
      signalId: 'attack_discoveries',
      title: 'Discovery',
      entities: [],
    },
  ],
  links: [],
  signals: [],
};
const emptyEvidence: Evidence = { entities: {}, facts: [], links: [], signals: [] };

const composed: ComposeVerifiedBriefResult = {
  brief: { verdict: { level: 'clear' } } as unknown as Brief,
  verification: { dropped: {}, flags: [], repaired: false },
  model: 'model-x',
  tokens: { prompt: 1, completion: 2, total: 3 },
};

const params = {
  range: '7d' as const,
  from: '2026-10-05T10:00:00.000Z',
  to: '2026-10-12T10:00:00.000Z',
  connector_id: 'c1',
};

const createStore = () => ({
  markRunning: jest.fn().mockResolvedValue(true),
  heartbeat: jest.fn().mockResolvedValue(true),
  setStage: jest.fn().mockResolvedValue(true),
  completeJob: jest.fn().mockResolvedValue(true),
  failJob: jest.fn().mockResolvedValue(true),
});

const signals = [{ id: 'attack_discoveries' }] as unknown as BriefSignal[];

const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('runBrief', () => {
  let store: ReturnType<typeof createStore>;
  let runSignals: jest.Mock;
  let composeVerifiedBrief: jest.Mock;
  let abortController: AbortController;
  let signalContext: SignalContext;
  const logger = loggingSystemMock.createLogger();
  const inferenceClient = {} as BoundInferenceClient;

  const run = (overrides: Partial<RunBriefParams> = {}) =>
    runBrief({
      docId: 'doc',
      jobId: 'job',
      params,
      store,
      signalContext,
      inferenceClient,
      abortSignal: abortController.signal,
      logger,
      deps: { runSignals, signals, composeVerifiedBrief },
      ...overrides,
    });

  beforeEach(() => {
    jest.useFakeTimers();
    store = createStore();
    runSignals = jest.fn().mockResolvedValue(evidence);
    composeVerifiedBrief = jest.fn(async ({ onStage }: ComposeVerifiedBriefParams) => {
      await onStage?.('compose');
      await onStage?.('verify');
      return composed;
    });
    abortController = new AbortController();
    signalContext = {
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      spaceId: 'default',
      timeRange: { from: params.from, to: params.to },
      now: new Date(params.to),
      logger,
      user: { username: 'alice' },
      getCasesClient: async () => undefined,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('gathers, composes and completes the job', async () => {
    expect(await run()).toEqual({ status: 'succeeded' });

    expect(store.markRunning).toHaveBeenCalledWith({ docId: 'doc', jobId: 'job' });
    expect(runSignals).toHaveBeenCalledWith(signalContext, signals, {
      abortSignal: expect.any(AbortSignal),
    });
    expect(composeVerifiedBrief).toHaveBeenCalledWith(
      expect.objectContaining({
        inferenceClient,
        evidence,
        timeRange: { from: params.from, to: params.to, range: '7d' },
      })
    );
    expect(store.setStage.mock.calls.map(([{ stage }]) => stage)).toEqual(['compose', 'verify']);
    expect(store.completeJob).toHaveBeenCalledWith({
      docId: 'doc',
      jobId: 'job',
      result: { ...composed, evidence, params },
    });
    expect(store.failJob).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(store.heartbeat).not.toHaveBeenCalled();
  });

  it('composes even when there is no evidence', async () => {
    runSignals.mockResolvedValue(emptyEvidence);
    expect(await run()).toEqual({ status: 'succeeded' });
    expect(composeVerifiedBrief).toHaveBeenCalledWith(
      expect.objectContaining({ evidence: emptyEvidence })
    );
  });

  it('does nothing when the job is no longer current', async () => {
    store.markRunning.mockResolvedValue(false);
    expect(await run()).toEqual({ status: 'superseded' });
    expect(runSignals).not.toHaveBeenCalled();
  });

  it('heartbeats while running and stops afterwards', async () => {
    const gather = deferred<Evidence>();
    runSignals.mockReturnValue(gather.promise);

    const outcome = run();
    await jest.advanceTimersByTimeAsync(25_000);
    expect(store.heartbeat).toHaveBeenCalledTimes(2);

    gather.resolve(evidence);
    expect(await outcome).toEqual({ status: 'succeeded' });
    await jest.advanceTimersByTimeAsync(30_000);
    expect(store.heartbeat).toHaveBeenCalledTimes(2);
  });

  it('aborts without writing when a heartbeat finds the job superseded', async () => {
    store.heartbeat.mockResolvedValue(false);
    runSignals.mockImplementation(
      (
        _ctx: SignalContext,
        _signals: BriefSignal[],
        { abortSignal }: { abortSignal: AbortSignal }
      ) =>
        new Promise((_resolve, reject) => {
          abortSignal.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );

    const outcome = run();
    await jest.advanceTimersByTimeAsync(10_000);

    expect(await outcome).toEqual({ status: 'superseded' });
    expect(store.failJob).not.toHaveBeenCalled();
    expect(store.completeJob).not.toHaveBeenCalled();
  });

  it('records the composition error code', async () => {
    composeVerifiedBrief.mockRejectedValue(new BriefCompositionError('llm_output', 'bad output'));

    expect(await run()).toEqual({
      status: 'failed',
      error: { code: 'llm_output', message: 'bad output' },
    });
    expect(store.failJob).toHaveBeenCalledWith({
      docId: 'doc',
      jobId: 'job',
      error: { code: 'llm_output', message: 'bad output' },
    });
    await jest.advanceTimersByTimeAsync(60_000);
    expect(store.heartbeat).not.toHaveBeenCalled();
  });

  it('records internal errors from the gather stage', async () => {
    runSignals.mockRejectedValue(new Error('es down'));
    expect(await run()).toEqual({
      status: 'failed',
      error: { code: 'internal', message: 'es down' },
    });
    expect(composeVerifiedBrief).not.toHaveBeenCalled();
  });

  it('records a timeout when the executor aborts with a timeout reason', async () => {
    runSignals.mockImplementation(
      (
        _ctx: SignalContext,
        _signals: BriefSignal[],
        { abortSignal }: { abortSignal: AbortSignal }
      ) =>
        new Promise((_resolve, reject) => {
          abortSignal.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );

    const outcome = run();
    await jest.advanceTimersByTimeAsync(0);
    abortController.abort(new BriefAbortReason('timeout', 'too slow'));

    expect(await outcome).toEqual({
      status: 'failed',
      error: { code: 'timeout', message: 'too slow' },
    });
  });

  it('reports a superseded run when the failure cannot be recorded for this job', async () => {
    runSignals.mockRejectedValue(new Error('boom'));
    store.failJob.mockResolvedValue(false);
    expect(await run()).toEqual({ status: 'superseded' });
  });
});

describe('toBriefError', () => {
  it('maps inference errors', () => {
    expect(toBriefError(createInferenceProviderError('provider down')).code).toBe('llm_error');
    expect(toBriefError(createInferenceRequestAbortedError()).code).toBe('timeout');
    expect(
      toBriefError(new InferenceTaskError(ChatCompletionErrorCode.ToolValidationError, 'bad', {}))
        .code
    ).toBe('llm_output');
  });

  it('maps an aborted signal without a known reason to interrupted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(toBriefError(new Error('x'), controller.signal).code).toBe('interrupted');
  });

  it('truncates long messages', () => {
    expect(toBriefError(new Error('a'.repeat(5000))).message.length).toBeLessThanOrEqual(1001);
  });
});
