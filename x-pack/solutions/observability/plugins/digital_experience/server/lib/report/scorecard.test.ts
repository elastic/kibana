/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_WEB_VITALS } from '../../../common/core_web_vitals';
import type { ApplicationOverview } from '../../../common/types/overview';
import type { ScorecardMeasure } from '../../../common/types/scorecard';
import { buildScorecard } from './scorecard';

const overview = (overrides: Partial<ApplicationOverview> = {}): ApplicationOverview => ({
  serviceName: 'shop',
  percentile: 75,
  pageLoads: { count: 1000 },
  loadTime: { percentileMs: 2000, sampleCount: 1000 },
  jsErrors: { count: 10 },
  httpRequests: { count: 500, failedCount: 5, failedRatio: 0.01 },
  webVitals: NO_WEB_VITALS,
  trend: [],
  trendHistogram: { interval: { value: 1, unit: 's' }, start: 0, end: 1_000 },
  ...overrides,
});

const PERIOD = { start: 2000, end: 3000 };
const PREVIOUS_PERIOD = { start: 1000, end: 2000 };

const build = (current: ApplicationOverview, previous: ApplicationOverview) =>
  buildScorecard({
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
    const report = build(
      overview({ loadTime: { percentileMs: 1500, sampleCount: 1000 } }),
      overview({ loadTime: { percentileMs: 2000, sampleCount: 1000 } })
    );

    expect(measure(report, 'loadTime')).toMatchObject({
      value: 1500,
      previous: 2000,
      change: -0.25,
      direction: 'better',
    });
  });

  it('calls a rise in a lower-is-better measure worse', () => {
    const report = build(overview({ jsErrors: { count: 30 } }), overview());

    expect(measure(report, 'jsErrors')).toMatchObject({ change: 2, direction: 'worse' });
  });

  it('treats traffic changes as neutral', () => {
    const report = build(overview({ pageLoads: { count: 2000 } }), overview());

    expect(measure(report, 'pageLoads')).toMatchObject({ change: 1, direction: 'neutral' });
  });

  it('shows changes under one percent as unchanged', () => {
    const report = build(overview({ pageLoads: { count: 1005 } }), overview());

    expect(measure(report, 'pageLoads').direction).toBe('unchanged');
  });

  it('has no relative change from zero, but a rise from zero is worse', () => {
    const report = build(
      overview({ jsErrors: { count: 4 } }),
      overview({ jsErrors: { count: 0 } })
    );

    expect(measure(report, 'jsErrors')).toMatchObject({ change: null, direction: 'worse' });
  });

  it('is unknown without a value in either period', () => {
    const report = build(
      overview({ loadTime: { percentileMs: null, sampleCount: 0 } }),
      overview()
    );

    expect(measure(report, 'loadTime')).toMatchObject({
      value: null,
      change: null,
      direction: 'unknown',
    });
  });

  it('counts errors per 100 page loads, and none without page loads', () => {
    const report = build(
      overview({ pageLoads: { count: 400 }, jsErrors: { count: 10 } }),
      overview({ pageLoads: { count: 0 }, jsErrors: { count: 0 } })
    );

    expect(measure(report, 'jsErrorsPer100')).toMatchObject({ value: 2.5, previous: null });
  });

  it('rates each web vital against the thresholds and keeps its rating shares', () => {
    const ratings = { good: 0.7, needsImprovement: 0.2, poor: 0.1 };
    const report = build(
      overview({
        webVitals: {
          ...NO_WEB_VITALS,
          lcp: { p75Ms: 4500, sampleCount: 100, ratings },
          cls: { p75: 0.05, sampleCount: 100, ratings: null },
        },
      }),
      overview()
    );

    expect(measure(report, 'lcp')).toMatchObject({ rating: 'poor', ratings });
    expect(measure(report, 'cls')).toMatchObject({ rating: 'good', ratings: null });
    expect(measure(report, 'inp')).toMatchObject({ value: null, rating: null });
  });

  it('keeps the environment only when one is set', () => {
    expect(build(overview(), overview())).not.toHaveProperty('environment');
    expect(
      buildScorecard({
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
