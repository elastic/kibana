/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEffectiveSliRetention } from './get_effective_sli_retention';

describe('getEffectiveSliRetention', () => {
  it.each([
    {
      name: 'the default when nothing is stored or overridden',
      stored: undefined,
      override: undefined,
      expected: { enabled: false, periodDays: 365, source: 'default' },
    },
    {
      name: 'the stored value when not overridden',
      stored: { enabled: true, periodDays: 200 },
      override: undefined,
      expected: { enabled: true, periodDays: 200, source: 'settings' },
    },
    {
      name: 'the override when nothing is stored',
      stored: undefined,
      override: { enabled: true, periodDays: 200 },
      expected: { enabled: true, periodDays: 200, source: 'config' },
    },
    {
      name: 'the override over the stored value',
      stored: { enabled: false, periodDays: 400 },
      override: { enabled: true, periodDays: 200 },
      expected: { enabled: true, periodDays: 200, source: 'config' },
    },
    {
      name: 'a disabling override over an enabled stored value',
      stored: { enabled: true, periodDays: 200 },
      override: { enabled: false, periodDays: 365 },
      expected: { enabled: false, periodDays: 365, source: 'config' },
    },
  ])('returns $name', ({ stored, override, expected }) => {
    expect(getEffectiveSliRetention({ stored, override })).toEqual(expected);
  });
});
