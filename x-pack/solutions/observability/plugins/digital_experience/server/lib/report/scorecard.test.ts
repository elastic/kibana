/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_WEB_VITALS } from '../../../common/core_web_vitals';
import { toComparedValue } from '../../../common/mobile/kpis';
import type {
  ApplicationOverview,
  ApplicationOverviewKpisResponse,
} from '../../../common/types/overview';
import type { ScorecardMeasure } from '../../../common/types/scorecard';
import { buildScorecard } from './scorecard';

const overview = (overrides: Partial<ApplicationOverview> = {}): ApplicationOverview => ({
  serviceName: 'shop',
  percentile: 75,
  pageLoads: { count: 1000 },
  loadTime: { percentileMs: 2000 },
  webVitals: NO_WEB_VITALS,
  trend: [],
  trendHistogram: { interval: { value: 1, unit: 's' }, start: 0, end: 1_000 },
  ...overrides,
});

type KpiKey = Exclude<keyof ApplicationOverviewKpisResponse, 'percentile' | 'counts'>;
type KpiValues = Partial<Record<KpiKey, [number | null, number | null]>>;

const DEFAULT_KPIS: Record<KpiKey, [number | null, number | null]> = {
  sessions: [500, 500],
  errorFreeSessions: [0.9, 0.9],
  pageLoads: [1000, 1000],
  loadTime: [2000, 2000],
  jsErrors: [10, 10],
  failedHttpRequests: [0.01, 0.01],
  requestLatency: [300, 300],
};

/** The KPIs as [current, previous] pairs, the defaults for the ones not given. */
const kpis = (values: KpiValues = {}): ApplicationOverviewKpisResponse => {
  const merged = { ...DEFAULT_KPIS, ...values };
  const compared = (key: KpiKey) => toComparedValue(merged[key][0], merged[key][1]);
  return {
    percentile: 75,
    sessions: compared('sessions'),
    errorFreeSessions: compared('errorFreeSessions'),
    pageLoads: compared('pageLoads'),
    loadTime: compared('loadTime'),
    jsErrors: compared('jsErrors'),
    failedHttpRequests: compared('failedHttpRequests'),
    requestLatency: compared('requestLatency'),
    counts: {
      sessionsWithErrors: 50,
      loadTimeSamples: 1000,
      httpRequests: 500,
      failedHttpRequests: 5,
    },
  };
};

const PERIOD = { start: 2000, end: 3000 };
const PREVIOUS_PERIOD = { start: 1000, end: 2000 };

const build = (values: KpiValues = {}, current = overview(), previous = overview()) =>
  buildScorecard({
    kpis: kpis(values),
    current,
    previous,
    environments: [],
    period: PERIOD,
    previousPeriod: PREVIOUS_PERIOD,
    generatedAt: 4000,
  });

const measure = (report: ReturnType<typeof build>, id: string): ScorecardMeasure => {
  const found = report.sections.flatMap((section) => section.measures).find((m) => m.id === id);
  if (!found) {
    throw new Error(`No measure ${id}`);
  }
  return found;
};

describe('buildScorecard', () => {
  it('compares each measure with the previous period', () => {
    expect(measure(build({ loadTime: [1500, 2000] }), 'loadTime')).toMatchObject({
      value: 1500,
      previous: 2000,
      change: -0.25,
      direction: 'better',
    });
  });

  it('calls a rise in a lower-is-better measure worse, and in a higher-is-better one better', () => {
    const report = build({ jsErrors: [30, 10], errorFreeSessions: [0.95, 0.9] });

    expect(measure(report, 'jsErrors')).toMatchObject({ change: 2, direction: 'worse' });
    expect(measure(report, 'errorFreeSessions').direction).toBe('better');
  });

  it('treats traffic changes as neutral', () => {
    expect(measure(build({ pageLoads: [2000, 1000] }), 'pageLoads')).toMatchObject({
      change: 1,
      direction: 'neutral',
    });
  });

  it('shows changes under one percent as unchanged', () => {
    expect(measure(build({ pageLoads: [1005, 1000] }), 'pageLoads').direction).toBe('unchanged');
  });

  it('has no relative change from zero, but a rise from zero is worse', () => {
    expect(measure(build({ jsErrors: [4, 0] }), 'jsErrors')).toMatchObject({
      change: null,
      direction: 'worse',
    });
  });

  it('is unknown without a value in either period', () => {
    expect(measure(build({ loadTime: [null, 2000] }), 'loadTime')).toMatchObject({
      value: null,
      change: null,
      direction: 'unknown',
    });
  });

  it('counts errors per 100 page loads, and none without page loads', () => {
    const report = build({ pageLoads: [400, 0], jsErrors: [10, 0] });

    expect(measure(report, 'jsErrorsPer100')).toMatchObject({ value: 2.5, previous: null });
  });

  it('rates each web vital against the thresholds and keeps its rating shares', () => {
    const ratings = { good: 0.7, needsImprovement: 0.2, poor: 0.1 };
    const report = build(
      {},
      overview({
        webVitals: {
          ...NO_WEB_VITALS,
          lcp: { p75Ms: 4500, sampleCount: 100, ratings },
          cls: { p75: 0.05, sampleCount: 100, ratings: null },
        },
      })
    );

    expect(measure(report, 'lcp')).toMatchObject({ rating: 'poor', ratings });
    expect(measure(report, 'cls')).toMatchObject({ rating: 'good', ratings: null });
    expect(measure(report, 'inp')).toMatchObject({ value: null, rating: null });
  });

  it('keeps the environment only when one is set', () => {
    expect(build()).not.toHaveProperty('environment');
    expect(
      buildScorecard({
        kpis: kpis(),
        current: overview(),
        previous: overview(),
        environment: 'production',
        environments: ['production'],
        period: PERIOD,
        previousPeriod: PREVIOUS_PERIOD,
        generatedAt: 4000,
      }).environment
    ).toBe('production');
  });
});
