/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export function ensureDatetimeIsWithinRange(
  date: number,
  expectedDiff: number,
  buffer: number = 10000
) {
  const diff = date - Date.now();
  expect(diff).to.be.greaterThan(expectedDiff - buffer);
  expect(diff).to.be.lessThan(expectedDiff + buffer);
}

export function ensureDatetimesAreOrdered(dates: Array<Date | string | number>) {
  const dateStrings = dates.map(normalizeDate);
  const sortedDateStrings = dateStrings.slice().sort();
  expect(dateStrings).to.eql(sortedDateStrings);
}

function normalizeDate(date: Date | string | number): string {
  if (typeof date === 'number') return new Date(date).toISOString();
  if (date instanceof Date) return date.toISOString();

  const dateString = `${date}`;
  const dateNumber = Date.parse(dateString);
  if (isNaN(dateNumber)) {
    throw new Error(`invalid date string: "${dateString}"`);
  }
  return new Date(dateNumber).toISOString();
}
