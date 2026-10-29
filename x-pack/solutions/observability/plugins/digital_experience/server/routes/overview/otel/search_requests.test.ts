/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logsSearch, spansSearch } from './search_requests';

const PARAMS = { serviceName: 'shop', start: 0, end: 60 * 60 * 1000 };

const inEnvironmentOf = (request: ReturnType<typeof logsSearch>) =>
  request.aggs?.inEnvironment as { filter: unknown; aggs: Record<string, never> };

const pageLoadsOf = (request: ReturnType<typeof logsSearch>) =>
  inEnvironmentOf(request).aggs.pageLoads as unknown as {
    filter: unknown;
    aggs: Record<string, unknown>;
  };

describe('logsSearch and spansSearch', () => {
  it('fail instead of returning partial results', () => {
    expect(logsSearch(PARAMS).allow_partial_search_results).toBe(false);
    expect(spansSearch(PARAMS).allow_partial_search_results).toBe(false);
  });

  it('read the local OTel indices only, ignoring missing ones', () => {
    expect(logsSearch(PARAMS)).toMatchObject({
      index: 'logs-*.otel-*',
      ignore_unavailable: true,
    });
    expect(spansSearch(PARAMS)).toMatchObject({
      index: 'traces-*.otel-*',
      ignore_unavailable: true,
    });
  });

  it('read the requested application and browser documents only', () => {
    [logsSearch(PARAMS), spansSearch(PARAMS)].forEach((request) => {
      const filter = request.query?.bool?.filter;
      expect(filter).toContainEqual({ term: { 'service.name': 'shop' } });
      expect(filter).toContainEqual({ term: { 'telemetry.sdk.language': 'webjs' } });
      expect(filter).toContainEqual({
        range: { '@timestamp': { gte: 0, lte: 60 * 60 * 1000, format: 'epoch_millis' } },
      });
    });
  });
});

describe('logsSearch', () => {
  it('reads only the events the metrics count', () => {
    expect(logsSearch(PARAMS).query?.bool?.filter).toContainEqual({
      terms: { event_name: ['browser.navigation_timing', 'browser.web_vital', 'exception'] },
    });
  });

  it('counts page loads by the navigation timing event, so soft navigations do not inflate them', () => {
    expect(pageLoadsOf(logsSearch(PARAMS)).filter).toEqual({
      bool: { filter: [{ term: { event_name: 'browser.navigation_timing' } }] },
    });
  });

  it('counts JS errors by the exception event', () => {
    expect(inEnvironmentOf(logsSearch(PARAMS)).aggs.jsErrors).toEqual({
      filter: { bool: { filter: [{ term: { event_name: 'exception' } }] } },
    });
  });

  it('takes the load time percentile and its samples from the page loads', () => {
    const { aggs } = pageLoadsOf(logsSearch(PARAMS));

    expect(aggs.loadTime).toEqual({
      percentiles: {
        field: 'browser.navigation_timing.load_event_end',
        percents: [75],
        keyed: false,
      },
    });
    expect(aggs.loadTimeSamples).toEqual({
      value_count: { field: 'browser.navigation_timing.load_event_end' },
    });
  });

  it('counts the trend and its load time in the same buckets as the page loads', () => {
    const { aggs } = pageLoadsOf(logsSearch(PARAMS));

    expect(aggs.trend).toEqual({
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '60s',
        min_doc_count: 0,
        extended_bounds: { min: 0, max: 60 * 60 * 1000 },
      },
      aggs: {
        loadTime: {
          percentiles: {
            field: 'browser.navigation_timing.load_event_end',
            percents: [75],
            keyed: false,
          },
        },
      },
    });
  });

  it('counts the web vital samples of a name in any case, with a value', () => {
    const { lcp } = inEnvironmentOf(logsSearch(PARAMS)).aggs as unknown as {
      lcp: { filter: { bool: { filter: unknown[] } }; aggs: Record<string, unknown> };
    };

    expect(lcp.filter.bool.filter).toEqual([
      { term: { event_name: 'browser.web_vital' } },
      { term: { 'browser.web_vital.name': { value: 'lcp', case_insensitive: true } } },
      { exists: { field: 'browser.web_vital.value' } },
    ]);
    expect(Object.keys(lcp.aggs)).toEqual(['p75', 'upToGood', 'upToNeedsImprovement']);
  });

  it('returns the five web vitals', () => {
    expect(Object.keys(inEnvironmentOf(logsSearch(PARAMS)).aggs)).toEqual(
      expect.arrayContaining(['lcp', 'inp', 'cls', 'fcp', 'ttfb'])
    );
  });

  it('lists up to 100 environments of the application, whatever the selected one', () => {
    const request = logsSearch({ ...PARAMS, environment: 'production' });

    expect(request.aggs?.environments).toEqual({
      terms: { field: 'service.environment', size: 100 },
    });
    expect(request.aggs?.environmentNames).toEqual({
      terms: { field: 'resource.attributes.deployment.environment.name', size: 100 },
    });
    expect(request.aggs?.environmentNotDefined).toEqual({
      filter: {
        bool: {
          should: [
            { term: { 'service.environment': 'ENVIRONMENT_NOT_DEFINED' } },
            {
              bool: {
                must_not: [
                  { exists: { field: 'service.environment' } },
                  { exists: { field: 'resource.attributes.deployment.environment.name' } },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    });
  });

  it('takes the metrics from the selected environment only', () => {
    expect(inEnvironmentOf(logsSearch({ ...PARAMS, environment: 'production' })).filter).toEqual({
      bool: {
        should: [
          { term: { 'service.environment': 'production' } },
          { term: { 'resource.attributes.deployment.environment.name': 'production' } },
        ],
        minimum_should_match: 1,
      },
    });
    expect(inEnvironmentOf(logsSearch(PARAMS)).filter).toEqual({ match_all: {} });
  });
});

describe('spansSearch', () => {
  it('reads only the HTTP requests the browser makes', () => {
    const filter = spansSearch(PARAMS).query?.bool?.filter;

    expect(filter).toContainEqual({ term: { kind: 'Client' } });
    expect(filter).toContainEqual({ exists: { field: 'http.request.method' } });
  });

  it('counts the requests with a response status or an error span status', () => {
    expect(inEnvironmentOf(spansSearch(PARAMS)).aggs.requests).toEqual({
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
    expect(inEnvironmentOf(spansSearch(PARAMS)).aggs.failed).toEqual({
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
});
