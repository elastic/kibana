/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { captureWorkerBaseline } from './alertzero';
import type { AlertZeroApi, ApiResult, Method } from './kbn';

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
  });

  afterEach(() => {
    jest.useRealTimers();
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
