/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNew } from './utils';

describe('isNew', () => {
  const fakeNow = new Date('2025-02-18T12:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns true when publishedAt is less than 30 days ago', () => {
    const twentyNineDaysAgo = new Date('2025-01-20T12:00:00.000Z');
    expect(isNew(twentyNineDaysAgo)).toBe(true);
  });

  it('returns true when publishedAt is today', () => {
    expect(isNew(fakeNow)).toBe(true);
  });

  it('returns false when publishedAt is more than 30 days ago', () => {
    const thirtyOneDaysAgo = new Date('2025-01-18T12:00:00.000Z');
    expect(isNew(thirtyOneDaysAgo)).toBe(false);
  });

  it('returns false when publishedAt is exactly 30 days ago', () => {
    const thirtyDaysAgo = new Date('2025-01-19T12:00:00.000Z');
    expect(isNew(thirtyDaysAgo)).toBe(false);
  });
});
