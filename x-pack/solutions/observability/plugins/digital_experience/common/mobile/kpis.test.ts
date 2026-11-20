/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mobileDocuments } from './documents';
import { getMobileTimeBucket, getPreviousPeriod, toComparedValue, withKpiStats } from './kpis';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('getMobileTimeBucket', () => {
  it('is hourly up to 24 hours and daily from there', () => {
    expect(getMobileTimeBucket(0, HOUR)).toBe('hour');
    expect(getMobileTimeBucket(0, DAY)).toBe('hour');
    expect(getMobileTimeBucket(0, 7 * DAY)).toBe('day');
    expect(getMobileTimeBucket(0, 30 * DAY)).toBe('day');
  });
});

describe('getPreviousPeriod', () => {
  it('is the period of equal length that ends where the range starts', () => {
    expect(getPreviousPeriod(10 * DAY, 17 * DAY)).toEqual({ start: 3 * DAY, end: 10 * DAY });
  });
});

describe('toComparedValue', () => {
  it('has a delta only when both values are known', () => {
    expect(toComparedValue(5, 3)).toEqual({ value: 5, previous: 3, delta: 2 });
    expect(toComparedValue(null, 3)).toEqual({ value: null, previous: 3, delta: null });
  });
});

describe('withKpiStats', () => {
  it('counts the documents, sessions, users and exceptions', () => {
    expect(withKpiStats(mobileDocuments()).print('basic')).toContain(
      '| STATS docs = COUNT(*), sessions = COUNT_DISTINCT(`attributes.session.id`), users = COUNT_DISTINCT(`resource.attributes.app.installation.id`), exceptions = COUNT(`attributes.exception.type`)'
    );
  });
});
