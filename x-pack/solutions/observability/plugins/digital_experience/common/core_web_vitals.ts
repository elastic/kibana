/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CoreWebVital = 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb';

export const CORE_WEB_VITAL = {
  lcp: 'lcp',
  inp: 'inp',
  cls: 'cls',
  fcp: 'fcp',
  ttfb: 'ttfb',
} as const satisfies Record<CoreWebVital, CoreWebVital>;

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

export const getVitalRating = (vital: CoreWebVital, value: number): VitalRating => {
  const { good, needsImprovement } = CORE_WEB_VITAL_THRESHOLDS[vital];
  if (value <= good) {
    return 'good';
  }
  return value <= needsImprovement ? 'needsImprovement' : 'poor';
};
