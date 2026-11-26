/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTimeInput } from './tool';

const NOW = new Date('2026-10-22T12:00:00.000Z');

describe('parseTimeInput', () => {
  it.each([
    ['1703505000', '2023-12-25T11:50:00.000Z'],
    ['1703505000000', '2023-12-25T11:50:00.000Z'],
    ['2023-12-25T10:30:00+05:00', '2023-12-25T05:30:00.000Z'],
    ['now', '2026-10-22T12:00:00.000Z'],
    ['yesterday', '2026-10-21T12:00:00.000Z'],
    ['1 hour ago', '2026-10-22T11:00:00.000Z'],
    ['in 2 days', '2026-10-24T12:00:00.000Z'],
  ])('parses %s', (input, iso) => {
    expect(parseTimeInput(input, NOW)?.toISOString()).toBe(iso);
  });

  it('returns undefined for unparsable input', () => {
    expect(parseTimeInput('not a time', NOW)).toBeUndefined();
  });
});
