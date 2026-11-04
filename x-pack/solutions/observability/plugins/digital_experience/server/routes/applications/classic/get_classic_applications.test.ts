/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { getClassicApplications } from './get_classic_applications';

// All samples rated good: every sample is up to both thresholds.
const vital = (value: number | null, samples: number) => ({
  doc_count: samples,
  p75: { values: value === null ? [] : [{ key: 75, value }] },
  upToGood: { doc_count: samples },
  upToNeedsImprovement: { doc_count: samples },
});

const ALL_GOOD = { good: 1, needsImprovement: 0, poor: 0 };

const terms = (...keys: string[]) => ({ buckets: keys.map((key) => ({ key })) });

const createClient = (buckets: unknown[], environments: string[] = [], notDefinedCount = 0) => {
  const search = jest.fn().mockResolvedValue({
    aggregations: {
      environments: terms(...environments),
      environmentNotDefined: { doc_count: notDefinedCount },
      inEnvironment: { applications: { buckets } },
    },
  });
  return { apmEventClient: { search } as unknown as APMEventClient, search };
};

const shopBucket = {
  key: 'shop',
  environments: terms('production'),
  pageLoads: { doc_count: 40 },
  jsErrors: { doc_count: 7 },
  httpSuccess: { doc_count: 90 },
  httpFailure: { doc_count: 10 },
  lcp: vital(2412.5, 38),
  inp: vital(null, 0),
  cls: vital(0.05, 39),
  fcp: vital(1200.5, 36),
  ttfb: vital(300.25, 40),
  lastSeen: { value: Date.parse('2021-01-18T12:25:00.000Z') },
};

describe('getClassicApplications', () => {
  it('maps the buckets to application summaries, with sample counts', async () => {
    const { apmEventClient } = createClient([shopBucket], ['production', 'staging']);

    await expect(getClassicApplications({ apmEventClient, start: 1, end: 2 })).resolves.toEqual({
      applications: [
        {
          serviceName: 'shop',
          source: 'classic',
          environments: ['production'],
          pageLoads: { count: 40 },
          webVitals: {
            lcp: { p75Ms: 2412.5, sampleCount: 38, ratings: ALL_GOOD },
            inp: { p75Ms: null, sampleCount: 0, ratings: null },
            cls: { p75: 0.05, sampleCount: 39, ratings: ALL_GOOD },
            fcp: { p75Ms: 1200.5, sampleCount: 36, ratings: ALL_GOOD },
            ttfb: { p75Ms: 300.25, sampleCount: 40, ratings: ALL_GOOD },
          },
          jsErrors: { count: 7, perPageLoad: 7 / 40 },
          httpRequests: { count: 100, failedCount: 10, failedRatio: 0.1 },
          lastSeen: '2021-01-18T12:25:00.000Z',
        },
      ],
      environments: ['production', 'staging'],
      pageLoadsOverTime: [],
    });
  });

  it('leaves the failed ratio empty without successful or failed requests', async () => {
    const { apmEventClient } = createClient([
      { ...shopBucket, httpSuccess: { doc_count: 0 }, httpFailure: { doc_count: 0 } },
    ]);

    const {
      applications: [{ httpRequests }],
    } = await getClassicApplications({ apmEventClient, start: 1, end: 2 });

    expect(httpRequests).toEqual({ count: 0, failedCount: 0, failedRatio: null });
  });

  it('filters by RUM agent, time range and measured documents, with a bounded terms aggregation', async () => {
    const { apmEventClient, search } = createClient([]);

    await getClassicApplications({ apmEventClient, start: 10, end: 20 });

    const [, params] = search.mock.calls[0];
    expect(params.query.bool.filter).toEqual([
      { range: { '@timestamp': { gte: 10, lte: 20, format: 'epoch_millis' } } },
      { terms: { 'agent.name': ['rum-js', 'js-base'] } },
      {
        bool: {
          should: [
            {
              bool: {
                filter: [
                  { term: { 'processor.event': 'transaction' } },
                  { terms: { 'transaction.type': ['page-load', 'page-exit'] } },
                ],
              },
            },
            { term: { 'processor.event': 'error' } },
            {
              bool: {
                filter: [
                  { term: { 'processor.event': 'span' } },
                  { term: { 'span.type': 'external' } },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ]);
    expect(params.aggs.inEnvironment.aggs.applications.terms).toEqual({
      field: 'service.name',
      size: 1000,
      order: { pageLoads: 'desc' },
    });
  });

  it('counts failed HTTP requests from the external spans', async () => {
    const { apmEventClient, search } = createClient([]);

    await getClassicApplications({ apmEventClient, start: 10, end: 20 });

    const [, params] = search.mock.calls[0];
    expect(params.apm.events).toEqual(['transaction', 'error', 'span']);
    expect(params.aggs.inEnvironment.aggs.applications.aggs.httpFailure).toEqual({
      filter: {
        bool: {
          filter: [
            { term: { 'processor.event': 'span' } },
            { term: { 'span.type': 'external' } },
            { term: { 'event.outcome': 'failure' } },
          ],
        },
      },
    });
  });

  it('counts the samples of each vital as the documents that have it', async () => {
    const { apmEventClient, search } = createClient([]);

    await getClassicApplications({ apmEventClient, start: 10, end: 20 });

    const [, { aggs }] = search.mock.calls[0];
    expect(aggs.inEnvironment.aggs.applications.aggs.lcp).toEqual({
      filter: { exists: { field: 'transaction.marks.agent.largestContentfulPaint' } },
      aggs: {
        p75: {
          percentiles: {
            field: 'transaction.marks.agent.largestContentfulPaint',
            percents: [75],
            keyed: false,
          },
        },
        upToGood: {
          filter: { range: { 'transaction.marks.agent.largestContentfulPaint': { lte: 2500 } } },
        },
        upToNeedsImprovement: {
          filter: { range: { 'transaction.marks.agent.largestContentfulPaint': { lte: 4000 } } },
        },
      },
    });
  });

  it('filters the applications by environment, but lists every environment', async () => {
    const { apmEventClient, search } = createClient([]);

    await getClassicApplications({ apmEventClient, start: 10, end: 20, environment: 'production' });

    const [, { aggs }] = search.mock.calls[0];
    expect(aggs.inEnvironment.filter).toEqual({
      bool: {
        should: [{ term: { 'service.environment': 'production' } }],
        minimum_should_match: 1,
      },
    });
    expect(aggs.environments).toEqual({ terms: { field: 'service.environment', size: 100 } });
  });

  it('lists "Not defined" when some documents have no environment', async () => {
    const { apmEventClient } = createClient([], ['production'], 3);

    const { environments } = await getClassicApplications({ apmEventClient, start: 1, end: 2 });

    expect(environments).toEqual(['production', 'ENVIRONMENT_NOT_DEFINED']);
  });

  it('filters "Not defined" to documents without an environment, as APM does', async () => {
    const { apmEventClient, search } = createClient([]);

    await getClassicApplications({
      apmEventClient,
      start: 10,
      end: 20,
      environment: 'ENVIRONMENT_NOT_DEFINED',
    });

    expect(search.mock.calls[0][1].aggs.inEnvironment.filter).toEqual({
      bool: {
        should: [
          { term: { 'service.environment': 'ENVIRONMENT_NOT_DEFINED' } },
          { bool: { must_not: [{ exists: { field: 'service.environment' } }] } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('matches every environment without one, or with the "All" sentinel', async () => {
    const { apmEventClient, search } = createClient([]);

    await getClassicApplications({ apmEventClient, start: 10, end: 20 });
    await getClassicApplications({
      apmEventClient,
      start: 10,
      end: 20,
      environment: 'ENVIRONMENT_ALL',
    });

    expect(search.mock.calls.map(([, { aggs }]) => aggs.inEnvironment.filter)).toEqual([
      { match_all: {} },
      { match_all: {} },
    ]);
  });
});
