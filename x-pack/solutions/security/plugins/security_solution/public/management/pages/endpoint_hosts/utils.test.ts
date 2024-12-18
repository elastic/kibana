/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getIsInvalidDateRange } from './utils';

describe('utils', () => {
  describe('getIsInvalidDateRange', () => {
    it('should return FALSE when startDate is before endDate', () => {
      expect(getIsInvalidDateRange({ startDate: 'now-1d', endDate: 'now' })).toBe(false);
      expect(
        getIsInvalidDateRange({
          startDate: moment().subtract(1, 'd').toISOString(),
          endDate: moment().toISOString(),
        })
      ).toBe(false);
    });

    it('should return TRUE when startDate is after endDate', () => {
      expect(
        getIsInvalidDateRange({
          startDate: moment().toISOString(),
          endDate: moment().subtract(1, 'd').toISOString(),
        })
      ).toBe(true);
    });
  });
});
