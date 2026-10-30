/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ENVIRONMENT_LENGTH } from '../lib/constants';
import { timeRangeQuery } from './params';

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
