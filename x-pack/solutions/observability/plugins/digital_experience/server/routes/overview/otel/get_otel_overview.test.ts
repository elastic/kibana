/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getOtelOverview } from './get_otel_overview';

// A vital whose first `good` samples are good and the rest poor, none between the thresholds.
const vital = (value: number | null, samples: number, good = samples) => ({
  doc_count: samples,
  p75: { values: value === null ? [] : [{ key: 75, value }] },
  upToGood: { doc_count: good },
  upToNeedsImprovement: { doc_count: good },
});

const NO_VITAL = { p75Ms: null, sampleCount: 0, ratings: null };

const ALL_GOOD = { good: 1, needsImprovement: 0, poor: 0 };

const NO_FILTER_VALUES = {
  browser: [],
  os: [],
  device: [],
  country: [],
  appVersion: [],
  pageUrl: [],
  pageContains: [],
};

const filterValues = (...values: Array<[key: string, count: number]>) => ({
  values: { buckets: values.map(([key, count]) => ({ key, doc_count: count })) },
});

const terms = (...keys: string[]) => ({ buckets: keys.map((key) => ({ key })) });

const trendBucket = (
  timestamp: number,
  pageLoads: number,
  loadTimePercentileMs: number | null
) => ({
  key: timestamp,
  doc_count: pageLoads,
  loadTime: {
    values: loadTimePercentileMs === null ? [] : [{ key: 75, value: loadTimePercentileMs }],
  },
});

const logsAggregations = ({
  pageLoads = 0,
  loadTimePercentileMs = null as number | null,
  loadTimeSamples = 0,
  jsErrors = 0,
  trend = [] as ReturnType<typeof trendBucket>[],
  environments = [] as string[],
  environmentNames = [] as string[],
  notDefined = 0,
  vitals = {},
} = {}) => ({
  environments: terms(...environments),
  environmentNames: terms(...environmentNames),
  environmentNotDefined: { doc_count: notDefined },
  inEnvironment: {
    pageLoads: {
      doc_count: pageLoads,
      loadTime: {
        values: loadTimePercentileMs === null ? [] : [{ key: 75, value: loadTimePercentileMs }],
      },
      loadTimeSamples: { value: loadTimeSamples },
      trend: { buckets: trend },
    },
    jsErrors: { doc_count: jsErrors },
    lcp: vital(null, 0),
    inp: vital(null, 0),
    cls: vital(null, 0),
    fcp: vital(null, 0),
    ttfb: vital(null, 0),
    ...vitals,
  },
});

const spansAggregations = (requests = 0, failed = 0) => ({
  inEnvironment: { requests: { doc_count: requests }, failed: { doc_count: failed } },
});

const setup = ({ logs, spans }: { logs?: unknown; spans?: unknown }) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockImplementation((async ({ index }: { index: string }) => ({
    aggregations: index.startsWith('logs') ? logs : spans,
  })) as never);
  return esClient;
};

const PARAMS = { serviceName: 'shop', start: 10, end: 20 };

describe('getOtelOverview', () => {
  it('maps the logs and spans of the application to its Overview', async () => {
    const esClient = setup({
      logs: logsAggregations({
        pageLoads: 12,
        loadTimePercentileMs: 2412.5,
        loadTimeSamples: 12,
        jsErrors: 3,
        environments: ['production'],
        vitals: {
          lcp: vital(2412.5, 10),
          inp: vital(180.25, 4),
          cls: vital(0.3, 9),
          fcp: vital(1500.5, 10),
          ttfb: vital(950.75, 10, 4),
        },
      }),
      spans: spansAggregations(8, 2),
    });

    await expect(getOtelOverview({ esClient, ...PARAMS })).resolves.toEqual({
      overview: {
        serviceName: 'shop',
        percentile: 75,
        pageLoads: { count: 12 },
        loadTime: { percentileMs: 2412.5, sampleCount: 12 },
        jsErrors: { count: 3 },
        httpRequests: { count: 8, failedCount: 2, failedRatio: 0.25 },
        webVitals: {
          lcp: { p75Ms: 2412.5, sampleCount: 10, ratings: ALL_GOOD },
          inp: { p75Ms: 180.25, sampleCount: 4, ratings: ALL_GOOD },
          cls: { p75: 0.3, sampleCount: 9, ratings: ALL_GOOD },
          fcp: { p75Ms: 1500.5, sampleCount: 10, ratings: ALL_GOOD },
          ttfb: {
            p75Ms: 950.75,
            sampleCount: 10,
            ratings: { good: 0.4, needsImprovement: 0, poor: 0.6 },
          },
        },
        trend: [],
      },
      environments: ['production'],
      filters: NO_FILTER_VALUES,
    });
  });

  it('counts page loads without a load event but leaves them out of the percentile', async () => {
    const esClient = setup({
      logs: logsAggregations({ pageLoads: 5, loadTimePercentileMs: 1800.5, loadTimeSamples: 3 }),
      spans: spansAggregations(),
    });

    const { overview } = await getOtelOverview({ esClient, ...PARAMS });

    expect(overview.pageLoads.count).toBe(5);
    expect(overview.loadTime).toEqual({ percentileMs: 1800.5, sampleCount: 3 });
  });

  it('returns every bucket of the trend, with no duration where nothing was timed', async () => {
    const esClient = setup({
      logs: logsAggregations({
        pageLoads: 3,
        trend: [trendBucket(1000, 2, 1500.5), trendBucket(2000, 0, null), trendBucket(3000, 1, 0)],
      }),
      spans: spansAggregations(),
    });

    const { overview } = await getOtelOverview({ esClient, ...PARAMS });

    expect(overview.trend).toEqual([
      { timestamp: 1000, pageLoads: 2, loadTimePercentileMs: 1500.5 },
      { timestamp: 2000, pageLoads: 0, loadTimePercentileMs: null },
      { timestamp: 3000, pageLoads: 1, loadTimePercentileMs: 0 },
    ]);
    // The counts of the trend sum to the page loads KPI.
    expect(overview.trend.reduce((total, { pageLoads }) => total + pageLoads, 0)).toBe(
      overview.pageLoads.count
    );
  });

  it('has no failed ratio without requests with a known outcome', async () => {
    const esClient = setup({ logs: logsAggregations(), spans: spansAggregations(0, 0) });

    const { overview } = await getOtelOverview({ esClient, ...PARAMS });

    expect(overview.httpRequests).toEqual({ count: 0, failedCount: 0, failedRatio: null });
  });

  it('returns empty data, not measured zeros, when the indices hold nothing', async () => {
    const esClient = setup({ logs: undefined, spans: undefined });

    await expect(getOtelOverview({ esClient, ...PARAMS })).resolves.toEqual({
      overview: {
        serviceName: 'shop',
        percentile: 75,
        pageLoads: { count: 0 },
        loadTime: { percentileMs: null, sampleCount: 0 },
        jsErrors: { count: 0 },
        httpRequests: { count: 0, failedCount: 0, failedRatio: null },
        webVitals: {
          lcp: NO_VITAL,
          inp: NO_VITAL,
          cls: { p75: null, sampleCount: 0, ratings: null },
          fcp: NO_VITAL,
          ttfb: NO_VITAL,
        },
        trend: [],
      },
      environments: [],
      filters: NO_FILTER_VALUES,
    });
  });

  it('lists the values of every filter with their page loads', async () => {
    const esClient = setup({
      logs: {
        ...logsAggregations(),
        browserOptions: filterValues(['Chrome', 7], ['Firefox', 2]),
        osOptions: filterValues(['macOS', 9]),
        countryOptions: filterValues(['DE', 4]),
        appVersionOptions: filterValues(['1.3.0', 6], ['1.2.0', 3]),
        pageUrlOptions: filterValues(['https://shop.example.com/cart', 3]),
      },
      spans: spansAggregations(),
    });

    const { filters } = await getOtelOverview({ esClient, ...PARAMS });

    expect(filters).toEqual({
      browser: [
        { key: 'Chrome', count: 7 },
        { key: 'Firefox', count: 2 },
      ],
      os: [{ key: 'macOS', count: 9 }],
      device: [],
      country: [{ key: 'DE', count: 4 }],
      appVersion: [
        { key: '1.3.0', count: 6 },
        { key: '1.2.0', count: 3 },
      ],
      pageUrl: [{ key: 'https://shop.example.com/cart', count: 3 }],
      pageContains: [],
    });
  });

  it('leaves out the values the routes would not accept back as a filter', async () => {
    const esClient = setup({
      logs: {
        ...logsAggregations(),
        browserOptions: filterValues(['x'.repeat(257), 5], ['Chrome', 2]),
      },
      spans: spansAggregations(),
    });

    const { filters } = await getOtelOverview({ esClient, ...PARAMS });

    expect(filters.browser).toEqual([{ key: 'Chrome', count: 2 }]);
  });

  it('lists the environments of the application, "Not defined" first, whatever the selected one', async () => {
    const esClient = setup({
      logs: logsAggregations({
        environments: ['production'],
        environmentNames: ['staging', 'production'],
        notDefined: 2,
      }),
      spans: spansAggregations(),
    });

    const { environments } = await getOtelOverview({
      ...PARAMS,
      esClient,
      environment: 'production',
    });

    expect(environments).toEqual(['ENVIRONMENT_NOT_DEFINED', 'production', 'staging']);
  });

  it('searches the OTel logs and traces of the one application, passing the abort signal', async () => {
    const esClient = setup({ logs: logsAggregations(), spans: spansAggregations() });
    const signal = new AbortController().signal;

    await getOtelOverview({ esClient, ...PARAMS, signal });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    const indices = esClient.search.mock.calls.map(([request]) => request?.index);
    expect(indices).toEqual(['logs-*.otel-*', 'traces-*.otel-*']);
    esClient.search.mock.calls.forEach(([request, options]) => {
      expect(request?.query?.bool?.filter).toContainEqual({ term: { 'service.name': 'shop' } });
      expect(options).toEqual({ signal });
    });
  });

  it('reports the requested percentile and takes it in the logs search', async () => {
    const esClient = setup({ logs: logsAggregations(), spans: spansAggregations() });

    const { overview } = await getOtelOverview({ esClient, ...PARAMS, percentile: 95 });

    expect(overview.percentile).toBe(95);
    const [logsRequest] = esClient.search.mock.calls[0];
    expect(JSON.stringify(logsRequest?.aggs)).toContain('"percents":[95]');
  });

  it('narrows both searches with the KQL query', async () => {
    const esClient = setup({ logs: logsAggregations(), spans: spansAggregations() });
    const kuery = { match: { 'user_agent.name': 'Chrome' } };

    await getOtelOverview({ esClient, ...PARAMS, kuery });

    esClient.search.mock.calls.forEach(([request]) => {
      expect(request?.query?.bool?.filter).toContainEqual(kuery);
    });
  });

  it('fails when a search fails, instead of reporting the metrics as zero', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockRejectedValue(new Error('search_phase_execution_exception'));

    await expect(getOtelOverview({ esClient, ...PARAMS })).rejects.toThrow(
      'search_phase_execution_exception'
    );
  });
});
