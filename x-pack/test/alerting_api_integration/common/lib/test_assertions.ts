/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export function ensureDatetimeIsWithinRange(
  scheduledRunTime: number,
  expectedDiff: number,
  buffer: number = 10000
) {
  const diff = scheduledRunTime - Date.now();
  expect(diff).to.be.greaterThan(expectedDiff - buffer);
  expect(diff).to.be.lessThan(expectedDiff + buffer);
}
