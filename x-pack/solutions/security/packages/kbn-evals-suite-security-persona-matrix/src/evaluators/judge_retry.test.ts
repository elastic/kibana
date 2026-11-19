/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { countingJudgeClient, JUDGE_TRANSPORT_MAX_ATTEMPTS } from './judge_retry';

// The message KbnClient raises when undici loses the socket mid-request (no HTTP status).
const fetchFailed = () =>
  new Error(
    '[POST - http://localhost:5620/internal/inference/prompt] request failed (attempt=1/0): undefined -- Status: N/A, Cause: fetch failed -- and ran out of retries'
  );

const wrap = (prompt: jest.Mock) => {
  const log = { warning: jest.fn() };
  const judge = countingJudgeClient({ prompt } as unknown as BoundInferenceClient, { log });
  return { judge, log };
};

// Runs the backoff timers so a retried call settles without real waiting.
const settle = async (response: unknown): Promise<unknown> => {
  const outcome = Promise.resolve(response).then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error })
  );
  await jest.runAllTimersAsync();
  const result = await outcome;
  if (!result.ok) throw result.error;
  return result.value;
};

describe('countingJudgeClient', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('retries a dropped connection and returns the next response', async () => {
    const prompt = jest.fn().mockRejectedValueOnce(fetchFailed()).mockResolvedValueOnce('verdict');
    const { judge, log } = wrap(prompt);

    await expect(settle(judge.client.prompt({} as never))).resolves.toBe('verdict');
    expect(prompt).toHaveBeenCalledTimes(2);
    expect(judge.calls()).toBe(2);
    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('judge request failed (attempt 1/3)')
    );
  });

  it('retries a 503 from the inference route', async () => {
    const unavailable = Object.assign(new Error('Service Unavailable'), { status: 503 });
    const prompt = jest.fn().mockRejectedValueOnce(unavailable).mockResolvedValueOnce('verdict');
    const { judge } = wrap(prompt);

    await expect(settle(judge.client.prompt({} as never))).resolves.toBe('verdict');
    expect(prompt).toHaveBeenCalledTimes(2);
  });

  it('gives up after the transport budget and rethrows the last error', async () => {
    const prompt = jest.fn().mockRejectedValue(fetchFailed());
    const { judge } = wrap(prompt);

    await expect(settle(judge.client.prompt({} as never))).rejects.toThrow('fetch failed');
    expect(prompt).toHaveBeenCalledTimes(JUDGE_TRANSPORT_MAX_ATTEMPTS);
    expect(judge.calls()).toBe(JUDGE_TRANSPORT_MAX_ATTEMPTS);
  });

  it('does not retry an error that is not transient', async () => {
    const tooLong = Object.assign(new Error('contextLengthExceededError'), { status: 500 });
    const prompt = jest.fn().mockRejectedValue(tooLong);
    const { judge, log } = wrap(prompt);

    await expect(settle(judge.client.prompt({} as never))).rejects.toBe(tooLong);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(log.warning).not.toHaveBeenCalled();
  });

  it('passes a streamed call through untouched', () => {
    const observable = { subscribe: jest.fn() };
    const prompt = jest.fn().mockReturnValue(observable);
    const { judge } = wrap(prompt);

    expect(judge.client.prompt({ stream: true } as never)).toBe(observable);
    expect(judge.calls()).toBe(1);
  });

  it('keeps the transport retry when the logger throws', async () => {
    const prompt = jest.fn().mockRejectedValueOnce(fetchFailed()).mockResolvedValueOnce('verdict');
    const judge = countingJudgeClient({ prompt } as unknown as BoundInferenceClient, {
      log: {
        warning: () => {
          throw new Error('logger exploded');
        },
      },
    });

    await expect(settle(judge.client.prompt({} as never))).resolves.toBe('verdict');
  });
});
