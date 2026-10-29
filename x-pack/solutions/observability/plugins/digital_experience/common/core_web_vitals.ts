/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DurationVital, WebVitals } from './types/applications';

export type CoreWebVital = 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb';

export const CORE_WEB_VITAL = {
  lcp: 'lcp',
  inp: 'inp',
  cls: 'cls',
  fcp: 'fcp',
  ttfb: 'ttfb',
} as const satisfies Record<CoreWebVital, CoreWebVital>;

export const CORE_WEB_VITALS: readonly CoreWebVital[] = Object.values(CORE_WEB_VITAL);

export type VitalRating = 'good' | 'needsImprovement' | 'poor';

export interface VitalThresholds {
  /** Values up to this are good. */
  good: number;
  /** Values up to this need improvement, above are poor. */
  needsImprovement: number;
}

/**
 * Google's thresholds (https://web.dev/articles/vitals, https://web.dev/articles/fcp,
 * https://web.dev/articles/ttfb): LCP, INP, FCP and TTFB in milliseconds, CLS unitless.
 */
export const CORE_WEB_VITAL_THRESHOLDS: Record<CoreWebVital, VitalThresholds> = {
  lcp: { good: 2500, needsImprovement: 4000 },
  inp: { good: 200, needsImprovement: 500 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fcp: { good: 1800, needsImprovement: 3000 },
  ttfb: { good: 800, needsImprovement: 1800 },
};

/**
 * Compares with the thresholds as `float` fields store them: EDOT Browser's
 * `browser.web_vital.value` is a float, so a CLS of 0.1 is read back as 0.10000000149011612 and must
 * still be good. Integer thresholds are unchanged, and Classic RUM's scaled floats (steps of
 * 0.000001) have no value between 0.1 and its float.
 */
export const getVitalRating = (vital: CoreWebVital, value: number): VitalRating => {
  const { good, needsImprovement } = CORE_WEB_VITAL_THRESHOLDS[vital];
  if (value <= Math.fround(good)) {
    return 'good';
  }
  return value <= Math.fround(needsImprovement) ? 'needsImprovement' : 'poor';
};

const NO_DURATION_VITAL: DurationVital = { p75Ms: null, sampleCount: 0, ratings: null };

/** The web vitals without any sample, e.g. when the index does not exist. */
export const NO_WEB_VITALS: WebVitals = {
  lcp: NO_DURATION_VITAL,
  inp: NO_DURATION_VITAL,
  cls: { p75: null, sampleCount: 0, ratings: null },
  fcp: NO_DURATION_VITAL,
  ttfb: NO_DURATION_VITAL,
};
