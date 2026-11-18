/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DurationVital, WebVitals } from './types/applications';

export {
  CORE_WEB_VITAL,
  CORE_WEB_VITALS,
  CORE_WEB_VITAL_THRESHOLDS,
  getVitalRating,
} from '@kbn/observability-plugin/common';
export type { CoreWebVital, VitalRating, VitalThresholds } from '@kbn/observability-plugin/common';

const NO_DURATION_VITAL: DurationVital = { p75Ms: null, sampleCount: 0, ratings: null };

/** The web vitals without any sample, e.g. when the index does not exist. */
export const NO_WEB_VITALS: WebVitals = {
  lcp: NO_DURATION_VITAL,
  inp: NO_DURATION_VITAL,
  cls: { p75: null, sampleCount: 0, ratings: null },
  fcp: NO_DURATION_VITAL,
  ttfb: NO_DURATION_VITAL,
};
