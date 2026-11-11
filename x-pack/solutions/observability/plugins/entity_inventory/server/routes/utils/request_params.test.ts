/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  dateRangeRefinement,
  instantParam,
  isFromEarlierThanTo,
  listLimitParam,
} from './request_params';

describe('instantParam', () => {
  it.each(['2026-11-01T00:00:00Z', '2026-11-01T01:00:00+02:00', '2026-11-01T00:00:00.123456789Z'])(
    'accepts %s',
    (instant) => {
      expect(instantParam.safeParse(instant).success).toBe(true);
    }
  );

  it.each([
    ['a date without a time', '2026-11-01'],
    ['an invalid month', '2026-13-01T00:00:00Z'],
    ['a time without an offset', '2026-11-01T00:00:00'],
    ['over 64 characters', `2026-11-01T00:00:00Z${'0'.repeat(64)}`],
  ])('rejects %s', (_label, instant) => {
    expect(instantParam.safeParse(instant).success).toBe(false);
  });
});

describe('listLimitParam', () => {
  it('defaults to 9,999', () => {
    expect(listLimitParam.parse(undefined)).toBe(9999);
  });

  it('rejects a numeric string', () => {
    expect(listLimitParam.safeParse('10').success).toBe(false);
  });

  it.each([1, 9999])('accepts %i', (limit) => {
    expect(listLimitParam.parse(limit)).toBe(limit);
  });

  it.each([0, -1, 10000, 1.5, 'abc'])('rejects %s', (limit) => {
    expect(listLimitParam.safeParse(limit).success).toBe(false);
  });
});

describe('isFromEarlierThanTo + dateRangeRefinement', () => {
  const schema = z
    .object({ from: instantParam, to: instantParam })
    .refine(isFromEarlierThanTo, dateRangeRefinement);

  it('accepts a range whose from is earlier than to', () => {
    expect(
      schema.safeParse({ from: '2026-11-01T00:00:00Z', to: '2026-11-01T00:00:01Z' }).success
    ).toBe(true);
  });

  it.each([
    ['from equals to', '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z'],
    ['from is after to', '2026-11-02T00:00:00Z', '2026-11-01T00:00:00Z'],
  ])('rejects a range where %s, reporting the error on to', (_label, from, to) => {
    const result = schema.safeParse({ from, to });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      message: 'from must be earlier than to',
      path: ['to'],
    });
  });
});
