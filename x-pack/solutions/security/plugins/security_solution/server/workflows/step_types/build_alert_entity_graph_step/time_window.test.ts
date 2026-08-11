/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTimeWindowToMs } from './time_window';

describe('parseTimeWindowToMs', () => {
  it('parses supported units', () => {
    expect(parseTimeWindowToMs('1s')).toBe(1000);
    expect(parseTimeWindowToMs('30m')).toBe(30 * 60 * 1000);
    expect(parseTimeWindowToMs('2h')).toBe(2 * 60 * 60 * 1000);
    expect(parseTimeWindowToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('defaults to 1 hour on invalid input', () => {
    expect(parseTimeWindowToMs('bad')).toBe(60 * 60 * 1000);
    expect(parseTimeWindowToMs('1w')).toBe(60 * 60 * 1000);
    expect(parseTimeWindowToMs('')).toBe(60 * 60 * 1000);
  });
});
