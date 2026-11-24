/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toGlobalSettingsResponse } from './to_global_settings_response';

const SAVED_AT = '2026-11-20T10:00:00.000Z';
const OVERRIDE = { enabled: true, periodDays: 200 };

describe('toGlobalSettingsResponse', () => {
  it.each([
    {
      name: 'S1: the default when nothing is stored or overridden',
      stored: {},
      override: undefined,
      expected: {
        enabled: false,
        periodDays: 365,
        updatedAt: null,
        effective: { enabled: false, periodDays: 365, source: 'default' },
      },
    },
    {
      name: 'S2: the stored value when not overridden',
      stored: { sliRetention: { enabled: true, periodDays: 200, updatedAt: new Date(SAVED_AT) } },
      override: undefined,
      expected: {
        enabled: true,
        periodDays: 200,
        updatedAt: SAVED_AT,
        effective: { enabled: true, periodDays: 200, source: 'settings' },
      },
    },
    {
      name: 'S3: the default with the override applied when nothing is stored',
      stored: {},
      override: OVERRIDE,
      expected: {
        enabled: false,
        periodDays: 365,
        updatedAt: null,
        effective: { enabled: true, periodDays: 200, source: 'config' },
      },
    },
    {
      name: 'S4: the stored value with the override applied',
      stored: { sliRetention: { enabled: false, periodDays: 400, updatedAt: new Date(SAVED_AT) } },
      override: OVERRIDE,
      expected: {
        enabled: false,
        periodDays: 400,
        updatedAt: SAVED_AT,
        effective: { enabled: true, periodDays: 200, source: 'config' },
      },
    },
  ])('returns $name', ({ stored, override, expected }) => {
    expect(toGlobalSettingsResponse({ stored, override })).toEqual({ sliRetention: expected });
  });
});
