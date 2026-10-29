/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLLBACK_DEADLINE_MS, runRollback } from './run_rollback';

describe('runRollback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts every operation before any of them settles', async () => {
    const first = Promise.withResolvers<void>();
    const second = Promise.withResolvers<void>();
    const firstOperation = jest.fn(() => first.promise);
    const secondOperation = jest.fn(() => second.promise);

    const promise = runRollback({
      operations: [firstOperation, secondOperation],
      onError: jest.fn(),
    });

    expect(firstOperation).toHaveBeenCalledTimes(1);
    expect(secondOperation).toHaveBeenCalledTimes(1);

    first.resolve();
    second.resolve();
    await promise;
  });

  it('runs the final operation once every operation has settled', async () => {
    const pending = Promise.withResolvers<void>();
    const finalOperation = jest.fn(async () => {});

    const promise = runRollback({
      operations: [() => pending.promise],
      finalOperation,
      onError: jest.fn(),
    });
    await jest.advanceTimersByTimeAsync(0);

    expect(finalOperation).not.toHaveBeenCalled();

    pending.resolve();
    await promise;

    expect(finalOperation).toHaveBeenCalledTimes(1);
  });

  it('aborts the operations signal after the rollback deadline', async () => {
    const onError = jest.fn();
    const abortError = new Error('aborted');

    const promise = runRollback({
      operations: [
        (signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(abortError));
          }),
      ],
      onError,
    });
    await jest.advanceTimersByTimeAsync(ROLLBACK_DEADLINE_MS);
    await promise;

    expect(onError).toHaveBeenCalledWith(abortError);
  });

  it('reports every failure and still runs the final operation', async () => {
    const onError = jest.fn();
    const firstError = new Error('first');
    const secondError = new Error('second');
    const finalOperation = jest.fn(async () => {});

    await runRollback({
      operations: [
        async () => {
          throw firstError;
        },
        async () => {
          throw secondError;
        },
        async () => {},
      ],
      finalOperation,
      onError,
    });

    expect(onError.mock.calls).toEqual([[firstError], [secondError]]);
    expect(finalOperation).toHaveBeenCalledTimes(1);
  });

  it('reports an operation that throws synchronously and still runs the final operation', async () => {
    const onError = jest.fn();
    const syncError = new Error('sync');
    const finalOperation = jest.fn(async () => {});

    await runRollback({
      operations: [
        () => {
          throw syncError;
        },
        async () => {},
      ],
      finalOperation,
      onError,
    });

    expect(onError).toHaveBeenCalledWith(syncError);
    expect(finalOperation).toHaveBeenCalledTimes(1);
  });

  it('reports a failure of the final operation', async () => {
    const onError = jest.fn();
    const finalError = new Error('final');

    await runRollback({
      operations: [],
      finalOperation: async () => {
        throw finalError;
      },
      onError,
    });

    expect(onError).toHaveBeenCalledWith(finalError);
  });
});
