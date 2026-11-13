/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ENVIRONMENT_LENGTH } from '../lib/constants';
import { z } from '@kbn/zod/v4';
import { timeRangeQuery, timeZoneShape } from './params';

const START = '2021-01-18T12:00:00.000Z';
const END = '2021-01-18T13:00:00.000Z';

const isValid = (query: Record<string, unknown>) => timeRangeQuery().safeParse(query).success;

describe('timeRangeQuery', () => {
  it('accepts a range that starts before it ends, with or without an environment', () => {
    expect(isValid({ start: START, end: END })).toBe(true);
    expect(isValid({ start: START, end: END, environment: 'production' })).toBe(true);
  });

  it('rejects a range that does not start before it ends', () => {
    expect(isValid({ start: END, end: END })).toBe(false);
    expect(isValid({ start: END, end: START })).toBe(false);
  });

  it('reports a reversed range on `end`', () => {
    const result = timeRangeQuery().safeParse({ start: END, end: START });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['end'], message: '`start` must be before `end`' }),
    ]);
  });

  it('requires both bounds as ISO datetimes', () => {
    expect(isValid({ end: END })).toBe(false);
    expect(isValid({ start: START })).toBe(false);
    expect(isValid({ start: 'yesterday', end: END })).toBe(false);
  });

  it('bounds the environment to the length the routes accept', () => {
    const withEnvironment = (environment: string) =>
      isValid({ start: START, end: END, environment });

    expect(withEnvironment('x'.repeat(MAX_ENVIRONMENT_LENGTH))).toBe(true);
    expect(withEnvironment('x'.repeat(MAX_ENVIRONMENT_LENGTH + 1))).toBe(false);
    expect(withEnvironment('')).toBe(false);
  });
});

describe('timeZoneShape', () => {
  const timeZoneQuery = () => z.object(timeZoneShape());

  it('accepts a known time zone and defaults to UTC', () => {
    expect(timeZoneQuery().safeParse({ timeZone: 'America/New_York' }).data?.timeZone).toBe(
      'America/New_York'
    );
    expect(timeZoneQuery().safeParse({}).data?.timeZone).toBe('UTC');
  });

  it('accepts a UTC offset, which the browser sends when it cannot name its time zone', () => {
    expect(timeZoneQuery().safeParse({ timeZone: '+01:00' }).data?.timeZone).toBe('+01:00');
    expect(timeZoneQuery().safeParse({ timeZone: '-05:30' }).success).toBe(true);
    expect(timeZoneQuery().safeParse({ timeZone: '+14:00' }).success).toBe(true);
  });

  it('names the zones Elasticsearch rejects by the zones they link to', () => {
    expect(timeZoneQuery().safeParse({ timeZone: 'EST' }).data?.timeZone).toBe('America/Panama');
    expect(timeZoneQuery().safeParse({ timeZone: 'ROC' }).data?.timeZone).toBe('Asia/Taipei');
  });

  it('rejects an unknown time zone or an impossible offset', () => {
    expect(timeZoneQuery().safeParse({ timeZone: 'Not/AZone' }).success).toBe(false);
    expect(timeZoneQuery().safeParse({ timeZone: '+1:00' }).success).toBe(false);
    expect(timeZoneQuery().safeParse({ timeZone: '+15:00' }).success).toBe(false);
    expect(timeZoneQuery().safeParse({ timeZone: '+99:99' }).success).toBe(false);
  });

  it('bounds the time zone to 64 characters', () => {
    const result = timeZoneQuery().safeParse({ timeZone: 'x'.repeat(65) });

    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({ code: 'too_big', path: ['timeZone'], maximum: 64 })
    );
  });
});
