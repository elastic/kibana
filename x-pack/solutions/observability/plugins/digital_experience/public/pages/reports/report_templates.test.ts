/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDateRange } from '@kbn/timerange';
import { SCORECARD_TIME_RANGE } from './report_templates';

describe('SCORECARD_TIME_RANGE', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Mid-afternoon, so a range that ran to the end of today would include part of it.
    jest.setSystemTime(new Date(2026, 10, 27, 15, 30));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('covers the last seven full days, up to the end of yesterday, as the app resolves it', () => {
    const { startDate, endDate } = getDateRange({
      from: SCORECARD_TIME_RANGE.rangeFrom,
      to: SCORECARD_TIME_RANGE.rangeTo,
    });

    expect(startDate).toBe(new Date(2026, 10, 20).getTime());
    expect(endDate).toBe(new Date(2026, 10, 27).getTime() - 1);
  });
});
