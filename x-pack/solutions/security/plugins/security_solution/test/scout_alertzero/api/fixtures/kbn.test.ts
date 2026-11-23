/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ApiClientFixture } from '@kbn/scout-security';
import { POLL_INTERVAL_MS } from './constants';
import { createApi, pollUntil } from './kbn';

/** An api client whose requests hang until their abort signal fires, recording every signal. */
const hangingApiClient = (signals: AbortSignal[]): ApiClientFixture => ({
  get: hang(signals),
  post: hang(signals),
  put: hang(signals),
  delete: hang(signals),
  patch: hang(signals),
  head: hang(signals),
});

function hang(signals: AbortSignal[]) {
  return <T>(_url: string, options?: { signal?: AbortSignal }) =>
    new Promise<T>((_resolve, reject) => {
      const { signal } = options ?? {};
      if (signal) {
        signals.push(signal);
        signal.addEventListener('abort', () => reject(new Error('request aborted')));
      }
    });
}

describe('createApi', () => {
  it('forwards the abort signal on internal() so callers can cancel a hung request', async () => {
    const signals: AbortSignal[] = [];
    const api = createApi(hangingApiClient(signals), { cookie: 'saml=es-session' });
    const controller = new AbortController();

    const request = api.internal('GET', '/internal/alertzero/workers', {
      signal: controller.signal,
    });

    // `internal` awaits `send` first, so the client call runs a few microtasks later.
    for (let i = 0; i < 10 && signals.length === 0; i++) {
      await Promise.resolve();
    }
    expect(signals).toHaveLength(1); // exactly one request
    expect(signals[0]).toBe(controller.signal); // the exact signal reached the client
    controller.abort();
    await expect(request).rejects.toThrow('request aborted');
  });

  it('forwards the abort signal on public() so callers can cancel a hung request', async () => {
    const signals: AbortSignal[] = [];
    const api = createApi(hangingApiClient(signals), { cookie: 'saml=es-session' });
    const controller = new AbortController();

    const request = api.public('GET', '/api/actions/connectors', { signal: controller.signal });

    for (let i = 0; i < 10 && signals.length === 0; i++) {
      await Promise.resolve();
    }
    expect(signals).toHaveLength(1);
    expect(signals[0]).toBe(controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow('request aborted');
  });
});

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
