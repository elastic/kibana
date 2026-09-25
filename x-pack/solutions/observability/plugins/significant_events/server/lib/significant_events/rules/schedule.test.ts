/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CRITICAL_ANALYSIS_PROFILE,
  DEFAULT_ANALYSIS_PROFILE,
  analysisProfileForQuery,
  getAnalysisProfileConfig,
  getIdleGateLookback,
  getMetricSeriesRuleSchedule,
} from './schedule';
import { METRIC_SERIES_EVERY, METRIC_SERIES_LOOKBACK } from './metric_series_contract';

describe('Significant Events rule scheduling', () => {
  it.each([
    [85, CRITICAL_ANALYSIS_PROFILE],
    [80, CRITICAL_ANALYSIS_PROFILE],
    [60, DEFAULT_ANALYSIS_PROFILE],
    [undefined, DEFAULT_ANALYSIS_PROFILE],
  ])('maps severity %s to analysis profile %s', (severityScore, expectedProfile) => {
    expect(analysisProfileForQuery({ severity_score: severityScore })).toBe(expectedProfile);
  });

  it('uses one metric-series execution schedule for all MATCH rules', () => {
    expect(getMetricSeriesRuleSchedule()).toEqual({
      every: METRIC_SERIES_EVERY,
      lookback: METRIC_SERIES_LOOKBACK,
    });
    expect(METRIC_SERIES_EVERY).toBe('5m');
    expect(METRIC_SERIES_LOOKBACK).toBe('7m');
  });

  it('uses critical analysis profile defaults (overridable by workflow inputs)', () => {
    expect(getAnalysisProfileConfig({ severity_score: 80 })).toEqual({
      profile: CRITICAL_ANALYSIS_PROFILE,
      bucketInterval: '1m',
      lookback: 'now-40m',
      lookbackMinutes: 40,
    });
  });

  it('uses fixed default analysis profile (5m buckets / 125m lookback)', () => {
    expect(getAnalysisProfileConfig({ severity_score: 60 })).toEqual({
      profile: DEFAULT_ANALYSIS_PROFILE,
      bucketInterval: '5m',
      lookback: 'now-125m',
      lookbackMinutes: 125,
    });
  });

  it('widens the idle gate to the earliest write-time bound across profiles', () => {
    // Default profile is wider (125m + 7m write delay) than critical (40m + 7m),
    // plus the default profile's 5m bucket interval so the gate is never
    // narrower than the scan window it guards.
    expect(getIdleGateLookback('now-40m')).toBe('now-137m');
    // A critical lookback wider than default still wins.
    expect(getIdleGateLookback('now-200m')).toBe('now-212m');
  });
});
