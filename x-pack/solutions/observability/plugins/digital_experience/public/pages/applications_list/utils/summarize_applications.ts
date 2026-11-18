/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLICATION_SOURCE } from '../../../../common/application_source';
import { CORE_WEB_VITAL, getVitalRating } from '../../../../common/core_web_vitals';
import type {
  ApplicationSource,
  ApplicationSummary,
  PageLoadsOverTime,
  TimeSeriesPoint,
} from '../../../../common/types/applications';

export interface ApplicationsSummary {
  applications: number;
  /**
   * Sessions that started in the time range, of the EDOT Browser applications. `null` when they
   * were not counted: the raw events don't, nor does Classic RUM.
   */
  sessions: number | null;
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
 * The sessions of the rows that count them. Only EDOT Browser rows read from the sessions index do,
 * and all of them do or none, as they come from one source, so Classic RUM rows have none to add.
 */
const countSessions = (applications: ApplicationSummary[]): number | null => {
  const counts = applications.flatMap(({ sessions }) => (sessions ? [sessions.count] : []));
  return counts.length > 0 ? counts.reduce((total, count) => total + count, 0) : null;
};

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
    sessions: countSessions(applications),
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

/**
 * The sessions over time of the selected source, `null` when they are not counted. Only EDOT Browser
 * has sessions, so Classic RUM has none, and so has a list read from the raw events.
 */
export const sessionsOfSource = (
  sessionsOverTime: TimeSeriesPoint[] | null,
  source: ApplicationSource | undefined
): TimeSeriesPoint[] | null => (source === APPLICATION_SOURCE.classic ? null : sessionsOverTime);

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
