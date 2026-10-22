/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logsSearch, spansSearch } from './search_requests';

interface ApplicationsAggregation {
  terms: { size: number };
  aggs: Record<string, unknown>;
}

const applicationsOf = (request: ReturnType<typeof logsSearch>) =>
  (request.aggs?.inEnvironment as { aggs: { applications: ApplicationsAggregation } }).aggs
    .applications;

const PARAMS = { start: 10, end: 20 };

describe('logsSearch', () => {
  it('reads only the events the metrics count', () => {
    expect(logsSearch(PARAMS).query?.bool?.filter).toContainEqual({
      terms: { event_name: ['browser.navigation_timing', 'browser.web_vital', 'exception'] },
    });
  });

  it('counts page loads and JS errors by event name', () => {
    const { aggs } = applicationsOf(logsSearch(PARAMS));

    expect(aggs.pageLoads).toEqual({
      filter: { bool: { filter: [{ term: { event_name: 'browser.navigation_timing' } }] } },
    });
    expect(aggs.jsErrors).toEqual({
      filter: { bool: { filter: [{ term: { event_name: 'exception' } }] } },
    });
  });

  it('lists up to 10 environments per application and 100 for the picker', () => {
    const request = logsSearch(PARAMS);
    const { aggs } = applicationsOf(request);

    expect(aggs.environments).toEqual({ terms: { field: 'service.environment', size: 10 } });
    expect(request.aggs?.environments).toEqual({
      terms: { field: 'service.environment', size: 100 },
    });
  });
});

describe('spansSearch', () => {
  it('reads only the HTTP requests the browser makes', () => {
    const filter = spansSearch(PARAMS).query?.bool?.filter;

    expect(filter).toContainEqual({ term: { kind: 'Client' } });
    expect(filter).toContainEqual({ exists: { field: 'http.request.method' } });
  });

  it('counts a request as failed from an HTTP status of 400', () => {
    expect(applicationsOf(spansSearch(PARAMS)).aggs.failed).toEqual({
      filter: { range: { 'http.response.status_code': { gte: 400 } } },
    });
  });

  it('keeps every application, without ordering by page loads', () => {
    expect(applicationsOf(spansSearch(PARAMS)).terms).toEqual({
      field: 'service.name',
      size: 1000,
    });
  });
});
