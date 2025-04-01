/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneMinute, sevenMinutes, twoHoursInMinutes, twoMinute } from '../fixtures/duration';
import { createSLOWithTimeslicesBudgetingMethod } from '../fixtures/slo';
import { getSlicesFromDateRange } from './get_slices_from_date_range';

describe('utils', () => {
  describe('GetSlicesFromDateRange', () => {
    it.each([
      ['1min', oneMinute(), 60],
      ['2min', twoMinute(), 30],
      ['7min', sevenMinutes(), 9],
      ['120min', twoHoursInMinutes(), 1],
    ])(
      'returns the correct number of slices for %s timeslice window',
      (desc, timesliceWindow, expected) => {
        const slo = createSLOWithTimeslicesBudgetingMethod({
          objective: {
            target: 0.98,
            timesliceTarget: 0.9,
            timesliceWindow,
          },
        });

        const dateRange = {
          from: new Date('2022-01-01T14:46:12.643Z'),
          to: new Date('2022-01-01T15:46:12.643Z'),
        };

        const result = getSlicesFromDateRange(dateRange, slo.objective.timesliceWindow!);

        expect(result).toBe(expected);
      }
    );
  });
});
