/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logsSearch } from './search_requests';

/** The runtime field of the page filter, which reads the route of a page and then its URL. */
const PAGE_FIELD = 'digital_experience_filter_pageUrl';

const PARAMS = {
  serviceName: 'shop',
  start: 0,
  end: 60 * 60 * 1000,
  histogram: { interval: { value: 60, unit: 's' as const }, timeZone: 'America/New_York' },
};

const inEnvironmentOf = (request: ReturnType<typeof logsSearch>) =>
  request.aggs?.inEnvironment as { filter: unknown; aggs: Record<string, never> };

const pageLoadsOf = (request: ReturnType<typeof logsSearch>) =>
  inEnvironmentOf(request).aggs.pageLoads as unknown as {
    filter: unknown;
    aggs: Record<string, unknown>;
  };

describe('logsSearch defaults', () => {
  it('fails instead of returning partial results', () => {
    expect(logsSearch(PARAMS).allow_partial_search_results).toBe(false);
  });

  it('reads the local OTel logs only, ignoring missing ones', () => {
    expect(logsSearch(PARAMS)).toMatchObject({
      index: 'logs-*.otel-*',
      ignore_unavailable: true,
    });
  });

  it('reads the requested application and browser documents only', () => {
    const filter = logsSearch(PARAMS).query?.bool?.filter;
    expect(filter).toContainEqual({ term: { 'service.name': 'shop' } });
    expect(filter).toContainEqual({ term: { 'telemetry.sdk.language': 'webjs' } });
    expect(filter).toContainEqual({
      range: { '@timestamp': { gte: 0, lte: 60 * 60 * 1000, format: 'epoch_millis' } },
    });
  });
});

describe('logsSearch', () => {
  it('reads only the events the metrics count, and the JS errors for the environment picker', () => {
    expect(logsSearch(PARAMS).query?.bool?.filter).toContainEqual({
      terms: { event_name: ['browser.navigation_timing', 'browser.web_vital', 'exception'] },
    });
  });

  it('counts page loads by the navigation timing event, so soft navigations do not inflate them', () => {
    expect(pageLoadsOf(logsSearch(PARAMS)).filter).toEqual({
      bool: { filter: [{ term: { event_name: 'browser.navigation_timing' } }] },
    });
  });

  it('takes the load time percentile from the page loads', () => {
    const { aggs } = pageLoadsOf(logsSearch(PARAMS));

    expect(aggs.loadTime).toEqual({
      percentiles: {
        field: 'browser.navigation_timing.load_event_end',
        percents: [75],
        keyed: false,
      },
    });
    expect(aggs.loadTimeSamples).toBeUndefined();
  });

  it('counts the trend and its load time in the same buckets as the page loads', () => {
    const { aggs } = pageLoadsOf(logsSearch(PARAMS));

    expect(aggs.trend).toEqual({
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '60s',
        time_zone: 'America/New_York',
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

describe('logsSearch with filters', () => {
  const FILTERS = {
    browser: [{ value: 'Chrome', exclude: false }],
    country: [{ value: 'DE', exclude: false }],
    pageUrl: [{ value: 'https://shop.example.com/', exclude: false }],
  };
  const BROWSER_TERM = { terms: { digital_experience_filter_browser: ['Chrome'] } };
  const COUNTRY_TERM = { terms: { digital_experience_filter_country: ['DE'] } };
  const PAGE_TERM = { terms: { [PAGE_FIELD]: ['https://shop.example.com/'] } };

  it('defines the runtime fields the filters read', () => {
    expect(Object.keys(logsSearch(PARAMS).runtime_mappings ?? {})).toEqual([
      'digital_experience_filter_browser',
      'digital_experience_filter_os',
      'digital_experience_filter_device',
      'digital_experience_filter_country',
      'digital_experience_filter_appVersion',
      'digital_experience_filter_pageUrl',
    ]);
  });

  it('narrows the metrics to the selected browser, OS, device, country and page', () => {
    const logs = inEnvironmentOf(logsSearch({ ...PARAMS, filters: FILTERS })).filter;

    expect(logs).toEqual({
      bool: { filter: [{ match_all: {} }, BROWSER_TERM, COUNTRY_TERM, PAGE_TERM] },
    });
  });

  it('keep the picker environments and the filter values over every selection', () => {
    const request = logsSearch({ ...PARAMS, filters: FILTERS });

    expect(request.query?.bool?.filter).not.toContainEqual(BROWSER_TERM);
    expect(request.aggs?.environments).toBeDefined();
    expect(Object.keys(request.aggs ?? {})).toEqual(
      expect.arrayContaining(['browserOptions', 'osOptions', 'countryOptions', 'pageUrlOptions'])
    );
  });

  it('narrow the page loads to the URL text, not the web vitals, which carry no URL', () => {
    const filters = { pageContains: [{ value: 'cart', exclude: false }] };
    const logs = inEnvironmentOf(logsSearch({ ...PARAMS, filters }));

    expect(JSON.stringify(pageLoadsOf(logsSearch({ ...PARAMS, filters })).filter)).toContain(
      '*cart*'
    );
    expect(JSON.stringify(logs.filter)).not.toContain('*cart*');
    expect(JSON.stringify(logs.aggs.lcp)).not.toContain('*cart*');
  });

  it('leave out the documents of an excluded value', () => {
    const filters = { browser: [{ value: 'Chrome', exclude: true }] };

    expect(inEnvironmentOf(logsSearch({ ...PARAMS, filters })).filter).toEqual({
      bool: {
        filter: [
          { match_all: {} },
          { bool: { must_not: [{ terms: { digital_experience_filter_browser: ['Chrome'] } }] } },
        ],
      },
    });
  });

  it('are unchanged without a selection', () => {
    expect(inEnvironmentOf(logsSearch(PARAMS)).filter).toEqual({ match_all: {} });
    expect(pageLoadsOf(logsSearch(PARAMS)).filter).toEqual({
      bool: { filter: [{ term: { event_name: 'browser.navigation_timing' } }] },
    });
  });
});

describe('logsSearch with a KQL query', () => {
  const KUERY = { match: { 'user_agent.name': 'Chrome' } };

  it('keeps only the documents the query matches', () => {
    expect(logsSearch({ ...PARAMS, kuery: KUERY }).query?.bool?.filter).toContainEqual(KUERY);
  });

  it('read the same documents without it', () => {
    expect(logsSearch(PARAMS).query?.bool?.filter).not.toContainEqual(KUERY);
  });
});

describe('logsSearch percentile', () => {
  const loadTimeOf = (request: ReturnType<typeof logsSearch>) => ({
    kpi: pageLoadsOf(request).aggs.loadTime,
    trend: (pageLoadsOf(request).aggs.trend as { aggs: { loadTime: unknown } }).aggs.loadTime,
  });
  const percentileAgg = (percent: number) => ({
    percentiles: {
      field: 'browser.navigation_timing.load_event_end',
      percents: [percent],
      keyed: false,
    },
  });

  it('takes the 75th percentile of the load time by default', () => {
    expect(loadTimeOf(logsSearch(PARAMS))).toEqual({
      kpi: percentileAgg(75),
      trend: percentileAgg(75),
    });
  });

  it('takes the requested percentile for the load time and its trend', () => {
    expect(loadTimeOf(logsSearch({ ...PARAMS, percentile: 95 }))).toEqual({
      kpi: percentileAgg(95),
      trend: percentileAgg(95),
    });
  });

  it('leaves the percentile of the web vitals at 75', () => {
    const { lcp } = inEnvironmentOf(logsSearch({ ...PARAMS, percentile: 99 })).aggs as unknown as {
      lcp: { aggs: { p75: unknown } };
    };

    expect(lcp.aggs.p75).toMatchObject({ percentiles: { percents: [75] } });
  });
});
