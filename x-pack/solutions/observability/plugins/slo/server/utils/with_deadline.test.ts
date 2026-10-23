/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOOperationTimeout } from '../errors';
import { withDeadline, withTimeoutSignal } from './with_deadline';

const waitForAbort = (signal: AbortSignal): Promise<never> =>
  new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('withDeadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the operation result', async () => {
    await expect(withDeadline(1000, async () => 'success')).resolves.toEqual('success');
  });

  it('passes a signal that is not aborted', async () => {
    const operation = jest.fn(async (signal: AbortSignal) => signal.aborted);

    await expect(withDeadline(1000, operation)).resolves.toBe(false);
  });

  it('rethrows the original error raised before the deadline', async () => {
    const error = new Error('boom');

    await expect(
      withDeadline(1000, async () => {
        throw error;
      })
    ).rejects.toBe(error);
  });

  it('throws SLOOperationTimeout when the operation fails after the deadline', async () => {
    const promise = withDeadline(1000, waitForAbort);

    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toBeInstanceOf(SLOOperationTimeout);
  });

  it('returns the result when the operation succeeds after the deadline', async () => {
    const promise = withDeadline(1000, async (signal) => {
      await waitForAbort(signal).catch(() => undefined);
      return 'late success';
    });

    jest.advanceTimersByTime(1000);

    await expect(promise).resolves.toEqual('late success');
  });

  it('clears the deadline timer once the operation completes', async () => {
    await withDeadline(1000, async () => 'success');

    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('withTimeoutSignal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('aborts the signal once the timeout elapses', async () => {
    const onAbort = jest.fn();
    const promise = withTimeoutSignal(1000, (signal) => {
      signal.addEventListener('abort', onAbort);
      return waitForAbort(signal);
    });

    jest.advanceTimersByTime(999);
    expect(onAbort).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);

    await expect(promise).rejects.toThrow('aborted');
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('rethrows the original error after the timeout', async () => {
    const promise = withTimeoutSignal(1000, waitForAbort);

    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.not.toBeInstanceOf(SLOOperationTimeout);
  });

  it('clears the timer once the operation completes', async () => {
    await expect(withTimeoutSignal(1000, async (signal) => signal.aborted)).resolves.toBe(false);

    expect(jest.getTimerCount()).toBe(0);
  });
});
