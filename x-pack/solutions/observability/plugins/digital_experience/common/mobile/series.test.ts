/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEsqlDuration } from './series';

describe('toEsqlDuration', () => {
  it.each([
    [{ value: 30, unit: 's' as const }, '30 seconds'],
    [{ value: 1, unit: 's' as const }, '1 second'],
    [{ value: 1, unit: 'd' as const }, '1 day'],
    [{ value: 1, unit: 'w' as const }, '1 week'],
    [{ value: 1, unit: 'M' as const }, '1 month'],
    [{ value: 1, unit: 'y' as const }, '1 year'],
  ])('writes %j as %s', (interval, duration) => {
    expect(toEsqlDuration(interval)).toBe(duration);
  });
});
