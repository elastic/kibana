/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../types';

/**
 * This is the maximum millisecond value that can be used with a Date object. If you use a number greater than this it
 * will result in an invalid date.
 *
 * See https://stackoverflow.com/questions/11526504/minimum-and-maximum-date for more details.
 */
export const maxDate = 8640000000000000;

/**
 * This function create a TimeRange and by default uses beginning of epoch and the maximum positive date in the future
 * (8640000000000000). It allows the range to be configurable to allow testing a value greater than the maximum date.
 *
 * @param from the beginning date to use in the TimeRange
 * @param to the ending date to use in the TimeRange
 */
export function createRange({
  from = new Date(0),
  to = new Date(maxDate),
}: {
  from?: Date;
  to?: Date;
} = {}): TimeRange {
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
