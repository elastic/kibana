/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildArchivedMatchesInvestigationsPath,
  buildInvestigationsPath,
  DEFAULT_INVESTIGATIONS_TIME_RANGE,
  parseInvestigationsSearch,
} from './investigations_url';

describe('investigations_url', () => {
  it('builds a path with only query and archived state for archive matches', () => {
    expect(buildArchivedMatchesInvestigationsPath('checkout')).toBe(
      '/investigations?query=checkout&state=archived'
    );
  });

  it('omits empty query from the archive-matches path', () => {
    expect(buildArchivedMatchesInvestigationsPath('  ')).toBe('/investigations?state=archived');
  });

  it('round-trips query and archived state without inventing severity or a custom range', () => {
    const path = buildArchivedMatchesInvestigationsPath('latency');
    const search = path.slice(path.indexOf('?'));
    expect(parseInvestigationsSearch(search)).toEqual({
      query: 'latency',
      severity: [],
      state: ['archived'],
      rangeFrom: DEFAULT_INVESTIGATIONS_TIME_RANGE.from,
      rangeTo: DEFAULT_INVESTIGATIONS_TIME_RANGE.to,
    });
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
});
