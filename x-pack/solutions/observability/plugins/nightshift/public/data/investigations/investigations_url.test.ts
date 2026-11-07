/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildInvestigationsPath,
  DEFAULT_HOMEPAGE_TIME_RANGE,
  DEFAULT_INVESTIGATIONS_TIME_RANGE,
  parseInvestigationsSearch,
  sectionIdToInvestigationsFilters,
} from './investigations_url';

describe('investigations_url', () => {
  it('defaults the homepage time picker to the last 3 calendar days', () => {
    expect(DEFAULT_HOMEPAGE_TIME_RANGE).toEqual({ from: 'now-3d/d', to: 'now' });
  });

  it('still serializes severity and non-default ranges when asked', () => {
    expect(
      buildInvestigationsPath({
        query: 'x',
        severity: ['high'],
        state: ['open'],
        rangeFrom: 'now-7d',
        rangeTo: 'now',
      })
    ).toBe('/investigations?query=x&severity=high&state=open&rangeFrom=now-7d');
  });

  it('maps Home In progress View all onto Open (in progress is a label, not a list state)', () => {
    expect(sectionIdToInvestigationsFilters('in-progress')).toEqual({
      severity: [],
      state: ['open'],
    });
  });

  it('maps legacy state=in-progress onto open', () => {
    expect(parseInvestigationsSearch('?state=in-progress')).toEqual({
      query: '',
      severity: [],
      state: ['open'],
      rangeFrom: DEFAULT_INVESTIGATIONS_TIME_RANGE.from,
      rangeTo: DEFAULT_INVESTIGATIONS_TIME_RANGE.to,
    });
  });

  it('drops legacy state=archived from the URL', () => {
    expect(parseInvestigationsSearch('?state=archived&state=open')).toEqual({
      query: '',
      severity: [],
      state: ['open'],
      rangeFrom: DEFAULT_INVESTIGATIONS_TIME_RANGE.from,
      rangeTo: DEFAULT_INVESTIGATIONS_TIME_RANGE.to,
    });
  });
});
