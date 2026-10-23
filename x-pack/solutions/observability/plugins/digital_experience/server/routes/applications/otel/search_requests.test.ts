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

const SPANS_PARAMS = { ...PARAMS, serviceNames: ['web', 'shop'] };

describe('logsSearch and spansSearch', () => {
  it('fail instead of returning partial results', () => {
    expect(logsSearch(PARAMS).allow_partial_search_results).toBe(false);
    expect(spansSearch(SPANS_PARAMS).allow_partial_search_results).toBe(false);
  });
});

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

  it('counts only the web vital samples with a value', () => {
    const { aggs } = applicationsOf(logsSearch(PARAMS)) as unknown as {
      aggs: { lcp: { filter: { bool: { filter: unknown[] } } } };
    };

    expect(aggs.lcp.filter.bool.filter).toContainEqual({
      exists: { field: 'browser.web_vital.value' },
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

  it('counts the page loads over time in the selected environment', () => {
    const { aggs } = logsSearch({ start: 0, end: 60 * 60 * 1000 }).aggs?.inEnvironment as {
      aggs: Record<string, unknown>;
    };

    expect(aggs.pageLoadsOverTime).toEqual({
      filter: { bool: { filter: [{ term: { event_name: 'browser.navigation_timing' } }] } },
      aggs: {
        histogram: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '60s',
            min_doc_count: 0,
            extended_bounds: { min: 0, max: 60 * 60 * 1000 },
          },
        },
      },
    });
  });
});

describe('spansSearch', () => {
  it('reads only the HTTP requests the browser makes', () => {
    const filter = spansSearch(SPANS_PARAMS).query?.bool?.filter;

    expect(filter).toContainEqual({ term: { kind: 'Client' } });
    expect(filter).toContainEqual({ exists: { field: 'http.request.method' } });
  });

  it('counts the requests with a response status or an error span status', () => {
    expect(applicationsOf(spansSearch(SPANS_PARAMS)).aggs.requests).toEqual({
      filter: {
        bool: {
          should: [
            { exists: { field: 'http.response.status_code' } },
            { term: { 'status.code': 'Error' } },
          ],
          minimum_should_match: 1,
        },
      },
    });
  });

  it('counts a request as failed from an HTTP status of 400 or an error span status', () => {
    expect(applicationsOf(spansSearch(SPANS_PARAMS)).aggs.failed).toEqual({
      filter: {
        bool: {
          should: [
            { range: { 'http.response.status_code': { gte: 400 } } },
            { term: { 'status.code': 'Error' } },
          ],
          minimum_should_match: 1,
        },
      },
    });
  });

  it('reads only the applications the logs search found', () => {
    expect(applicationsOf(spansSearch(SPANS_PARAMS)).terms).toEqual({
      field: 'service.name',
      size: 2,
      include: ['web', 'shop'],
    });
  });
});
