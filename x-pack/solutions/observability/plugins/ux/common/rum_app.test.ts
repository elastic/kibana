/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OTHER_ERROR_TREND_ID,
  durationToMs,
  emptyPageImpact,
  emptyVitalAttribution,
  isBotUserAgent,
  isNewInRange,
  makeErrorGroupKey,
  mergeRumPageRows,
  pagePassesCwv,
  ranksFromCounts,
  ranksFromPercentileRanks,
  rateVital,
  stackErrorTrends,
  summarizePagesKpis,
  type RumPageRow,
} from './rum_app';

describe('makeErrorGroupKey', () => {
  it('joins type and the first line of the message', () => {
    expect(makeErrorGroupKey('TypeError', 'x is not defined\n    at foo')).toBe(
      'TypeError|x is not defined'
    );
  });

  it('falls back when type or message is missing', () => {
    expect(makeErrorGroupKey(null, null)).toBe('Error|');
    expect(makeErrorGroupKey('RangeError', null)).toBe('RangeError|');
  });
});

describe('durationToMs', () => {
  it('treats nanosecond values as ns', () => {
    expect(durationToMs(2.5e9)).toBe(2500);
  });

  it('treats microsecond values as µs', () => {
    expect(durationToMs(2.5e6)).toBe(2500);
  });

  it('passes through millisecond values', () => {
    expect(durationToMs(2500)).toBe(2500);
  });
});

describe('ranksFromCounts', () => {
  it('converts stored daily counts to the same integer percents as percentile_ranks', () => {
    expect(ranksFromCounts(70, 20, 10)).toEqual({ good: 70, ni: 20, poor: 10 });
    expect(ranksFromCounts(0, 0, 0)).toBeNull();
  });
});

describe('ranksFromPercentileRanks', () => {
  it('splits good / needs-improvement / poor', () => {
    expect(ranksFromPercentileRanks({ '2500.0': 70, '4000.0': 90 })).toEqual({
      good: 70,
      ni: 20,
      poor: 10,
    });
  });

  it('rounds cumulative ranks so legend percents are integers that sum to 100', () => {
    expect(ranksFromPercentileRanks({ '2500.0': 55.35714285714286, '4000.0': 100 })).toEqual({
      good: 55,
      ni: 45,
      poor: 0,
    });
    expect(ranksFromPercentileRanks({ '0.1': 86.2532596863776, '0.25': 100 })).toEqual({
      good: 86,
      ni: 14,
      poor: 0,
    });
  });
});

describe('isBotUserAgent', () => {
  it('detects known bot tokens', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBotUserAgent('curl/8.0.1')).toBe(true);
    expect(isBotUserAgent('Chrome-Lighthouse')).toBe(true);
    expect(isBotUserAgent('python-requests/2.31.0')).toBe(true);
  });

  it('does not treat headless Chrome as a bot so local Playwright data stays visible', () => {
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  it('returns false for empty or human agents', () => {
    expect(isBotUserAgent(null)).toBe(false);
    expect(isBotUserAgent(undefined)).toBe(false);
    expect(isBotUserAgent('')).toBe(false);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });
});

const page = (overrides: Partial<RumPageRow> & Pick<RumPageRow, 'path'>): RumPageRow => ({
  views: 0,
  errorCount: 0,
  p75Lcp: null,
  p75Inp: null,
  p75Cls: null,
  avgDurationMs: null,
  ...emptyPageImpact(),
  attribution: emptyVitalAttribution(),
  resources: [],
  ...overrides,
});

describe('rateVital', () => {
  it('returns null for missing values', () => {
    expect(rateVital('lcp', null)).toBeNull();
    expect(rateVital('inp', Number.NaN)).toBeNull();
  });

  it('uses inclusive good / NI thresholds', () => {
    expect(rateVital('lcp', 2500)).toBe('good');
    expect(rateVital('lcp', 2501)).toBe('ni');
    expect(rateVital('lcp', 4000)).toBe('ni');
    expect(rateVital('lcp', 4001)).toBe('poor');
    expect(rateVital('inp', 200)).toBe('good');
    expect(rateVital('inp', 500)).toBe('ni');
    expect(rateVital('cls', 0.1)).toBe('good');
    expect(rateVital('cls', 0.25)).toBe('ni');
    expect(rateVital('cls', 0.26)).toBe('poor');
  });
});

describe('pagePassesCwv', () => {
  it('requires all three p75s to be good', () => {
    expect(pagePassesCwv({ p75Lcp: 2000, p75Inp: 150, p75Cls: 0.05 })).toBe(true);
    expect(pagePassesCwv({ p75Lcp: 2000, p75Inp: 150, p75Cls: null })).toBe(false);
    expect(pagePassesCwv({ p75Lcp: 3000, p75Inp: 150, p75Cls: 0.05 })).toBe(false);
  });
});

describe('isNewInRange', () => {
  const hour = 60 * 60 * 1000;

  it('is false when the first event is at the start of the window', () => {
    const from = Date.parse('2026-08-14T00:00:00.000Z');
    const to = from + 24 * hour;
    expect(isNewInRange(from, from, to)).toBe(false);
  });

  it('caps slack at one hour so a 24h window treats later first-seen as new', () => {
    const from = Date.parse('2026-08-14T00:00:00.000Z');
    const to = from + 24 * hour;
    expect(isNewInRange(from + hour + 1, from, to)).toBe(true);
    expect(isNewInRange(from + hour, from, to)).toBe(false);
  });

  it('uses 10% of short windows as slack', () => {
    const from = Date.parse('2026-08-14T00:00:00.000Z');
    const to = from + hour;
    const slack = hour * 0.1;
    expect(isNewInRange(from + slack, from, to)).toBe(false);
    expect(isNewInRange(from + slack + 1, from, to)).toBe(true);
  });

  it('rejects non-finite timestamps', () => {
    expect(isNewInRange(Number.NaN, 1, 2)).toBe(false);
  });
});

describe('summarizePagesKpis', () => {
  it('weights passing CWV by views and does not sum per-page sessions', () => {
    const kpis = summarizePagesKpis(
      [
        { views: 80, p75Lcp: 2000, p75Inp: 100, p75Cls: 0.05 },
        { views: 20, p75Lcp: 5000, p75Inp: 100, p75Cls: 0.05 },
      ],
      42
    );
    expect(kpis.views).toBe(100);
    expect(kpis.sessions).toBe(42);
    expect(kpis.passingCwvPct).toBe(0.8);
    expect(kpis.poorLcpPages).toBe(1);
  });

  it('returns a null passing share when there are no views', () => {
    expect(summarizePagesKpis([], 0)).toEqual({
      views: 0,
      sessions: 0,
      passingCwvPct: null,
      poorLcpPages: 0,
    });
  });
});

describe('mergeRumPageRows', () => {
  it('sums impact fields and aligns trend buckets', () => {
    const merged = mergeRumPageRows(
      [
        page({ path: '/a/1', views: 2, sessionCount: 2, rageClicks: 1, trend: [1, 2] }),
        page({ path: '/a/2', views: 3, sessionCount: 1, deadClicks: 4, trend: [0, 1, 1] }),
      ],
      { depth: 1 }
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].path).toBe('/a/*');
    expect(merged[0].views).toBe(5);
    expect(merged[0].sessionCount).toBe(3);
    expect(merged[0].rageClicks).toBe(1);
    expect(merged[0].deadClicks).toBe(4);
    expect(merged[0].trend).toEqual([1, 3, 1]);
  });
});

describe('stackErrorTrends', () => {
  it('keeps the top groups and rolls the rest into Other', () => {
    const groups = [1, 2, 3, 4, 5, 6].map((n) => ({
      key: `g${n}`,
      type: `T${n}`,
      count: 10 - n,
      trendPoints: [
        { timestamp: '2026-08-14T00:00:00.000Z', count: n },
        { timestamp: '2026-08-14T01:00:00.000Z', count: n === 6 ? 4 : 0 },
      ],
    }));
    const series = stackErrorTrends(groups, 5);
    expect(series.map((item) => item.id)).toEqual([
      'g1',
      'g2',
      'g3',
      'g4',
      'g5',
      OTHER_ERROR_TREND_ID,
    ]);
    const other = series[series.length - 1];
    expect(other.points[0].count).toBe(6);
    expect(other.points[1].count).toBe(4);
  });

  it('fills missing timestamps with zero', () => {
    const series = stackErrorTrends(
      [
        {
          key: 'a',
          type: 'A',
          count: 2,
          trendPoints: [{ timestamp: '2026-08-14T00:00:00.000Z', count: 2 }],
        },
        {
          key: 'b',
          type: 'B',
          count: 1,
          trendPoints: [{ timestamp: '2026-08-14T01:00:00.000Z', count: 1 }],
        },
      ],
      5
    );
    expect(series[0].points.map((point) => point.count)).toEqual([2, 0]);
    expect(series[1].points.map((point) => point.count)).toEqual([0, 1]);
  });
});
