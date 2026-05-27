/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { applyMaxLagCutoff } from './extraction_window';

describe('applyMaxLagCutoff', () => {
  const frequency = '1m';
  const lookbackPeriod = '3h';
  // threshold = 1.5 * 3h = 4.5h = 16_200_000 ms
  // frequency = 1m = 60_000 ms

  const effectiveWindowEnd = '2024-01-01T12:00:00.000Z'; // "now - delay"

  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  it('returns unchanged window when lag is below the threshold', () => {
    // lag = 2h < 4.5h threshold
    const fromDateISO = '2024-01-01T10:00:00.000Z';

    const result = applyMaxLagCutoff({
      fromDateISO,
      effectiveWindowEnd,
      lookbackPeriod,
      frequency,
      logger,
    });

    expect(result).toEqual(fromDateISO);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns unchanged window when lag is exactly at the threshold (strict >)', () => {
    // lag = exactly 4.5h = threshold; should NOT trigger
    const fromDateISO = '2024-01-01T07:30:00.000Z';

    const result = applyMaxLagCutoff({
      fromDateISO,
      effectiveWindowEnd,
      lookbackPeriod,
      frequency,
      logger,
    });

    expect(result).toEqual(fromDateISO);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('applies cutoff and resets to effectiveWindowEnd - frequency when lag just exceeds threshold', () => {
    // lag = 4.5h + 1ms > threshold
    const fromDateISO = '2024-01-01T07:29:59.999Z';
    // expected newFrom = 2024-01-01T12:00:00.000Z - 1m = 2024-01-01T11:59:00.000Z
    const expectedNewFrom = '2024-01-01T11:59:00.000Z';

    const result = applyMaxLagCutoff({
      fromDateISO,
      effectiveWindowEnd,
      lookbackPeriod,
      frequency,
      logger,
    });

    expect(result).toEqual(expectedNewFrom);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('skipping backlog'));
  });

  it('applies cutoff for a far-behind scenario and the new window width equals frequency', () => {
    // lag = 24h >> 4.5h threshold
    const fromDateISO = '2023-12-31T12:00:00.000Z';
    const expectedNewFrom = '2024-01-01T11:59:00.000Z';

    const result = applyMaxLagCutoff({
      fromDateISO,
      effectiveWindowEnd,
      lookbackPeriod,
      frequency,
      logger,
    });

    expect(result).toEqual(expectedNewFrom);
    // verify the resulting window width is exactly frequency (1m = 60_000 ms)
    const widthMs = new Date(effectiveWindowEnd).getTime() - new Date(result).getTime();
    expect(widthMs).toBe(60_000);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('includes original fromDateISO, newFrom, and effectiveWindowEnd in the warn log', () => {
    const fromDateISO = '2023-12-31T12:00:00.000Z';

    applyMaxLagCutoff({ fromDateISO, effectiveWindowEnd, lookbackPeriod, frequency, logger });

    const warnArg = (logger.warn as jest.Mock).mock.calls[0][0] as string;
    expect(warnArg).toContain(`from=${fromDateISO}`);
    expect(warnArg).toContain(`effectiveEnd=${effectiveWindowEnd}`);
  });
});
