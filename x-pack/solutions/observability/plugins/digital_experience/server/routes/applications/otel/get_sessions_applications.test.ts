/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getSessionsApplications } from './get_sessions_applications';

const sum = (value: number) => ({ value });

// `good` and `needsImprovement` of the samples are good and need improvement, the rest are poor.
const vital = (p75: number | null, samples: number, good = samples, needsImprovement = 0) => ({
  samples: sum(samples),
  good: sum(good),
  needsImprovement: sum(needsImprovement),
  p75: { values: p75 === null ? [] : [{ key: 75, value: p75 }] },
});

const terms = (...keys: string[]) => ({ buckets: keys.map((key) => ({ key })) });

const ALL_GOOD = { good: 1, needsImprovement: 0, poor: 0 };

const application = (key: string, overrides: Record<string, unknown> = {}) => ({
  key,
  // The sessions of the application that overlap the time range.
  doc_count: 1,
  environments: terms(),
  pageLoads: sum(1),
  jsErrors: sum(0),
  httpRequests: sum(0),
  failedHttpRequests: sum(0),
  lcp: vital(null, 0),
  inp: vital(null, 0),
  cls: vital(null, 0),
  fcp: vital(null, 0),
  ttfb: vital(null, 0),
  lastSeen: { value: null },
  ...overrides,
});

const setup = (aggregations: unknown) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockResolvedValue({ aggregations } as never);
  return esClient;
};

describe('getSessionsApplications', () => {
  it('maps the sessions buckets to application summaries, with the samples and ratings summed', async () => {
    const esClient = setup({
      environments: terms('production', 'staging'),
      environmentNotDefined: { doc_count: 0 },
      inEnvironment: {
        applications: {
          buckets: [
            application('web', {
              doc_count: 40,
              environments: terms('production', 'canary'),
              pageLoads: sum(12),
              jsErrors: sum(3),
              httpRequests: sum(8),
              failedHttpRequests: sum(2),
              lcp: vital(2412.5, 10),
              inp: vital(180.25, 4),
              cls: vital(0.3, 9),
              fcp: vital(1500.5, 10),
              // Two good, one needs improvement, one poor.
              ttfb: vital(950.75, 4, 2, 1),
              lastSeen: { value: Date.parse('2021-01-18T12:33:00.000Z') },
            }),
            application('no-metrics'),
          ],
        },
        pageLoadsOverTime: { buckets: [] },
      },
    });

    await expect(getSessionsApplications({ esClient, start: 1, end: 2 })).resolves.toMatchObject({
      applications: [
        {
          serviceName: 'web',
          source: 'otel',
          environments: ['production', 'canary'],
          pageLoads: { count: 12 },
          sessions: { count: 40 },
          webVitals: {
            lcp: { p75Ms: 2412.5, sampleCount: 10, ratings: ALL_GOOD },
            inp: { p75Ms: 180.25, sampleCount: 4, ratings: ALL_GOOD },
            cls: { p75: 0.3, sampleCount: 9, ratings: ALL_GOOD },
            fcp: { p75Ms: 1500.5, sampleCount: 10, ratings: ALL_GOOD },
            ttfb: {
              p75Ms: 950.75,
              sampleCount: 4,
              ratings: { good: 0.5, needsImprovement: 0.25, poor: 0.25 },
            },
          },
          jsErrors: { count: 3, perPageLoad: 0.25 },
          httpRequests: { count: 8, failedCount: 2, failedRatio: 0.25 },
          lastSeen: '2021-01-18T12:33:00.000Z',
        },
        {
          serviceName: 'no-metrics',
          environments: [],
          webVitals: { lcp: { p75Ms: null, sampleCount: 0, ratings: null } },
          jsErrors: { count: 0, perPageLoad: 0 },
          httpRequests: { count: 0, failedCount: 0, failedRatio: null },
          lastSeen: null,
        },
      ],
    });
  });

  it('has no ratio without page loads', async () => {
    const esClient = setup({
      environments: terms(),
      environmentNotDefined: { doc_count: 0 },
      inEnvironment: {
        applications: {
          buckets: [application('only-errors', { pageLoads: sum(0), jsErrors: sum(2) })],
        },
        pageLoadsOverTime: { buckets: [] },
      },
    });

    const { applications } = await getSessionsApplications({ esClient, start: 1, end: 2 });

    expect(applications[0].jsErrors).toEqual({ count: 2, perPageLoad: null });
  });

  it('lists every environment of the time range, and "Not defined" when sessions have none', async () => {
    const esClient = setup({
      environments: terms('production', 'staging'),
      environmentNotDefined: { doc_count: 2 },
      inEnvironment: { applications: { buckets: [] }, pageLoadsOverTime: { buckets: [] } },
    });

    const { environments } = await getSessionsApplications({ esClient, start: 1, end: 2 });

    expect(environments).toEqual(['production', 'staging', ENVIRONMENT_NOT_DEFINED_VALUE]);
  });

  it('charts the page loads of the sessions that started in each bucket', async () => {
    const esClient = setup({
      environments: terms(),
      environmentNotDefined: { doc_count: 0 },
      inEnvironment: {
        applications: { buckets: [] },
        pageLoadsOverTime: {
          buckets: [
            { key: 1000, doc_count: 5, pageLoads: sum(7) },
            { key: 2000, doc_count: 0, pageLoads: sum(0) },
          ],
        },
      },
    });

    const { pageLoadsOverTime } = await getSessionsApplications({ esClient, start: 1, end: 2 });

    expect(pageLoadsOverTime).toEqual([
      { timestamp: 1000, count: 7 },
      { timestamp: 2000, count: 0 },
    ]);
  });

  it('counts the sessions that started in each bucket, which the buckets already count', async () => {
    const esClient = setup({
      environments: terms(),
      environmentNotDefined: { doc_count: 0 },
      inEnvironment: {
        applications: { buckets: [] },
        pageLoadsOverTime: {
          buckets: [
            { key: 1000, doc_count: 5, pageLoads: sum(7) },
            { key: 2000, doc_count: 0, pageLoads: sum(0) },
          ],
        },
      },
    });

    const { sessionsOverTime } = await getSessionsApplications({ esClient, start: 1, end: 2 });

    expect(sessionsOverTime).toEqual([
      { timestamp: 1000, count: 5 },
      { timestamp: 2000, count: 0 },
    ]);
  });

  it('returns nothing without aggregations, e.g. when the index does not exist', async () => {
    const esClient = setup(undefined);

    await expect(getSessionsApplications({ esClient, start: 1, end: 2 })).resolves.toEqual({
      applications: [],
      environments: [],
      pageLoadsOverTime: [],
      sessionsOverTime: [],
    });
  });

  it('passes the abort signal and searches the sessions index as the current user', async () => {
    const esClient = setup(undefined);
    const { signal } = new AbortController();

    await getSessionsApplications({
      esClient,
      start: 1,
      end: 2,
      environment: 'production',
      signal,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'digital-experience-sessions-*' }),
      { signal }
    );
  });
});
