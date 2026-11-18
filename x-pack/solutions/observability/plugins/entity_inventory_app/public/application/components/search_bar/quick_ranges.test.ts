/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS } from '../../constants';
import { QUICK_RANGES } from './quick_ranges';
import { clampTimeRange } from '../../utils/clamp_time_range';

describe('QUICK_RANGES', () => {
  it.each(QUICK_RANGES.map(({ label, start, end }) => ({ label, start, end })))(
    '$label fits in the maximum time range',
    ({ start, end }) => {
      const { wasClamped, isValid } = clampTimeRange(
        { from: start, to: end },
        ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS
      );

      expect(isValid).toBe(true);
      expect(wasClamped).toBe(false);
    }
  );

  it('has a different label for every range', () => {
    const labels = QUICK_RANGES.map(({ label }) => label);

    expect(new Set(labels).size).toBe(labels.length);
  });
});
