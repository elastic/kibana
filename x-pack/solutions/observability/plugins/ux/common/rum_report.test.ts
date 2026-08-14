/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FUNNEL_STEPS } from './session_funnel';
import type { RumPageRow } from './rum_app';
import {
  CSV_ROW_CAP,
  computeDelta,
  csvFilename,
  isLiveRelativeRange,
  isRumReportTemplateId,
  joinCountryRows,
  joinPageRows,
  maskDisplayUser,
  parseFunnelStepsParam,
  previousCompleteCalendarWeek,
  previousEqualPeriod,
  poorLcpShare,
  reportPrimaryCsv,
  scorecardMarkdown,
  toCsv,
} from './rum_report';
import type { RumScorecardReport } from './rum_report';

describe('previousEqualPeriod', () => {
  it('shifts an ISO window backward by the same duration', () => {
    const period = previousEqualPeriod('2026-08-03T00:00:00.000Z', '2026-08-10T00:00:00.000Z');
    expect(period).toEqual({
      currentFrom: '2026-08-03T00:00:00.000Z',
      currentTo: '2026-08-10T00:00:00.000Z',
      compareFrom: '2026-07-27T00:00:00.000Z',
      compareTo: '2026-08-03T00:00:00.000Z',
    });
  });

  it('returns null for inverted or invalid bounds', () => {
    expect(previousEqualPeriod('2026-08-10T00:00:00.000Z', '2026-08-03T00:00:00.000Z')).toBeNull();
    expect(previousEqualPeriod('not-a-date', 'now')).toBeNull();
  });
});

describe('previousCompleteCalendarWeek', () => {
  it('uses last Monday through this Monday for a mid-week date', () => {
    const now = new Date(2026, 7, 14, 15, 30, 0);
    const { rangeFrom, rangeTo } = previousCompleteCalendarWeek(now);
    expect(new Date(rangeFrom).getDay()).toBe(1);
    expect(new Date(rangeTo).getDay()).toBe(1);
    expect(new Date(rangeFrom).getDate()).toBe(3);
    expect(new Date(rangeTo).getDate()).toBe(10);
  });

  it('treats Monday as the end of the week that just completed', () => {
    const now = new Date(2026, 7, 10, 9, 0, 0);
    const { rangeFrom, rangeTo } = previousCompleteCalendarWeek(now);
    expect(new Date(rangeFrom).getDate()).toBe(3);
    expect(new Date(rangeTo).getDate()).toBe(10);
  });
});

describe('isLiveRelativeRange', () => {
  it('treats now-* and empty ranges as live', () => {
    expect(isLiveRelativeRange('now-24h', 'now')).toBe(true);
    expect(isLiveRelativeRange('now-7d/d', 'now/d')).toBe(true);
    expect(isLiveRelativeRange(undefined, undefined)).toBe(true);
  });

  it('treats absolute ISO ranges as snapshots', () => {
    expect(isLiveRelativeRange('2026-08-03T00:00:00.000Z', '2026-08-10T00:00:00.000Z')).toBe(false);
  });
});

describe('computeDelta', () => {
  it('computes abs and pct when both sides exist', () => {
    expect(computeDelta(120, 100)).toEqual({ current: 120, previous: 100, abs: 20, pct: 0.2 });
  });

  it('uses 0 pct when both values are 0, and null pct when previous is 0', () => {
    expect(computeDelta(0, 0).pct).toBe(0);
    expect(computeDelta(10, 0).pct).toBeNull();
  });

  it('omits abs/pct when previous is missing', () => {
    expect(computeDelta(5, null)).toEqual({
      current: 5,
      previous: null,
      abs: null,
      pct: null,
    });
  });
});

describe('maskDisplayUser', () => {
  it('prefers name, then id, and never email unless includePii', () => {
    expect(maskDisplayUser({ name: 'Ada', id: 'u-1', email: 'ada@example.com' }, false)).toBe(
      'Ada'
    );
    expect(maskDisplayUser({ name: null, id: 'u-1', email: 'ada@example.com' }, false)).toBe('u-1');
    expect(maskDisplayUser({ name: null, id: null, email: 'ada@example.com' }, false)).toBe(
      'Identified user'
    );
    expect(maskDisplayUser({ name: null, id: null, email: 'ada@example.com' }, true)).toBe(
      'ada@example.com'
    );
    expect(maskDisplayUser({ name: null, id: null, email: null }, false)).toBeNull();
  });
});

describe('toCsv and csvFilename', () => {
  it('escapes quotes and commas and caps rows', () => {
    const csv = toCsv(
      ['a', 'b'],
      [
        ['x', 'y,z'],
        ['he said "hi"', 2],
      ]
    );
    expect(csv).toBe('a,b\nx,"y,z"\n"he said ""hi""",2');
    const many = toCsv(
      ['n'],
      Array.from({ length: CSV_ROW_CAP + 5 }, (_, i) => [i])
    );
    expect(many.trim().split('\n')).toHaveLength(CSV_ROW_CAP + 1);
  });

  it('builds a filesystem-safe filename', () => {
    expect(csvFilename('scorecard', '2026-08-03T00:00:00.000Z', 'now/d')).toBe(
      'ux-scorecard-2026-08-03T000000.000Z-nowd.csv'
    );
  });
});

describe('parseFunnelStepsParam', () => {
  it('falls back to defaults for missing or invalid JSON', () => {
    expect(parseFunnelStepsParam(undefined)).toEqual(DEFAULT_FUNNEL_STEPS);
    expect(parseFunnelStepsParam('{')).toEqual(DEFAULT_FUNNEL_STEPS);
    expect(parseFunnelStepsParam('[]')).toEqual(DEFAULT_FUNNEL_STEPS);
  });

  it('parses a valid steps payload', () => {
    expect(
      parseFunnelStepsParam(
        JSON.stringify([
          { type: 'page', value: 'home', label: 'Home' },
          { type: 'activity', value: 'Buy' },
        ])
      )
    ).toEqual([
      { type: 'page', value: 'home', label: 'Home' },
      { type: 'activity', value: 'Buy' },
    ]);
  });
});

describe('joinPageRows / poorLcpShare / joinCountryRows', () => {
  const page = (path: string, views: number, p75Lcp: number | null): RumPageRow => ({
    path,
    views,
    errorCount: 0,
    p75Lcp,
    p75Inp: null,
    p75Cls: null,
    avgDurationMs: null,
    attribution: {
      lcpElement: null,
      lcpUrl: null,
      lcpTtfb: null,
      lcpResourceLoadDelay: null,
      lcpResourceLoadDuration: null,
      lcpElementRenderDelay: null,
      inpTarget: null,
      inpType: null,
      inpInputDelay: null,
      inpProcessing: null,
      inpPresentation: null,
      clsSource: null,
    },
    resources: [],
  });

  it('joins previous views on path', () => {
    const joined = joinPageRows([page('/a', 20, 1000)], [page('/a', 10, 800)]);
    expect(joined[0].viewsDelta).toEqual({ current: 20, previous: 10, abs: 10, pct: 1 });
  });

  it('computes the share of pages with poor LCP', () => {
    expect(poorLcpShare([page('/a', 1, 5000), page('/b', 1, 1000), page('/c', 1, null)])).toBe(0.5);
    expect(poorLcpShare([page('/a', 1, null)])).toBeNull();
  });

  it('joins previous country volume on iso code', () => {
    const joined = joinCountryRows(
      [
        {
          isoCode: 'DE',
          name: 'Germany',
          pageViews: 21,
          sessions: 6,
          errorCount: 1,
          p75Lcp: 43,
        },
      ],
      [
        {
          isoCode: 'DE',
          name: 'Germany',
          pageViews: 10,
          sessions: 4,
          errorCount: 0,
          p75Lcp: 40,
        },
      ]
    );
    expect(joined[0].pageViewsDelta).toEqual({ current: 21, previous: 10, abs: 11, pct: 1.1 });
    expect(joined[0].sessionsDelta.pct).toBe(0.5);
  });
});

describe('isRumReportTemplateId', () => {
  it('accepts catalog ids only', () => {
    expect(isRumReportTemplateId('scorecard')).toBe(true);
    expect(isRumReportTemplateId('heatmap')).toBe(false);
  });
});

describe('scorecardMarkdown / reportPrimaryCsv', () => {
  const report: RumScorecardReport = {
    templateId: 'scorecard',
    title: 'Weekly UX scorecard',
    serviceName: 'shop',
    rangeFrom: '2026-08-03T00:00:00.000Z',
    rangeTo: '2026-08-10T00:00:00.000Z',
    compareFrom: '2026-07-27T00:00:00.000Z',
    compareTo: '2026-08-03T00:00:00.000Z',
    generatedAt: '2026-08-14T00:00:00.000Z',
    noPreviousPeriod: false,
    kpis: {
      sessions: { current: 10, previous: 8, abs: 2, pct: 0.25 },
      pageViews: { current: 20, previous: 20, abs: 0, pct: 0 },
      errorRate: { current: 0.1, previous: 0.2, abs: -0.1, pct: -0.5 },
      p75LoadMs: { current: 1200, previous: 1000, abs: 200, pct: 0.2 },
      p75Inp: { current: 180, previous: 200, abs: -20, pct: -0.1 },
    },
    vitals: {
      lcp: { p75: 5000, ranks: { good: 10, ni: 20, poor: 70 }, samples: 10 },
      inp: { p75: null, ranks: null, samples: 0 },
      cls: { p75: null, ranks: null, samples: 0 },
      fcp: { p75: null, ranks: null, samples: 0 },
    },
    vitalsPrevious: null,
    trends: [],
    frustration: {
      rageSessions: 1,
      errorSessions: 2,
      deadClickSessions: 0,
      rageClicks: 1,
      deadClicks: 0,
      errorClicks: 0,
    },
    frustrationPrevious: null,
    topPages: [
      {
        path: '/checkout',
        views: 4,
        errorCount: 1,
        p75Lcp: 5100,
        p75Inp: 300,
        p75Cls: 0.1,
        avgDurationMs: null,
        attribution: {
          lcpElement: null,
          lcpUrl: null,
          lcpTtfb: null,
          lcpResourceLoadDelay: null,
          lcpResourceLoadDuration: null,
          lcpElementRenderDelay: null,
          inpTarget: null,
          inpType: null,
          inpInputDelay: null,
          inpProcessing: null,
          inpPresentation: null,
          clsSource: null,
        },
        resources: [],
        viewsDelta: { current: 4, previous: null, abs: null, pct: null },
        p75LcpDelta: { current: 5100, previous: null, abs: null, pct: null },
      },
    ],
    errorGroups: [
      {
        key: 'TypeError|x',
        type: 'TypeError',
        message: 'x is not defined',
        count: 3,
        sessionCount: 2,
        userCount: 1,
        sampleStack: null,
        groupingKey: null,
        trend: [],
        samplePage: null,
        sampleAction: null,
        sampleTraceId: null,
        countDelta: { current: 3, previous: null, abs: null, pct: null },
      },
    ],
    sampleSessions: [
      {
        sessionId: 's1',
        startTime: null,
        durationMs: 1000,
        errorCount: 1,
        rageClickCount: 2,
        hasReplay: true,
        displayUser: 'Ada',
        browser: 'Chrome',
      },
    ],
    browsers: [],
    os: [],
    countries: [
      {
        isoCode: 'DE',
        name: 'Germany',
        pageViews: 21,
        sessions: 6,
        errorCount: 1,
        p75Lcp: 43,
        pageViewsDelta: { current: 21, previous: 10, abs: 11, pct: 1.1 },
        sessionsDelta: { current: 6, previous: 4, abs: 2, pct: 0.5 },
        errorCountDelta: { current: 1, previous: 0, abs: 1, pct: null },
      },
    ],
  };

  it('never includes email in markdown even when a user is identified', () => {
    const md = scorecardMarkdown(report, 'https://kbn/app/ux/reports/scorecard');
    expect(md).toContain('Weekly UX scorecard');
    expect(md).toContain('/checkout');
    expect(md).toContain('TypeError');
    expect(md).not.toContain('@');
    expect(md).toContain('Germany');
    expect(md).toContain('https://kbn/app/ux/reports/scorecard');
  });

  it('emits a pages CSV without email', () => {
    const csv = reportPrimaryCsv(report);
    expect(csv.split('\n')[0]).toBe('path,views,p75Lcp,p75Inp,p75Cls,errors');
    expect(csv).toContain('/checkout');
    expect(csv).not.toContain('@');
  });
});
