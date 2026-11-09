/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `otel` is EDOT Browser data, `classic` is data written by the RUM agent. */
export type ApplicationSource = 'otel' | 'classic';

/** Share of samples per rating, each between 0 and 1; the three add up to 1. */
export interface VitalRatings {
  good: number;
  needsImprovement: number;
  poor: number;
}

/** A web vital measured in milliseconds (LCP, INP, FCP, TTFB). */
export interface DurationVital {
  /** 75th percentile in milliseconds, `null` without samples. */
  p75Ms: number | null;
  sampleCount: number;
  /** `null` without samples. */
  ratings: VitalRatings | null;
}

/** A web vital measured as a unitless score (CLS). */
export interface ScoreVital {
  /** 75th percentile, `null` without samples. */
  p75: number | null;
  sampleCount: number;
  /** `null` without samples. */
  ratings: VitalRatings | null;
}

/** The Core Web Vitals of an application, CLS as a score and the others in milliseconds. */
export interface WebVitals {
  lcp: DurationVital;
  inp: DurationVital;
  cls: ScoreVital;
  fcp: DurationVital;
  ttfb: DurationVital;
}

/** The HTTP requests the browser made. */
export interface HttpRequests {
  /** Requests with a known outcome. */
  count: number;
  failedCount: number;
  /** `failedCount / count` between 0 and 1, `null` without requests. */
  failedRatio: number | null;
}

/** One application of one source, over the requested time range and environment. */
export interface ApplicationSummary {
  serviceName: string;
  source: ApplicationSource;
  /** Environments the application reported in the time range, up to 10; empty when none is set. */
  environments: string[];
  pageLoads: { count: number };
  webVitals: WebVitals;
  jsErrors: {
    count: number;
    /** Errors per page load, `null` without page loads. */
    perPageLoad: number | null;
  };
  httpRequests: HttpRequests;
  /** Time of the latest document in the range (ISO 8601), `null` when unknown. */
  lastSeen: string | null;
}

export interface ApplicationsResponse {
  applications: ApplicationSummary[];
  /**
   * The environments in the time range, whatever the `environment` filter, for the picker. Each
   * environment field keeps its 100 most used: Classic RUM has one, EDOT Browser two
   * (`service.environment` and `deployment.environment.name`), so up to 300 in total. Names longer than the route accepts are left out.
   */
  environments: string[];
  /** Page loads over the time range in the selected environment, per source. */
  pageLoadsOverTime: PageLoadsOverTime;
  /**
   * Sources whose search failed while others loaded, so their rows are missing; empty when none.
   * Indices the user can't read are left out of the search rather than failing it, so partial
   * index access is not reported here.
   */
  unavailableSources: ApplicationSource[];
}

/** The documents in one bucket of a histogram over the time range. */
export interface TimeSeriesPoint {
  /** Start of the bucket, in epoch milliseconds. */
  timestamp: number;
  count: number;
}

/** Both sources use the same buckets; a source that isn't queried has none. */
export interface PageLoadsOverTime {
  otel: TimeSeriesPoint[];
  classic: TimeSeriesPoint[];
}
