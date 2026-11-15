/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InvestigationQuotaCallback } from '../types';
import { evaluateInvestigationQuota } from './evaluate_investigation_quota';

const createLogger = () =>
  ({
    warn: jest.fn(),
  } as unknown as Logger);

describe('evaluateInvestigationQuota', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows and warns when no callback is registered', async () => {
    const logger = createLogger();

    await expect(evaluateInvestigationQuota({ logger })).resolves.toEqual({ allowed: true });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unavailable'));
  });

  it('returns an explicit denial without warning', async () => {
    const logger = createLogger();
    const callback = jest.fn().mockResolvedValue({ allowed: false });

    await expect(evaluateInvestigationQuota({ callback, logger })).resolves.toEqual({
      allowed: false,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('allows and warns when the callback throws synchronously', async () => {
    const logger = createLogger();
    const callback = jest.fn(() => {
      throw new Error('Storage unavailable');
    }) as InvestigationQuotaCallback;

    await expect(evaluateInvestigationQuota({ callback, logger })).resolves.toEqual({
      allowed: true,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Storage unavailable'));
  });

  it('allows and warns when the callback rejects', async () => {
    const logger = createLogger();
    const callback = jest.fn().mockRejectedValue(new Error('Storage unavailable'));

    await expect(evaluateInvestigationQuota({ callback, logger })).resolves.toEqual({
      allowed: true,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Storage unavailable'));
  });

  it('allows after ten seconds without retrying a callback that has not settled', async () => {
    jest.useFakeTimers();
    const logger = createLogger();
    const callback = jest.fn(() => new Promise<{ allowed: boolean }>(() => {}));

    const result = evaluateInvestigationQuota({ callback, logger });
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toEqual({ allowed: true });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'));
  });

  it('handles a late rejection after timeout without retrying or warning again', async () => {
    jest.useFakeTimers();
    const logger = createLogger();
    let rejectCallback: (reason: Error) => void = () => {};
    const callback = jest.fn(
      () =>
        new Promise<{ allowed: boolean }>((_resolve, reject) => {
          rejectCallback = reject;
        })
    );

    const result = evaluateInvestigationQuota({ callback, logger });
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toEqual({ allowed: true });

    rejectCallback(new Error('Late storage failure'));
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
