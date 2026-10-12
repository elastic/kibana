/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Percentage change of the current count versus the previous period, rounded to a whole number.
 * The previous count is derived as `currentValue - delta`. Returns undefined when it cannot be
 * shown meaningfully: the previous count is zero or less, or the change rounds to 0%.
 */
export const getDeltaPercentage = (delta: number, currentValue: number): number | undefined => {
  const previousValue = currentValue - delta;
  if (previousValue <= 0) return undefined;

  const percentage = Math.round((delta / previousValue) * 100);
  return percentage === 0 ? undefined : percentage;
};
