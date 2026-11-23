/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mobileDocuments } from './documents';
import { getPreviousPeriod, toComparedValue, withKpiStats } from './kpis';

const DAY = 24 * 60 * 60 * 1000;

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
