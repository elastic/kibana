/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { twoMinute } from '../../fixtures/duration';
import { createSLOWithTimeslicesBudgetingMethod, createSLO } from '../../fixtures/slo';
import { getFiveMinuteRange, getOneDayRange, getOneHourRange } from './utils';

describe('getFiveMinuteRange', () => {
  it('should return range for 5 minutes including slo delay', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      objective: {
        target: 0.98,
        timesliceTarget: 0.9,
        timesliceWindow: twoMinute(),
      },
    });

    const range = getFiveMinuteRange(slo);
    expect(range).toEqual({
      gte: `now-540s/m`,
      lte: `now-240s/m`,
    });
  });
});

describe('getOneHourRange', () => {
  it('should return range for 1 hour including slo delay', () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      objective: {
        target: 0.98,
        timesliceTarget: 0.9,
        timesliceWindow: twoMinute(),
      },
    });
    const range = getOneHourRange(slo);
    expect(range).toEqual({
      gte: `now-3840s/m`,
      lte: `now-240s/m`,
    });
  });
});

describe('getOneDayRange', () => {
  it('should return range for 1 day including slo delay', () => {
    const slo = createSLO();

    const range = getOneDayRange(slo);
    expect(range).toEqual({
      gte: `now-86580s/m`,
      lte: `now-180s/m`,
    });
  });
});
