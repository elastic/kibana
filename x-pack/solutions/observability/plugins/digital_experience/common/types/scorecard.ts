/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreWebVital, VitalRating } from '../core_web_vitals';
import type { ChangeUnit } from '../negligible_change';
import type { VitalRatings } from './applications';

export type MeasureUnit = 'count' | 'ms' | 'score' | 'rate' | 'ratio';

/** `neutral` is a change that is neither better nor worse, such as traffic; `unknown` lacks a value. */
export type ScorecardVerdict = 'better' | 'worse' | 'unchanged' | 'neutral' | 'unknown';

export interface ScorecardMeasure {
  id: string;
  label: string;
  unit: MeasureUnit;
  value: number | null;
  previous: number | null;
  /**
   * The change to the previous period: relative, or for shares the difference of both (0.01 is one
   * percentage point), as `changeUnit` says. `null` without both values, or a relative change from
   * zero.
   */
  change: number | null;
  changeUnit: ChangeUnit;
  /** Better, worse or unchanged by the same cutoffs as the Overview's KPIs. */
  direction: ScorecardVerdict;
  /**
   * The measure over the four periods before this one, per period for a count: how it usually is,
   * so one unusual period doesn't read as a trend. `null` without data then.
   */
  baseline: number | null;
  /** The change from the baseline, in the unit of `change`. */
  baselineChange: number | null;
  /**
   * How many samples this period's value comes from, e.g. the timed page loads of the load time or
   * the HTTP requests of the failed share; `null` for a count, which is its own sample.
   */
  sampleCount: number | null;
  /** Google's rating of a web vital, `null` for the other measures or without a value. */
  rating: VitalRating | null;
  /** Share of samples per rating of a web vital. */
  ratings: VitalRatings | null;
}

export interface ScorecardSection {
  id: 'traffic' | 'webVitals';
  title: string;
  measures: ScorecardMeasure[];
}

export interface ScorecardPeriod {
  start: number;
  end: number;
}

/**
 * Google's Core Web Vitals assessment of a period: passed when LCP, CLS and, with samples, INP are
 * all good at the 75th percentile; not assessed without LCP or CLS samples.
 */
export interface CoreWebVitalsAssessment {
  status: 'passed' | 'failed' | 'notAssessed';
  /** The vitals that are not good, in LCP, INP, CLS order. */
  failing: CoreWebVital[];
}

export interface ScorecardReport {
  serviceName: string;
  environment?: string;
  /** The environments of the application, for a picker. */
  environments: string[];
  period: ScorecardPeriod;
  previousPeriod: ScorecardPeriod;
  /** The four periods before this one, that the measures' baselines cover. */
  baselinePeriod: ScorecardPeriod;
  coreWebVitals: {
    current: CoreWebVitalsAssessment;
    previous: CoreWebVitalsAssessment;
  };
  generatedAt: number;
  sections: ScorecardSection[];
}
