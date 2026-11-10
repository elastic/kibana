/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORE_WEB_VITAL, getVitalRating } from '../../../../common/core_web_vitals';
import type {
  ApplicationSource,
  ApplicationSummary,
  PageLoadsOverTime,
  TimeSeriesPoint,
} from '../../../../common/types/applications';

export interface ApplicationsSummary {
  applications: number;
  pageLoads: number;
  /** JS errors per page load over all the applications, `null` without page loads. */
  errorsPerPageLoad: number | null;
  /** Failed share of all the HTTP requests, `null` without requests. */
  failedHttpRatio: number | null;
  /** Applications with a poor LCP, INP or CLS in any source. */
  poorCoreWebVitals: number;
}

const ratio = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;

const hasPoorCoreWebVitals = ({ webVitals: { lcp, inp, cls } }: ApplicationSummary): boolean =>
  (lcp.p75Ms !== null && getVitalRating(CORE_WEB_VITAL.lcp, lcp.p75Ms) === 'poor') ||
  (inp.p75Ms !== null && getVitalRating(CORE_WEB_VITAL.inp, inp.p75Ms) === 'poor') ||
  (cls.p75 !== null && getVitalRating(CORE_WEB_VITAL.cls, cls.p75) === 'poor');

const countNames = (applications: ApplicationSummary[]): number =>
  new Set(applications.map(({ serviceName }) => serviceName)).size;

/**
 * The totals of every source's rows, for the summary above the table; a name with data in both
 * sources counts as one application.
 */
export const summarizeApplications = (applications: ApplicationSummary[]): ApplicationsSummary => {
  const total = (count: (application: ApplicationSummary) => number) =>
    applications.reduce((sum, application) => sum + count(application), 0);

  const pageLoads = total(({ pageLoads: { count } }) => count);
  return {
    applications: countNames(applications),
    pageLoads,
    errorsPerPageLoad: ratio(
      total(({ jsErrors: { count } }) => count),
      pageLoads
    ),
    failedHttpRatio: ratio(
      total(({ httpRequests: { failedCount } }) => failedCount),
      total(({ httpRequests: { count } }) => count)
    ),
    poorCoreWebVitals: countNames(applications.filter(hasPoorCoreWebVitals)),
  };
};

/** Page loads over time of one source, or of both added up when no source is selected. */
export const pageLoadsOfSources = (
  pageLoadsOverTime: PageLoadsOverTime,
  source: ApplicationSource | undefined
): TimeSeriesPoint[] => {
  if (source) {
    return pageLoadsOverTime[source];
  }
  // Both sources use the same buckets, so they add up by timestamp.
  const counts = new Map<number, number>();
  [...pageLoadsOverTime.otel, ...pageLoadsOverTime.classic].forEach(({ timestamp, count }) =>
    counts.set(timestamp, (counts.get(timestamp) ?? 0) + count)
  );
  return [...counts]
    .map(([timestamp, count]) => ({ timestamp, count }))
    .sort((a, b) => a.timestamp - b.timestamp);
};
