/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_WEB_VITALS } from '../../../common/core_web_vitals';
import { toComparedValue } from '../../../common/mobile/kpis';
import type { WebVitals } from '../../../common/types/applications';
import type { ApplicationOverviewKpisResponse } from '../../../common/types/overview';
import type { ScorecardMeasure } from '../../../common/types/scorecard';
import {
  assessCoreWebVitals,
  buildScorecard,
  NO_BASELINE_KPIS,
  type BaselineKpis,
} from './scorecard';

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
const BASELINE_PERIOD = { start: -2000, end: 2000 };

const build = (
  values: KpiValues = {},
  webVitals: WebVitals = NO_WEB_VITALS,
  previousWebVitals: WebVitals = NO_WEB_VITALS,
  baselineKpis: BaselineKpis = NO_BASELINE_KPIS,
  baselineWebVitals: WebVitals = NO_WEB_VITALS
) =>
  buildScorecard({
    kpis: kpis(values),
    serviceName: 'shop',
    webVitals,
    previousWebVitals,
    baseline: { kpis: baselineKpis, webVitals: baselineWebVitals },
    environments: [],
    period: PERIOD,
    previousPeriod: PREVIOUS_PERIOD,
    baselinePeriod: BASELINE_PERIOD,
    generatedAt: 4000,
  });

/** Web vitals with these 75th percentiles and samples, and none for the others. */
const vitals = (p75s: Partial<Record<'lcp' | 'inp' | 'cls', number>>): WebVitals => ({
  ...NO_WEB_VITALS,
  ...(p75s.lcp === undefined ? {} : { lcp: { p75Ms: p75s.lcp, sampleCount: 10, ratings: null } }),
  ...(p75s.inp === undefined ? {} : { inp: { p75Ms: p75s.inp, sampleCount: 10, ratings: null } }),
  ...(p75s.cls === undefined ? {} : { cls: { p75: p75s.cls, sampleCount: 10, ratings: null } }),
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

  it('shows changes under the Overview cutoff of two percent as unchanged', () => {
    expect(measure(build({ pageLoads: [1015, 1000] }), 'pageLoads').direction).toBe('unchanged');
    expect(measure(build({ pageLoads: [1025, 1000] }), 'pageLoads').direction).toBe('neutral');
  });

  it('compares shares in percentage points, like the Overview', () => {
    const report = build({
      errorFreeSessions: [0.98, 0.99],
      failedHttpRequests: [0.003, 0.001],
    });

    expect(measure(report, 'errorFreeSessions')).toMatchObject({
      changeUnit: 'percentagePoints',
      direction: 'worse',
    });
    expect(measure(report, 'errorFreeSessions').change).toBeCloseTo(-0.01);
    // Two tenths of a point: noise, though three times the previous share.
    expect(measure(report, 'failedRequests').direction).toBe('unchanged');
    expect(measure(report, 'failedRequests').change).toBeCloseTo(0.002);
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
      {
        ...NO_WEB_VITALS,
        lcp: { p75Ms: 4500, sampleCount: 100, ratings },
        cls: { p75: 0.05, sampleCount: 100, ratings: null },
      }
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
        serviceName: 'shop',
        webVitals: NO_WEB_VITALS,
        previousWebVitals: NO_WEB_VITALS,
        baseline: { kpis: NO_BASELINE_KPIS, webVitals: NO_WEB_VITALS },
        environment: 'production',
        environments: ['production'],
        period: PERIOD,
        previousPeriod: PREVIOUS_PERIOD,
        baselinePeriod: BASELINE_PERIOD,
        generatedAt: 4000,
      }).environment
    ).toBe('production');
  });

  it('compares each measure with its baseline, in the unit of its change', () => {
    const report = build(
      { loadTime: [1500, 2000], errorFreeSessions: [0.95, 0.9] },
      NO_WEB_VITALS,
      NO_WEB_VITALS,
      {
        ...NO_BASELINE_KPIS,
        loadTime: 1200,
        errorFreeSessions: 0.97,
        jsErrorsPer100: 1,
      }
    );

    expect(measure(report, 'loadTime')).toMatchObject({ baseline: 1200, baselineChange: 0.25 });
    expect(measure(report, 'errorFreeSessions').baseline).toBe(0.97);
    expect(measure(report, 'errorFreeSessions').baselineChange).toBeCloseTo(-0.02);
    expect(measure(report, 'jsErrorsPer100').baseline).toBe(1);
  });

  it('has no baseline without data then', () => {
    expect(measure(build(), 'loadTime')).toMatchObject({ baseline: null, baselineChange: null });
  });

  it('names the samples behind each value, and none for a count', () => {
    const report = build(
      {},
      { ...NO_WEB_VITALS, lcp: { p75Ms: 2000, sampleCount: 42, ratings: null } }
    );

    expect(measure(report, 'sessions').sampleCount).toBeNull();
    expect(measure(report, 'loadTime').sampleCount).toBe(1000);
    expect(measure(report, 'errorFreeSessions').sampleCount).toBe(500);
    expect(measure(report, 'jsErrorsPer100').sampleCount).toBe(1000);
    expect(measure(report, 'failedRequests').sampleCount).toBe(500);
    expect(measure(report, 'lcp').sampleCount).toBe(42);
  });

  it("assesses this period's and the previous period's Core Web Vitals", () => {
    const report = build(
      {},
      vitals({ lcp: 2000, inp: 150, cls: 0.05 }),
      vitals({ lcp: 3000, cls: 0.05 })
    );

    expect(report.coreWebVitals).toEqual({
      current: { status: 'passed', failing: [] },
      previous: { status: 'failed', failing: ['lcp'] },
    });
  });
});

describe('assessCoreWebVitals', () => {
  it('passes when LCP, INP and CLS are all good', () => {
    expect(assessCoreWebVitals(vitals({ lcp: 2500, inp: 200, cls: 0.1 }))).toEqual({
      status: 'passed',
      failing: [],
    });
  });

  it('lists every vital that is not good', () => {
    expect(assessCoreWebVitals(vitals({ lcp: 2600, inp: 500, cls: 0.1 }))).toEqual({
      status: 'failed',
      failing: ['lcp', 'inp'],
    });
  });

  it('assesses LCP and CLS alone without INP samples', () => {
    expect(assessCoreWebVitals(vitals({ lcp: 2000, cls: 0.05 })).status).toBe('passed');
  });

  it('does not assess without LCP or CLS samples', () => {
    expect(assessCoreWebVitals(vitals({ lcp: 2000, inp: 100 }))).toEqual({
      status: 'notAssessed',
      failing: [],
    });
  });
});
