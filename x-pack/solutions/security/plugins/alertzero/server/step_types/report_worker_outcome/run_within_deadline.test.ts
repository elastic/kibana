/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunWithinDeadlineParams } from './run_within_deadline';
import { runWithinDeadline } from './run_within_deadline';

const never = () => new Promise<string>(() => {});

const run = (overrides: Partial<RunWithinDeadlineParams<string>> = {}) =>
  runWithinDeadline({
    abortSignal: new AbortController().signal,
    deadlineMs: 1000,
    onDeadline: () => 'late',
    task: async () => 'done',
    ...overrides,
  });

describe('runWithinDeadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('settles with the result of a task that finishes in time', async () => {
    const result = await run();

    expect(result).toBe('done');
  });

  it('rejects with the error of a task that rejects in time', async () => {
    const pending = run({
      task: async () => {
        throw new Error('boom');
      },
    });

    await expect(pending).rejects.toThrow('boom');
  });

  it('settles with the deadline result once the deadline elapses first', async () => {
    const pending = run({ task: never });
    await jest.advanceTimersByTimeAsync(1000);

    await expect(pending).resolves.toBe('late');
  });

  it('aborts the signal the task received at the deadline', async () => {
    const task = jest.fn((_signal: AbortSignal) => never());
    const pending = run({ task });
    const [[signal]] = task.mock.calls;
    const abortedBefore = signal.aborted;
    await jest.advanceTimersByTimeAsync(1000);
    await pending;

    expect({ abortedAfter: signal.aborted, abortedBefore }).toEqual({
      abortedAfter: true,
      abortedBefore: false,
    });
  });

  it("aborts the task's signal when the caller aborts", async () => {
    const caller = new AbortController();
    const pending = run({
      abortSignal: caller.signal,
      task: (signal) =>
        new Promise<string>((resolve) => {
          signal.addEventListener('abort', () => resolve('aborted'));
        }),
    });
    caller.abort();

    await expect(pending).resolves.toBe('aborted');
  });

  it('hands an already aborted caller signal to the task as aborted', async () => {
    const caller = new AbortController();
    caller.abort();

    const result = await run({
      abortSignal: caller.signal,
      task: async (signal) => (signal.aborted ? 'aborted' : 'done'),
    });

    expect(result).toBe('aborted');
  });

  it('clears its timer when the task settles first', async () => {
    await run();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops listening to the caller once it settles', async () => {
    const caller = new AbortController();
    const removeEventListener = jest.spyOn(caller.signal, 'removeEventListener');

    await run({ abortSignal: caller.signal });

    expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});
