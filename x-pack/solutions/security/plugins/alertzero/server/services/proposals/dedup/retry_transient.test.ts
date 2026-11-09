/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTransientError, retryTransient } from './retry_transient';

const throttled = () => Object.assign(new Error('too many requests'), { statusCode: 429 });

describe('isTransientError', () => {
  it.each([408, 429, 500, 502, 503, 504])('treats status %s as transient', (statusCode) => {
    expect(isTransientError(Object.assign(new Error('x'), { statusCode }))).toBe(true);
  });

  it('reads the status the Elasticsearch client puts under meta', () => {
    expect(isTransientError(Object.assign(new Error('x'), { meta: { statusCode: 503 } }))).toBe(
      true
    );
  });

  it.each(['TimeoutError', 'ConnectionError', 'NoLivingConnectionsError', 'RequestAbortedError'])(
    'treats a %s as transient',
    (name) => {
      expect(isTransientError(Object.assign(new Error('x'), { name }))).toBe(true);
    }
  );

  it.each([400, 401, 403, 404, 409])('does not treat status %s as transient', (statusCode) => {
    expect(isTransientError(Object.assign(new Error('x'), { statusCode }))).toBe(false);
  });

  it('does not treat an ordinary error, or something that is not an error, as transient', () => {
    expect(isTransientError(new Error('boom'))).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
    expect(isTransientError('nope')).toBe(false);
  });
});

describe('retryTransient', () => {
  const sleep = jest.fn(async () => undefined);

  beforeEach(() => sleep.mockClear());

  it('returns the first success without waiting', async () => {
    const attempt = jest.fn().mockResolvedValue('ok');

    await expect(retryTransient(attempt, { sleep })).resolves.toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('rides out a transient failure, waiting between tries', async () => {
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(throttled())
      .mockRejectedValueOnce(throttled())
      .mockResolvedValue('ok');

    await expect(retryTransient(attempt, { sleep })).resolves.toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[250], [500]]);
  });

  it('gives up after the last delay and throws what it last got', async () => {
    const last = throttled();
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(throttled())
      .mockRejectedValueOnce(throttled())
      .mockRejectedValue(last);

    await expect(retryTransient(attempt, { sleep })).rejects.toBe(last);
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('does not retry a failure that would fail the same way again', async () => {
    const refused = Object.assign(new Error('forbidden'), { statusCode: 403 });
    const attempt = jest.fn().mockRejectedValue(refused);

    await expect(retryTransient(attempt, { sleep })).rejects.toBe(refused);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('honours its own delays', async () => {
    const attempt = jest.fn().mockRejectedValueOnce(throttled()).mockResolvedValue('ok');

    await retryTransient(attempt, { sleep, delaysMs: [7] });

    expect(sleep.mock.calls).toEqual([[7]]);
  });
});
