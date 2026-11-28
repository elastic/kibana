/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * How a value's change is shown: as a share of the previous value for counts and rates, or in
 * percentage points for shares, so a crash-free rate going from 98% to 99% reads "+1 pp", not "+1%".
 */
export type ChangeUnit = 'relative' | 'percentagePoints';

/** The largest relative change, and change in percentage points, that is still noise. */
export const NEGLIGIBLE_RELATIVE_CHANGE = 0.02;
export const NEGLIGIBLE_PERCENTAGE_POINTS = 0.5;

// Subtracting shares is inexact, e.g. 0.105 - 0.1 is 0.004999…, so a change right at a cutoff
// would count as noise: the cutoffs allow for that much error.
const FLOAT_TOLERANCE = 1e-9;

/** Whether `change` is smaller than `cutoff`, allowing for the error of subtracting shares. */
export const isBelow = (change: number, cutoff: number): boolean =>
  Math.abs(change) < cutoff - FLOAT_TOLERANCE;

/**
 * Whether the change from `previous` to `value` is too small to call better or worse. A shares
 * unit compares percentage points; any other the relative change, where a rise from zero never is.
 */
export const isNegligibleChange = (value: number, previous: number, unit: ChangeUnit): boolean => {
  if (unit === 'percentagePoints') {
    return isBelow((value - previous) * 100, NEGLIGIBLE_PERCENTAGE_POINTS);
  }
  if (previous === 0) {
    return value === 0;
  }
  return isBelow((value - previous) / previous, NEGLIGIBLE_RELATIVE_CHANGE);
};
