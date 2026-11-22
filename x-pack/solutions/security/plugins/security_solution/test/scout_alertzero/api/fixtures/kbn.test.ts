/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { POLL_INTERVAL_MS } from './constants';
import { pollUntil } from './kbn';

describe('pollUntil', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the first non-undefined value the read returns', async () => {
    const values = [undefined, undefined, 'ready'];
    const read = jest.fn(async () => values.shift());

    const promise = pollUntil('the thing', read, { timeoutMs: 60_000 });
    await jest.advanceTimersByTimeAsync(2 * POLL_INTERVAL_MS);

    await expect(promise).resolves.toBe('ready');
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('throws on timeout with the label and no cause when reads keep returning undefined', async () => {
    const read = jest.fn(async () => undefined);

    const promise = pollUntil('worker settings', read, { timeoutMs: 10_000 });
    const assertion = expect(promise).rejects.toThrow(
      'Timed out after 10000ms waiting for worker settings'
    );
    await jest.advanceTimersByTimeAsync(10_000 + POLL_INTERVAL_MS);
    await assertion;
  });

  it('keeps the last thrown error as the timeout cause instead of clearing it', async () => {
    const read = jest.fn(async () => {
      throw new Error('worker busy');
    });

    const promise = pollUntil('worker settings', read, { timeoutMs: 10_000 });
    const assertion = expect(promise).rejects.toThrow(
      'Timed out after 10000ms waiting for worker settings; last error: worker busy'
    );
    await jest.advanceTimersByTimeAsync(10_000 + POLL_INTERVAL_MS);
    await assertion;
  });

  it('never issues a read at or after a caller-provided deadline', async () => {
    const readStartsAt: number[] = [];
    const read = jest.fn(async () => {
      readStartsAt.push(Date.now());
      return undefined;
    });
    const deadline = Date.now() + 10_000;

    // `timeoutMs` is deliberately larger than the deadline: the shared deadline, not the
    // poll's own budget, must gate the reads (the captureWorkerBaseline handoff).
    const promise = pollUntil('worker settings', read, { timeoutMs: 99_000, deadline });
    const assertion = expect(promise).rejects.toThrow('Timed out after 99000ms');
    await jest.advanceTimersByTimeAsync(10_000 + POLL_INTERVAL_MS);
    await assertion;

    expect(readStartsAt.length).toBeGreaterThan(0);
    expect(readStartsAt.every((startedAt) => startedAt < deadline)).toBe(true);
  });
});
