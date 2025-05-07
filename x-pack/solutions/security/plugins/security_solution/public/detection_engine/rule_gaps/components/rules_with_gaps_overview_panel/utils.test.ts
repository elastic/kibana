/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExecutionSuccessRate } from './utils';

describe('getExecutionSuccessRate', () => {
  it('should return 0 if summary is undefined', () => {
    expect(getExecutionSuccessRate(undefined)).toBe(0);
  });

  it('should return 0 if total is 0 to avoid division by zero', () => {
    expect(getExecutionSuccessRate({ success: 0, total: 0 })).toBe(0);
  });

  it('should not return .00 for divisions without remainers', () => {
    expect(getExecutionSuccessRate({ success: 10, total: 10 })).toBe(100);
    expect(getExecutionSuccessRate({ success: 5, total: 10 })).toBe(50);
  });

  it('should truncate at 2 decimal points', () => {
    expect(getExecutionSuccessRate({ success: 1, total: 3 })).toBe(33.33);
    expect(getExecutionSuccessRate({ success: 3730, total: 3735 })).toBe(99.87);
  });
});
