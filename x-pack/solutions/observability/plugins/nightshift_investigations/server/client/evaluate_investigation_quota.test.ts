/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InvestigationQuotaResult } from '../types';
import { InvestigationUnavailableError } from './errors';
import { evaluateInvestigationQuota } from './evaluate_investigation_quota';

const createLogger = () =>
  ({
    warn: jest.fn(),
  } as unknown as Logger);

describe('evaluateInvestigationQuota', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('fails closed when no callback is registered', async () => {
    await expect(evaluateInvestigationQuota({ logger: createLogger() })).rejects.toBeInstanceOf(
      InvestigationUnavailableError
    );
  });

  it('returns an explicit denial without warning', async () => {
    const logger = createLogger();
    const callback = jest.fn().mockResolvedValue({ allowed: false });

    await expect(evaluateInvestigationQuota({ callback, logger })).resolves.toEqual({
      allowed: false,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('fails closed with the reason when the callback rejects', async () => {
    const logger = createLogger();
    const callback = jest.fn().mockRejectedValue(new Error('Storage unavailable'));

    await expect(evaluateInvestigationQuota({ callback, logger })).rejects.toBeInstanceOf(
      InvestigationUnavailableError
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Storage unavailable'));
  });

  it('fails closed after ten seconds and gives back the slot of a late allowed result', async () => {
    jest.useFakeTimers();
    const release = jest.fn();
    let resolveCallback: (result: InvestigationQuotaResult) => void = () => {};
    const callback = jest.fn(
      () =>
        new Promise<InvestigationQuotaResult>((resolve) => {
          resolveCallback = resolve;
        })
    );

    const result = evaluateInvestigationQuota({ callback, logger: createLogger() });
    const assertion = expect(result).rejects.toBeInstanceOf(InvestigationUnavailableError);
    await jest.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(release).not.toHaveBeenCalled();

    resolveCallback({ allowed: true, release });
    await jest.advanceTimersByTimeAsync(0);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('logs a failed release of a late allowed result instead of leaving it unhandled', async () => {
    jest.useFakeTimers();
    const logger = createLogger();
    const release = jest.fn().mockRejectedValue(new Error('Update failed'));
    let resolveCallback: (result: InvestigationQuotaResult) => void = () => {};
    const callback = jest.fn(
      () =>
        new Promise<InvestigationQuotaResult>((resolve) => {
          resolveCallback = resolve;
        })
    );

    const result = evaluateInvestigationQuota({ callback, logger });
    const assertion = expect(result).rejects.toBeInstanceOf(InvestigationUnavailableError);
    await jest.advanceTimersByTimeAsync(10_000);
    await assertion;

    resolveCallback({ allowed: true, release });
    await jest.advanceTimersByTimeAsync(0);

    expect(logger.warn).toHaveBeenLastCalledWith(expect.stringContaining('Update failed'));
  });

  it('does not release a late denied result', async () => {
    jest.useFakeTimers();
    const release = jest.fn();
    let resolveCallback: (result: InvestigationQuotaResult) => void = () => {};
    const callback = jest.fn(
      () =>
        new Promise<InvestigationQuotaResult>((resolve) => {
          resolveCallback = resolve;
        })
    );

    const result = evaluateInvestigationQuota({ callback, logger: createLogger() });
    const assertion = expect(result).rejects.toBeInstanceOf(InvestigationUnavailableError);
    await jest.advanceTimersByTimeAsync(10_000);
    await assertion;

    resolveCallback({ allowed: false, release });
    await jest.advanceTimersByTimeAsync(0);

    expect(release).not.toHaveBeenCalled();
  });

  it('handles a late rejection after timeout without retrying or warning again', async () => {
    jest.useFakeTimers();
    const logger = createLogger();
    let rejectCallback: (reason: Error) => void = () => {};
    const callback = jest.fn(
      () =>
        new Promise<InvestigationQuotaResult>((_resolve, reject) => {
          rejectCallback = reject;
        })
    );

    const result = evaluateInvestigationQuota({ callback, logger });
    const assertion = expect(result).rejects.toBeInstanceOf(InvestigationUnavailableError);
    await jest.advanceTimersByTimeAsync(10_000);
    await assertion;

    rejectCallback(new Error('Late storage failure'));
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
