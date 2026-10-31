/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

// Resolve backoff sleeps instantly so the retry path runs without waiting.
jest.mock('timers/promises', () => ({
  ...jest.requireActual('timers/promises'),
  setTimeout: jest.fn().mockResolvedValue(undefined),
}));

import { setTimeout } from 'timers/promises';
import { retryWithBackoff } from './retry_with_backoff';

const delays = () => (setTimeout as unknown as jest.Mock).mock.calls.map(([ms]) => ms);

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the result without waiting when the first attempt succeeds', async () => {
    const fn = jest.fn().mockResolvedValue('installed');

    await expect(
      retryWithBackoff(fn, { logger: loggerMock.create(), description: 'install' })
    ).resolves.toBe('installed');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(delays()).toEqual([]);
  });

  it('retries a rejection and resolves once an attempt succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('workflows plugin not ready'))
      .mockResolvedValue('installed');

    await expect(
      retryWithBackoff(fn, { logger: loggerMock.create(), description: 'install' })
    ).resolves.toBe('installed');

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially from the base delay between attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(
      retryWithBackoff(fn, {
        logger: loggerMock.create(),
        description: 'install',
        maxAttempts: 4,
        baseDelayMs: 100,
      })
    ).rejects.toThrow('boom');

    // One wait fewer than attempts: the last failure rethrows instead of waiting.
    expect(fn).toHaveBeenCalledTimes(4);
    expect(delays()).toEqual([100, 200, 400]);
  });

  it('rethrows the last error after the attempts are spent', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('last'));

    await expect(
      retryWithBackoff(fn, {
        logger: loggerMock.create(),
        description: 'install',
        maxAttempts: 2,
        baseDelayMs: 1,
      })
    ).rejects.toThrow('last');
  });

  it('logs every retry with the attempt count and the failure reason', async () => {
    const logger = loggerMock.create();
    const fn = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);

    await retryWithBackoff(fn, {
      logger,
      description: 'install managed resources (startup)',
      maxAttempts: 3,
      baseDelayMs: 1,
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'significantEvents: failed to install managed resources (startup) -- retrying in 1ms (attempt 1/3): boom'
    );
  });

  it('reports a non-Error rejection without crashing the retry loop', async () => {
    const logger = loggerMock.create();
    const fn = jest.fn().mockRejectedValueOnce('plain string').mockResolvedValue(undefined);

    await retryWithBackoff(fn, {
      logger,
      description: 'install',
      maxAttempts: 2,
      baseDelayMs: 1,
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('plain string'));
  });
});
