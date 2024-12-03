/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertToBuiltInComparators,
  LEGACY_COMPARATORS,
} from './convert_legacy_outside_comparator';
import { COMPARATORS } from '@kbn/alerting-comparators';

describe('convertToBuiltInComparators', () => {
  it('should return in between when passing the legacy outside', () => {
    const comparator = convertToBuiltInComparators(LEGACY_COMPARATORS.OUTSIDE_RANGE);
    expect(comparator).toBe(COMPARATORS.NOT_BETWEEN);
  });

  it('should return the same comparator when NOT passing the legacy outside', () => {
    const comparator = convertToBuiltInComparators(COMPARATORS.GREATER_THAN);
    expect(comparator).toBe(COMPARATORS.GREATER_THAN);
  });
});
