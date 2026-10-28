/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getOtelApplications } from './get_otel_applications';

// `good` of the samples are good, the rest poor (as many up to both thresholds).
const vital = (value: number | null, samples: number, good = samples) => ({
  doc_count: samples,
  p75: { values: value === null ? [] : [{ key: 75, value }] },
  upToGood: { doc_count: good },
  upToNeedsImprovement: { doc_count: good },
});

const NO_VITAL = { p75Ms: null, sampleCount: 0, ratings: null };

const ALL_GOOD = { good: 1, needsImprovement: 0, poor: 0 };

const terms = (...keys: string[]) => ({ buckets: keys.map((key) => ({ key })) });

// `environments` aliases the deprecated attribute; `environmentNames` is the newer one.
const envs = (environments: string[] = [], environmentNames: string[] = [], notDefined = 0) => ({
  environments: terms(...environments),
  environmentNames: terms(...environmentNames),
  environmentNotDefined: { doc_count: notDefined },
});

// An application with page loads only, so the spans of its HTTP requests are searched.
const pageLoadsOnly = (key: string) => ({
  key,
  ...envs(),
  pageLoads: { doc_count: 1 },
  jsErrors: { doc_count: 0 },
  lcp: vital(null, 0),
  inp: vital(null, 0),
  cls: vital(null, 0),
  fcp: vital(null, 0),
  ttfb: vital(null, 0),
  lastSeen: { value: null },
});

const setup = ({
  logs,
  spans,
  logEnvironments = envs(),
  spanEnvironments = envs(),
}: {
  logs: unknown[];
  spans: unknown[];
  logEnvironments?: ReturnType<typeof envs>;
  spanEnvironments?: ReturnType<typeof envs>;
}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockImplementation((async ({ index }: { index: string }) => {
    const isLogs = index.startsWith('logs');
    return {
      aggregations: {
        ...(isLogs ? logEnvironments : spanEnvironments),
        inEnvironment: { applications: { buckets: isLogs ? logs : spans } },
      },
    };
  }) as never);
  return esClient;
};

describe('getOtelApplications', () => {
  it('maps logs and spans to application summaries, with sample counts', async () => {
    const esClient = setup({
      logs: [
        {
          key: 'web',
          ...envs(['production'], ['production']),
          pageLoads: { doc_count: 12 },
          jsErrors: { doc_count: 3 },
          lcp: vital(2412.5, 10),
          inp: vital(180.25, 4),
          cls: vital(0.3, 9),
          fcp: vital(1500.5, 10),
          ttfb: vital(950.75, 10, 4),
          lastSeen: { value: Date.parse('2021-01-18T12:20:00.000Z') },
        },
        {
          key: 'no-spans',
          ...envs([], ['staging']),
          pageLoads: { doc_count: 1 },
          jsErrors: { doc_count: 0 },
          lcp: vital(null, 0),
          inp: vital(null, 0),
          cls: vital(null, 0),
          fcp: vital(null, 0),
          ttfb: vital(null, 0),
          lastSeen: { value: Date.parse('2021-01-18T12:12:00.000Z') },
        },
      ],
      spans: [
        {
          key: 'web',
          ...envs(['canary']),
          requests: { doc_count: 8 },
          failed: { doc_count: 2 },
          lastSeen: { value: Date.parse('2021-01-18T12:33:00.000Z') },
        },
      ],
      logEnvironments: envs(['production'], ['production', 'staging']),
      spanEnvironments: envs(['canary']),
    });

    await expect(getOtelApplications({ esClient, start: 1, end: 2 })).resolves.toEqual({
      applications: [
        {
          serviceName: 'web',
          source: 'otel',
          environments: ['production', 'canary'],
          pageLoads: { count: 12 },
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
          jsErrors: { count: 3, perPageLoad: 0.25 },
          httpRequests: { count: 8, failedCount: 2, failedRatio: 0.25 },
          // The later of the logs (12:20) and the spans (12:33).
          lastSeen: '2021-01-18T12:33:00.000Z',
        },
        {
          serviceName: 'no-spans',
          source: 'otel',
          environments: ['staging'],
          pageLoads: { count: 1 },
          webVitals: {
            lcp: NO_VITAL,
            inp: NO_VITAL,
            cls: { p75: null, sampleCount: 0, ratings: null },
            fcp: NO_VITAL,
            ttfb: NO_VITAL,
          },
          jsErrors: { count: 0, perPageLoad: 0 },
          httpRequests: { count: 0, failedCount: 0, failedRatio: null },
          lastSeen: '2021-01-18T12:12:00.000Z',
        },
      ],
      environments: ['production', 'staging'],
      pageLoadsOverTime: [],
    });
  });

  it('matches web vital names in any case and orders the applications by page loads', async () => {
    const esClient = setup({ logs: [], spans: [] });

    await getOtelApplications({ esClient, start: 10, end: 20 });

    const [[logsRequest]] = esClient.search.mock.calls;
    const { applications } = (
      logsRequest?.aggs?.inEnvironment as {
        aggs: {
          applications: {
            terms: { order: unknown };
            aggs: { fcp: { filter: { bool: { filter: unknown[] } } } };
          };
        };
      }
    ).aggs;
    expect(applications.terms.order).toEqual({ pageLoads: 'desc' });
    expect(applications.aggs.fcp.filter.bool.filter).toContainEqual({
      term: { 'browser.web_vital.name': { value: 'fcp', case_insensitive: true } },
    });
  });

  it('queries the OTel logs and traces for browser SDKs only', async () => {
    const esClient = setup({ logs: [pageLoadsOnly('web')], spans: [] });

    await getOtelApplications({ esClient, start: 10, end: 20 });

    const indices = esClient.search.mock.calls.map(([request]) => request?.index);
    expect(indices).toEqual(['logs-*.otel-*', 'traces-*.otel-*']);
    esClient.search.mock.calls.forEach(([request]) => {
      expect(request?.query?.bool?.filter).toContainEqual({
        term: { 'telemetry.sdk.language': 'webjs' },
      });
    });
  });

  it('lists "Not defined" when the logs have documents without an environment', async () => {
    const esClient = setup({
      logs: [pageLoadsOnly('web')],
      spans: [],
      logEnvironments: envs(['production'], [], 2),
    });

    const { environments } = await getOtelApplications({ esClient, start: 1, end: 2 });

    expect(environments).toEqual(['production', 'ENVIRONMENT_NOT_DEFINED']);
  });

  it('lists only the environments of the logs, which define the applications', async () => {
    const esClient = setup({
      logs: [pageLoadsOnly('web')],
      spans: [],
      logEnvironments: envs(['production']),
      spanEnvironments: envs(['traces-only'], [], 2),
    });

    const { environments } = await getOtelApplications({ esClient, start: 1, end: 2 });

    expect(environments).toEqual(['production']);
  });

  it('searches the HTTP requests of the applications found in the logs only', async () => {
    const esClient = setup({ logs: [pageLoadsOnly('web'), pageLoadsOnly('shop')], spans: [] });

    await getOtelApplications({ esClient, start: 10, end: 20 });

    const [, [spansRequest]] = esClient.search.mock.calls;
    const { applications } = (
      spansRequest?.aggs?.inEnvironment as { aggs: { applications: { terms: unknown } } }
    ).aggs;
    expect(applications.terms).toEqual({
      field: 'service.name',
      size: 2,
      include: ['web', 'shop'],
    });
  });

  it('skips the spans search without applications in the logs', async () => {
    const esClient = setup({ logs: [], spans: [] });

    await getOtelApplications({ esClient, start: 10, end: 20 });

    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('filters "Not defined" to documents without either environment field', async () => {
    const esClient = setup({ logs: [pageLoadsOnly('web')], spans: [] });

    await getOtelApplications({
      esClient,
      start: 10,
      end: 20,
      environment: 'ENVIRONMENT_NOT_DEFINED',
    });

    esClient.search.mock.calls.forEach(([request]) => {
      expect((request?.aggs?.inEnvironment as { filter: unknown } | undefined)?.filter).toEqual({
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
      });
    });
  });

  it('filters by environment on both environment fields', async () => {
    const esClient = setup({ logs: [pageLoadsOnly('web')], spans: [] });

    await getOtelApplications({ esClient, start: 10, end: 20, environment: 'production' });

    esClient.search.mock.calls.forEach(([request]) => {
      expect((request?.aggs?.inEnvironment as { filter: unknown } | undefined)?.filter).toEqual({
        bool: {
          should: [
            { term: { 'service.environment': 'production' } },
            { term: { 'resource.attributes.deployment.environment.name': 'production' } },
          ],
          minimum_should_match: 1,
        },
      });
    });
  });
});
