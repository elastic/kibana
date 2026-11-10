/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UXMetrics } from '@kbn/observability-shared-plugin/public';
import type { VitalRatings, WebVitals } from '../../../../../common/types/applications';

/**
 * Rating shares as the percentages the Core Web Vitals component reads, in good,
 * needs-improvement and poor order; `undefined` without samples, so the vital shows as having no
 * data rather than as fully good.
 */
export const toRanks = (
  ratings: VitalRatings | null
): [good: number, needsImprovement: number, poor: number] | undefined => {
  if (!ratings) {
    return undefined;
  }
  const good = Math.round(ratings.good * 100);
  // Rounded from the cumulative share, so the three percentages always add up to 100; poor is the
  // remainder.
  const upToNeedsImprovement = Math.round((ratings.good + ratings.needsImprovement) * 100);
  return [good, upToNeedsImprovement - good, 100 - upToNeedsImprovement];
};

/**
 * The Core Web Vitals as Observability's component reads them: LCP and INP in milliseconds and CLS
 * unitless, the units the Overview already returns, with a missing percentile left as `null`.
 */
export const toUxMetrics = ({ lcp, inp, cls }: WebVitals): UXMetrics => ({
  lcp: lcp.p75Ms,
  lcpRanks: toRanks(lcp.ratings),
  inp: inp.p75Ms,
  inpRanks: toRanks(inp.ratings),
  cls: cls.p75,
  clsRanks: toRanks(cls.ratings),
});
