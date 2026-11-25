/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { needsSliRetentionConfirmation } from './needs_sli_retention_confirmation';

describe('needsSliRetentionConfirmation', () => {
  it.each([
    [
      'enabling retention',
      { enabled: false, periodDays: 365 },
      { enabled: true, periodDays: 365 },
      true,
    ],
    [
      'enabling retention with a longer period',
      { enabled: false, periodDays: 365 },
      { enabled: true, periodDays: 400 },
      true,
    ],
    [
      'decreasing the period while enabled',
      { enabled: true, periodDays: 400 },
      { enabled: true, periodDays: 200 },
      true,
    ],
    [
      'keeping the period while enabled',
      { enabled: true, periodDays: 400 },
      { enabled: true, periodDays: 400 },
      false,
    ],
    [
      'increasing the period while enabled',
      { enabled: true, periodDays: 200 },
      { enabled: true, periodDays: 400 },
      false,
    ],
    [
      'disabling retention',
      { enabled: true, periodDays: 400 },
      { enabled: false, periodDays: 200 },
      false,
    ],
    [
      'changing the period while disabled',
      { enabled: false, periodDays: 400 },
      { enabled: false, periodDays: 200 },
      false,
    ],
  ])('%s', (_, stored, next, expected) => {
    expect(needsSliRetentionConfirmation({ stored, next })).toBe(expected);
  });
});
