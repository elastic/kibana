/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  emptyBrowserDailyStatus,
  emptyPagesDailyStatus,
  emptyServiceDailyStatus,
} from '../../common/rum_daily';
import {
  emptyVitalAttribution,
  UNGROUPED_PAGE_PATH,
  type RumOverviewResponse,
} from '../../common/rum_app';
import { resolveRumDaily } from './rum_daily';
import {
  applyRawOverviewSlice,
  applyUniqueSessionKpis,
  emptyOpenDayTail,
  mergeOpenDayTailIntoAggs,
  mergePageRowsByPath,
  weightedAverage,
} from './rum_daily_query';

const emptyVital = { p75: null, ranks: null, samples: 0 };

const overviewFixture = (
  override: Pick<RumOverviewResponse, 'kpis' | 'frustration'> &
    Partial<Pick<RumOverviewResponse, 'browsers' | 'os' | 'countries'>>
): RumOverviewResponse => ({
  vitals: { lcp: emptyVital, inp: emptyVital, cls: emptyVital, fcp: emptyVital },
  trends: [],
  topPages: [],
  browsers: [],
  os: [],
  countries: [],
  ...override,
});

const ready = (index: 'pages' | 'service' | 'browser') => ({
  ...(index === 'pages'
    ? emptyPagesDailyStatus()
    : index === 'browser'
    ? emptyBrowserDailyStatus()
    : emptyServiceDailyStatus()),
  installed: true,
  watermark: '2026-08-15T00:00:00.000Z',
  state: 'started' as const,
});

describe('resolveRumDaily', () => {
  it('uses daily rollups for long ranges when both are ready', () => {
    expect(
      resolveRumDaily({
        pagesDaily: ready('pages'),
        serviceDaily: ready('service'),
        rangeFrom: 'now-90d',
        rangeTo: 'now',
      })
    ).toEqual({ usePages: true, useService: true, useBrowser: false });
  });

  it('stays on raw for short ranges or extra filters', () => {
    expect(
      resolveRumDaily({
        pagesDaily: ready('pages'),
        serviceDaily: ready('service'),
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      })
    ).toEqual({ usePages: false, useService: false, useBrowser: false });
    expect(
      resolveRumDaily({
        pagesDaily: ready('pages'),
        serviceDaily: ready('service'),
        rangeFrom: 'now-90d',
        rangeTo: 'now',
        os: 'Mac',
      })
    ).toEqual({ usePages: false, useService: false, useBrowser: false });
  });

  it('uses browser-daily when only browser is set', () => {
    expect(
      resolveRumDaily({
        pagesDaily: ready('pages'),
        serviceDaily: ready('service'),
        browserDaily: ready('browser'),
        rangeFrom: 'now-90d',
        rangeTo: 'now',
        browser: 'Chrome',
      })
    ).toEqual({ usePages: false, useService: false, useBrowser: true });
  });

  it('can use one rollup when the other is still warming', () => {
    expect(
      resolveRumDaily({
        pagesDaily: ready('pages'),
        serviceDaily: emptyServiceDailyStatus(),
        rangeFrom: 'now-90d',
        rangeTo: 'now',
      })
    ).toEqual({ usePages: true, useService: false, useBrowser: false });
  });
});

describe('weightedAverage', () => {
  it('weights daily p75s by sample count', () => {
    expect(
      weightedAverage([
        { value: 100, weight: 1 },
        { value: 400, weight: 3 },
      ])
    ).toBe(325);
  });

  it('ignores empty buckets', () => {
    expect(
      weightedAverage([
        { value: null, weight: 10 },
        { value: 50, weight: 0 },
      ])
    ).toBeNull();
  });
});

describe('mergeOpenDayTailIntoAggs', () => {
  it('adds event counts and reweights p75 without summing session uniques', () => {
    const merged = mergeOpenDayTailIntoAggs(
      {
        page_views: { value: 178704 },
        sessions: { value: 10323 },
        error_sessions: { value: 1794 },
        error_count: { value: 3830 },
        rage_clicks: { value: 1017 },
        lcp_samples: { value: 8590 },
        lcp_good: { value: 3929 },
        lcp_p75: { value: 2400 },
      },
      {
        ...emptyOpenDayTail(),
        pageViews: 2042,
        errorCount: 34,
        sessions: 103,
        errorSessions: 18,
        rageClicks: 9,
        lcp: { samples: 74, good: 38, ni: 30, poor: 6, p75: 2100 },
      }
    );

    expect(merged.page_views).toEqual({ value: 180746 });
    expect(merged.error_count).toEqual({ value: 3864 });
    expect(merged.rage_clicks).toEqual({ value: 1026 });
    expect(merged.lcp_samples).toEqual({ value: 8664 });
    expect(merged.lcp_good).toEqual({ value: 3967 });
    expect(merged.lcp_p75).toEqual({
      value: weightedAverage([
        { value: 2400, weight: 8590 },
        { value: 2100, weight: 74 },
      ]),
    });
    expect(merged.sessions).toEqual({ value: 10323 });
    expect(merged.error_sessions).toEqual({ value: 1794 });
  });
});

describe('applyUniqueSessionKpis', () => {
  it('replaces daily session sums with raw uniques', () => {
    const overview = overviewFixture({
      kpis: {
        sessions: 10323,
        pageViews: 180746,
        errorSessions: 1794,
        errorRate: 1794 / 10323,
        bounceRate: null,
        p75LoadMs: 1200,
        p75Inp: 80,
      },
      frustration: {
        rageSessions: 341,
        errorSessions: 1794,
        deadClickSessions: 416,
        rageClicks: 1026,
        deadClicks: 421,
        errorClicks: 1266,
      },
    });

    const next = applyUniqueSessionKpis(overview, {
      sessions: 9911,
      errorSessions: 1812,
      rageSessions: 342,
      deadSessions: 421,
    });

    expect(next.kpis.sessions).toBe(9911);
    expect(next.kpis.errorSessions).toBe(1812);
    expect(next.kpis.errorRate).toBe(1812 / 9911);
    expect(next.kpis.pageViews).toBe(180746);
    expect(next.frustration.rageSessions).toBe(342);
    expect(next.frustration.deadClickSessions).toBe(421);
    expect(next.frustration.rageClicks).toBe(1026);
  });
});

describe('applyRawOverviewSlice', () => {
  it('replaces session KPIs and facets', () => {
    const overview = overviewFixture({
      kpis: {
        sessions: 10323,
        pageViews: 180746,
        errorSessions: 1794,
        errorRate: 0,
        bounceRate: null,
        p75LoadMs: null,
        p75Inp: null,
      },
      frustration: {
        rageSessions: 0,
        errorSessions: 1794,
        deadClickSessions: 0,
        rageClicks: 0,
        deadClicks: 0,
        errorClicks: 0,
      },
    });

    const next = applyRawOverviewSlice(overview, {
      unique: { sessions: 9911, errorSessions: 1812, rageSessions: 342, deadSessions: 421 },
      browsers: [{ key: 'Chrome', count: 8000 }],
      os: [{ key: 'Mac', count: 5000 }],
      countries: [
        {
          isoCode: 'US',
          name: 'United States',
          pageViews: 100,
          sessions: 40,
          errorCount: 2,
          p75Lcp: 1200,
        },
      ],
    });

    expect(next.kpis.sessions).toBe(9911);
    expect(next.browsers).toEqual([{ key: 'Chrome', count: 8000 }]);
    expect(next.countries[0]?.pageViews).toBe(100);
  });
});

describe('mergePageRowsByPath', () => {
  it('sums views for the same path and keeps new today-only paths', () => {
    const merged = mergePageRowsByPath(
      [
        {
          path: '/app',
          views: 100,
          errorCount: 1,
          p75Lcp: 2000,
          p75Inp: null,
          p75Cls: null,
          avgDurationMs: 800,
          sessionCount: 10,
          rageClicks: 2,
          deadClicks: 0,
          trend: [],
          attribution: { ...emptyVitalAttribution(), lcpElement: 'h1' },
          resources: [],
        },
      ],
      [
        {
          path: '/app',
          views: 5,
          errorCount: 0,
          p75Lcp: 1800,
          p75Inp: 80,
          p75Cls: null,
          avgDurationMs: null,
          sessionCount: 2,
          rageClicks: 1,
          deadClicks: 0,
          trend: [],
          attribution: emptyVitalAttribution(),
          resources: [],
        },
        {
          path: '/today',
          views: 9,
          errorCount: 0,
          p75Lcp: null,
          p75Inp: null,
          p75Cls: null,
          avgDurationMs: null,
          sessionCount: 3,
          rageClicks: 0,
          deadClicks: 0,
          trend: [],
          attribution: emptyVitalAttribution(),
          resources: [],
        },
      ]
    );

    expect(merged[0]).toEqual(
      expect.objectContaining({
        path: '/app',
        views: 105,
        sessionCount: 12,
        rageClicks: 3,
        p75Lcp: 2000,
        p75Inp: 80,
      })
    );
    expect(merged[1]?.path).toBe('/today');
  });

  it('keeps the ungrouped sentinel instead of dropping empty paths', () => {
    const merged = mergePageRowsByPath(
      [
        {
          path: UNGROUPED_PAGE_PATH,
          views: 84,
          errorCount: 0,
          p75Lcp: null,
          p75Inp: null,
          p75Cls: null,
          avgDurationMs: null,
          sessionCount: 6,
          rageClicks: 0,
          deadClicks: 0,
          trend: [],
          attribution: emptyVitalAttribution(),
          resources: [],
        },
      ],
      []
    );
    expect(merged).toEqual([expect.objectContaining({ path: UNGROUPED_PAGE_PATH, views: 84 })]);
  });
});
