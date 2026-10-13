/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { isTransportFailure, withJudgeTransportRetry } from './judge_retry';

/** The error that failed smoke-8a717d689f1c4e39 (kbn-client, retries: 0, no HTTP status). */
const smokeSocketClose = () =>
  Object.assign(
    new Error(
      '[POST - http://localhost:5620/internal/inference/prompt] request failed (attempt=1/0): ' +
        'undefined -- Status: N/A, Cause: fetch failed -- and ran out of retries'
    ),
    { name: 'KbnClientRequesterError', status: undefined }
  );

const httpError = (status: number) =>
  Object.assign(new Error(`Request failed with status ${status}: fetch failed`), { status });

const judge = (evaluate: Evaluator['evaluate']): Evaluator => ({
  name: 'criteria',
  kind: 'LLM',
  direction: 'maximize',
  evaluate,
});

const params = {
  input: {},
  output: {},
  expected: null,
  metadata: null,
} as unknown as Parameters<Evaluator['evaluate']>[0];

const setup = (maxAttempts = 3) => {
  const log = { warning: jest.fn() };
  const sleep = jest.fn(async () => {});
  return { log, sleep, opts: { log, sleep, maxAttempts, baseDelayMs: 10 } };
};

describe('isTransportFailure', () => {
  it('matches the socket close that failed the smoke', () => {
    expect(isTransportFailure(smokeSocketClose())).toBe(true);
  });

  it('matches an undici SocketError carried on cause', () => {
    const err = new TypeError('fetch failed', {
      cause: Object.assign(new Error('other side closed'), { code: 'UND_ERR_SOCKET' }),
    });
    expect(isTransportFailure(err)).toBe(true);
  });

  it('does not match any error that carries an HTTP status', () => {
    for (const status of [400, 429, 500, 503, 504]) {
      expect(isTransportFailure(httpError(status))).toBe(false);
    }
  });

  it('does not match a judge output or schema error', () => {
    expect(isTransportFailure(new Error('Missing scores for a, b'))).toBe(false);
  });
});

describe('withJudgeTransportRetry', () => {
  it('retries a lost connection and returns the judge result', async () => {
    const { log, sleep, opts } = setup();
    const evaluate = jest
      .fn()
      .mockRejectedValueOnce(smokeSocketClose())
      .mockResolvedValueOnce({ score: 0.67 });

    const result = await withJudgeTransportRetry(judge(evaluate), opts).evaluate(params);

    expect(result).toEqual({ score: 0.67 });
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('attempt 1/3'));
  });

  it('gives up after maxAttempts and rethrows the last error', async () => {
    const { sleep, opts } = setup(3);
    const evaluate = jest.fn().mockRejectedValue(smokeSocketClose());

    await expect(withJudgeTransportRetry(judge(evaluate), opts).evaluate(params)).rejects.toThrow(
      'fetch failed'
    );
    expect(evaluate).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[10], [20]]);
  });

  it('does not retry HTTP errors or judge errors', async () => {
    for (const err of [httpError(400), httpError(503), new Error('Missing scores for a')]) {
      const { opts } = setup();
      const evaluate = jest.fn().mockRejectedValue(err);
      await expect(withJudgeTransportRetry(judge(evaluate), opts).evaluate(params)).rejects.toBe(
        err
      );
      expect(evaluate).toHaveBeenCalledTimes(1);
    }
  });

  it('keeps the evaluator identity so scores stay attributed', () => {
    const getModel = jest.fn();
    const wrapped = withJudgeTransportRetry({ ...judge(jest.fn()), getModel }, setup().opts);
    expect(wrapped.name).toBe('criteria');
    expect(wrapped.kind).toBe('LLM');
    expect(wrapped.getModel).toBe(getModel);
  });
});
