/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASELINE_TIMEOUT_MS } from './constants';
import { captureWorkerBaseline } from './alertzero';
import * as kbn from './kbn';
import type { AlertZeroApi, ApiResult, Method } from './kbn';

jest.mock('./kbn', () => {
  const actual = jest.requireActual('./kbn');
  return { ...actual, pollUntil: jest.fn(actual.pollUntil) };
});

/** The options object the last `captureWorkerBaseline` call handed to `pollUntil`. */
const pollOptions = () => jest.mocked(kbn.pollUntil).mock.calls[0][2];

const WORKER_ID = 'system-security-floor-attack-discovery';

/** Records the abort signal and settles only through it, like a request that never responds. */
const neverRespondingApi = (signals: AbortSignal[]): AlertZeroApi => ({
  internal: <T>(
    _method: Method,
    _path: string,
    options?: { body?: unknown; signal?: AbortSignal }
  ) =>
    new Promise<ApiResult<T>>((_resolve, reject) => {
      const { signal } = options ?? {};
      if (signal) {
        signals.push(signal);
        signal.addEventListener('abort', () => reject(new Error('request aborted')));
      }
    }),
  public: () => Promise.reject(new Error('not used')),
});

describe('captureWorkerBaseline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(kbn.pollUntil).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hands pollUntil the deadline it shares with the per-read signal, not a default one', async () => {
    const api: AlertZeroApi = {
      internal: async <T>() => ({ statusCode: 200, body: { workers: [] } } as ApiResult<T>),
      public: () => Promise.reject(new Error('not used')),
    };
    const start = Date.now();

    const promise = captureWorkerBaseline(api, WORKER_ID);
    const assertion = expect(promise).rejects.toThrow('Timed out after');
    await jest.advanceTimersByTimeAsync(BASELINE_TIMEOUT_MS + 5_000);
    await assertion;

    // The handoff under test: the poll must run on the same deadline the per-read signal
    // is cut off at. Dropping `deadline` here falls back to a poll-local one and leaves the
    // request signal to expire on its own — a hung read then bleeds past this budget.
    const { deadline } = pollOptions() ?? {};
    expect(deadline).toBeGreaterThanOrEqual(start);
    expect(deadline).toBeLessThanOrEqual(start + BASELINE_TIMEOUT_MS);
  });

  it('issues no worker request at or after the shared deadline', async () => {
    const signals: AbortSignal[] = [];
    const api = neverRespondingApi(signals);
    const requestStartsAt = [Date.now()];

    const promise = captureWorkerBaseline(api, WORKER_ID);
    const assertion = expect(promise).rejects.toThrow('Timed out after');
    // Advance exactly to the deadline before any poll-interval tick could fire: the poll
    // must stop there instead of spending its own (later) timeoutMs budget on another read.
    await jest.advanceTimersByTimeAsync(BASELINE_TIMEOUT_MS - Date.now() + requestStartsAt[0]);
    await jest.advanceTimersByTimeAsync(5_000);
    await assertion;

    const deadline = pollOptions()?.deadline ?? Number.POSITIVE_INFINITY;
    expect(requestStartsAt.every((startedAt) => startedAt < deadline)).toBe(true);
    // The last issued request was already canceled by the deadline, not still hanging.
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('captures the baseline from the first readable worker record', async () => {
    const api: AlertZeroApi = {
      internal: async <T>() =>
        ({
          statusCode: 200,
          body: {
            workers: [
              {
                id: WORKER_ID,
                enabled: true,
                settings: { autonomy: 'full', serviceAccountId: 'sa-1' },
              },
            ],
          },
        } as ApiResult<T>),
      public: () => Promise.reject(new Error('not used')),
    };

    await expect(captureWorkerBaseline(api, WORKER_ID)).resolves.toEqual({
      workerId: WORKER_ID,
      enabled: true,
      autonomy: 'full',
      serviceAccountId: 'sa-1',
    });
  });

  it('retries an unavailable worker instead of capturing its default settings', async () => {
    const responses = [
      { id: WORKER_ID, enabled: false, state: 'unavailable', settings: { autonomy: 'default' } },
      { id: WORKER_ID, enabled: true, state: 'ready', settings: { autonomy: 'full' } },
    ];
    const api: AlertZeroApi = {
      internal: async <T>() =>
        ({ statusCode: 200, body: { workers: [responses.shift()] } } as ApiResult<T>),
      public: () => Promise.reject(new Error('not used')),
    };

    const promise = captureWorkerBaseline(api, WORKER_ID);
    // One poll interval passes between the unavailable read and the retry.
    await jest.advanceTimersByTimeAsync(5_000);

    await expect(promise).resolves.toEqual({
      workerId: WORKER_ID,
      enabled: true,
      autonomy: 'full',
      serviceAccountId: undefined,
    });
  });

  it('aborts a non-responding worker read through its signal and times out naming the worker', async () => {
    const signals: AbortSignal[] = [];
    const api = neverRespondingApi(signals);

    const promise = captureWorkerBaseline(api, WORKER_ID);
    const assertion = expect(promise).rejects.toThrow(
      new RegExp(`${WORKER_ID} settings to be readable for a baseline; last error: request aborted`)
    );
    // The per-read signal and the poll share one deadline: both expire together, and no
    // further request may be issued after it.
    await jest.advanceTimersByTimeAsync(60_000 + 5_000);
    await assertion;

    expect(signals).toHaveLength(1); // exactly one request, not one per poll tick
    expect(signals[0].aborted).toBe(true); // the request was canceled, not left hanging
  });
});
