/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rumPerformanceScore } from '../../common/rum_performance_score';
import { RUM_SESSIONS_INDEX } from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import { parseAppTerms, queryRumApps } from './rum_apps_query';

describe('parseAppTerms', () => {
  it('reads sessions, page views, errors, lcp, and platform', () => {
    expect(
      parseAppTerms({
        buckets: [
          {
            key: 'weather-demo-app',
            doc_count: 19,
            sessions: { value: 1 },
            page_views: { doc_count: 0 },
            error_sessions: { sessions: { value: 1 } },
            lcp: { p75: { values: { '75.0': null } } },
            osName: { buckets: [{ key: 'Android' }] },
          },
        ],
      })
    ).toEqual([
      {
        name: 'weather-demo-app',
        platform: 'android',
        sessions: 1,
        pageViews: 0,
        errorSessions: 1,
        errorRate: 1,
        p75Lcp: null,
        p75Inp: null,
        p75Cls: null,
        p75Fcp: null,
        p75Ttfb: null,
        score: rumPerformanceScore({ errorRate: 1 }),
        scoreTrend: [],
        environments: [],
        scoreDelta: null,
        sessionsDelta: null,
        errorRateDelta: null,
        opportunity: null,
        trend: [],
      },
    ]);
  });

  it('reads vitals, score, and trend buckets', () => {
    const rows = parseAppTerms({
      buckets: [
        {
          key: 'shop',
          doc_count: 40,
          sessions: { value: 10 },
          page_views: { doc_count: 40 },
          error_sessions: { sessions: { value: 1 } },
          lcp: {
            p75: { values: { '75.0': 2000 } },
            ranks: { values: { '2500.0': 80, '4000.0': 95 } },
          },
          inp: {
            p75: { values: { '75.0': 150 } },
            ranks: { values: { '200.0': 70, '500.0': 90 } },
          },
          cls: { p75: { values: { '75.0': 0.05 } } },
          fcp: { p75: { values: { '75.0': 1200 } } },
          ttfb: { p75: { values: { '75.0': 400 } } },
          trend: {
            buckets: [
              {
                doc_count: 4,
                sessions: { value: 4 },
                error_sessions: { sessions: { value: 0 } },
                lcp: {
                  p75: { values: { '75.0': 2000 } },
                  ranks: { values: { '2500.0': 80, '4000.0': 100 } },
                },
              },
              { doc_count: 8 },
              { doc_count: 6 },
            ],
          },
          rumPlatform: { buckets: [{ key: 'web' }] },
          environments: { buckets: [{ key: 'prod' }, { key: 'staging' }] },
          classicEnvironments: { buckets: [{ key: 'prod' }] },
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: 'shop',
      platform: 'web',
      sessions: 10,
      pageViews: 40,
      errorSessions: 1,
      p75Lcp: 2000,
      p75Inp: 150,
      p75Cls: 0.05,
      p75Fcp: 1200,
      p75Ttfb: 400,
      environments: ['prod', 'staging'],
      trend: [4, 8, 6],
      scoreTrend: [
        rumPerformanceScore({
          lcp: 2000,
          errorRate: 0,
          ranks: { lcp: { good: 80, ni: 20, poor: 0 } },
        }),
        rumPerformanceScore({ errorRate: 0 }),
        rumPerformanceScore({ errorRate: 0 }),
      ],
      ranks: {
        lcp: { good: 80, ni: 15, poor: 5 },
        inp: { good: 70, ni: 20, poor: 10 },
      },
    });
    expect(rows[0].score).toBe(
      rumPerformanceScore({
        lcp: 2000,
        inp: 150,
        cls: 0.05,
        fcp: 1200,
        ttfb: 400,
        errorRate: 0.1,
        ranks: {
          lcp: { good: 80, ni: 15, poor: 5 },
          inp: { good: 70, ni: 20, poor: 10 },
        },
      })
    );
  });
});

describe('queryRumApps', () => {
  it('issues one search covering the previous equal period', async () => {
    const search = jest.fn().mockResolvedValue({ aggregations: {} });
    await queryRumApps({
      client: { search } as never,
      rangeFrom: '2026-08-15T00:00:00.000Z',
      rangeTo: '2026-08-16T00:00:00.000Z',
    });
    expect(search).toHaveBeenCalledTimes(1);
    const body = search.mock.calls[0][0] as {
      query: {
        bool: { filter: Array<{ range?: { '@timestamp': { gte: string; lte: string } } }> };
      };
      aggs: { current?: unknown; previous?: unknown };
    };
    expect(body.query.bool.filter[0].range?.['@timestamp']).toEqual({
      gte: '2026-08-14T00:00:00.000Z',
      lte: '2026-08-16T00:00:00.000Z',
    });
    expect(body.aggs.current).toBeDefined();
    expect(body.aggs.previous).toBeDefined();
    expect(
      (body.aggs.current as { aggs?: { sessionTraffic?: unknown } }).aggs?.sessionTraffic
    ).toBeDefined();
  });

  it('requests percentile ranks for each Core Web Vital on raw apps', async () => {
    const search = jest.fn().mockResolvedValue({ aggregations: {} });
    await queryRumApps({
      client: { search } as never,
      rangeFrom: '2026-08-15T00:00:00.000Z',
      rangeTo: '2026-08-16T00:00:00.000Z',
    });
    const otelApps = search.mock.calls[0][0].aggs.current.aggs.otelApps.aggs as {
      lcp: { aggs: { ranks: { percentile_ranks: { values: number[] } } } };
      ttfb: { aggs: { ranks: { percentile_ranks: { values: number[] } } } };
    };
    expect(otelApps.lcp.aggs.ranks.percentile_ranks.values).toEqual([2500, 4000]);
    expect(otelApps.ttfb.aggs.ranks.percentile_ranks.values).toEqual([800, 1800]);
  });

  it('returns fleet session traffic from the current period histogram', async () => {
    const search = jest.fn().mockResolvedValue({
      aggregations: {
        current: {
          sessionTraffic: {
            buckets: [
              { key: 1000, sessions: { value: 4 } },
              { key: 2000, sessions: { value: 9 } },
            ],
          },
        },
      },
    });
    const result = await queryRumApps({
      client: { search } as never,
      rangeFrom: '2026-08-15T00:00:00.000Z',
      rangeTo: '2026-08-16T00:00:00.000Z',
    });
    expect(result.sessionTraffic).toEqual([
      { timestamp: 1000, sessions: 4 },
      { timestamp: 2000, sessions: 9 },
    ]);
  });

  it('attaches inspector metadata for the applications search', async () => {
    const search = jest.fn().mockResolvedValue({ aggregations: {}, took: 12 });
    const result = await queryRumApps({
      client: { search } as never,
      rangeFrom: '2026-08-15T00:00:00.000Z',
      rangeTo: '2026-08-16T00:00:00.000Z',
      request: {
        query: {},
        route: { method: 'get', path: '/internal/ux/rum/apps' },
      } as never,
    });
    expect(result._inspect).toHaveLength(1);
    expect(result._inspect?.[0].name).toContain('UxApplications');
    expect(result._inspect?.[0].json).toEqual(expect.objectContaining({ size: 0 }));
  });

  it('reads session-index buckets from doc_count and dest vitals', () => {
    const rows = parseAppTerms({
      buckets: [
        {
          key: 'shop',
          doc_count: 10,
          page_views: { value: 40 },
          error_sessions: { doc_count: 1 },
          lcp: { values: { '75.0': 2000 } },
          osName: { buckets: [{ key: 'Android' }, { key: 'Mac OS X' }] },
        },
      ],
    });
    expect(rows[0]).toMatchObject({
      name: 'shop',
      sessions: 10,
      pageViews: 40,
      errorSessions: 1,
      p75Lcp: 2000,
      platform: 'web',
    });
  });

  it('keeps native android when the session dest has no web vitals', () => {
    const rows = parseAppTerms({
      buckets: [
        {
          key: 'weather-demo-app',
          doc_count: 20,
          page_views: { value: 0 },
          error_sessions: { doc_count: 1 },
          osName: { buckets: [{ key: 'Android' }] },
        },
      ],
    });
    expect(rows[0].platform).toBe('android');
  });

  it('queries the sessions index first when the transform is available', async () => {
    const search = jest.fn().mockResolvedValue({ aggregations: {} });
    const result = await queryRumApps({
      client: { search } as never,
      rangeFrom: '2026-08-15T00:00:00.000Z',
      rangeTo: '2026-08-16T00:00:00.000Z',
      stage: 'index',
      useIndex: true,
      mergeRaw: true,
      watermark: '2026-08-15T23:55:00.000Z',
    });
    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][0].index).toBe(RUM_SESSIONS_INDEX);
    expect(search.mock.calls[0][0].aggs.current.aggs.apps.aggs.lcp).toEqual({
      percentiles: { field: 'lcp_p75', percents: [75] },
    });
    expect(search.mock.calls[1][0].index).toBe(RUM_SESSION_SOURCE_INDEX);
    expect(result.source).toBe('sessions');
    expect(result.remainder).toBe(true);
  });

  it('queries raw only after the watermark for the remainder stage', async () => {
    const search = jest.fn().mockResolvedValue({ aggregations: {} });
    await queryRumApps({
      client: { search } as never,
      rangeFrom: '2026-08-15T00:00:00.000Z',
      rangeTo: '2026-08-16T00:00:00.000Z',
      stage: 'remainder',
      useIndex: true,
      mergeRaw: true,
      watermark: '2026-08-15T23:55:00.000Z',
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0].index).toBe(RUM_SESSION_SOURCE_INDEX);
    expect(search.mock.calls[0][0].query.bool.filter[0].range['@timestamp']).toEqual({
      gte: '2026-08-15T23:55:00.000Z',
      lte: '2026-08-16T00:00:00.000Z',
    });
  });
});
