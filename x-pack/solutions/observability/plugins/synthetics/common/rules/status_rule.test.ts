/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getConditionType,
  getDownThresholdExceedsChecksError,
  validateStatusRuleParams,
} from './status_rule';

describe('Status Rule', () => {
  it('should return the correct condition type for empty', () => {
    const { useLatestChecks } = getConditionType({} as any);
    expect(useLatestChecks).toBe(true);
  });

  it('should return the correct condition type check based', () => {
    const { useLatestChecks, useTimeWindow } = getConditionType({
      window: {
        numberOfChecks: 5,
      },
    });
    expect(useLatestChecks).toBe(true);
    expect(useTimeWindow).toBe(false);
  });

  it('should return the correct condition type time based', () => {
    const { useTimeWindow, useLatestChecks } = getConditionType({
      window: {
        time: {
          unit: 'm',
          size: 5,
        },
      },
    });
    expect(useTimeWindow).toBe(true);
    expect(useLatestChecks).toBe(false);
  });
});

describe('validateStatusRuleParams', () => {
  it('returns no errors when down threshold is within the number of checks', () => {
    expect(validateStatusRuleParams({ downThreshold: 3, window: { numberOfChecks: 5 } })).toEqual(
      {}
    );
  });

  it('returns no errors when down threshold equals the number of checks', () => {
    expect(validateStatusRuleParams({ downThreshold: 5, window: { numberOfChecks: 5 } })).toEqual(
      {}
    );
  });

  it('returns an error when down threshold exceeds the number of checks', () => {
    expect(validateStatusRuleParams({ downThreshold: 5, window: { numberOfChecks: 1 } })).toEqual({
      downThreshold: [getDownThresholdExceedsChecksError(5, 1)],
    });
  });

  it('does not validate down threshold for time window conditions', () => {
    expect(
      validateStatusRuleParams({ downThreshold: 50, window: { time: { unit: 'm', size: 5 } } })
    ).toEqual({});
  });

  it('returns no errors when condition is undefined', () => {
    expect(validateStatusRuleParams(undefined)).toEqual({});
  });
});
