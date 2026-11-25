/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewFilterOptions, OverviewPercentile } from '../overview_filters';
import type { ComparedValue, HistogramBuckets, WebVitals } from './applications';

/** One bucket of the Overview trend; both charts read the same buckets. */
export interface OverviewTrendPoint {
  /** Start of the bucket, in epoch milliseconds. */
  timestamp: number;
  pageLoads: number;
  /** The requested percentile of the load time in milliseconds, `null` without a timed page load. */
  loadTimePercentileMs: number | null;
}

/** A percentile over the page loads of the time range. */
export interface LoadTime {
  /** The requested percentile in milliseconds, `null` without a timed page load. */
  percentileMs: number | null;
}

/**
 * One EDOT Browser application's vitals and trend over the requested time range and environment.
 * The KPI row has a route of its own (`ApplicationOverviewKpisResponse`).
 */
export interface ApplicationOverview {
  serviceName: string;
  /** The percentile of the load time and its trend, 75 unless the request asked for another. */
  percentile: OverviewPercentile;
  pageLoads: { count: number };
  loadTime: LoadTime;
  webVitals: WebVitals;
  /** The same buckets over the whole time range; empty ones included. */
  trend: OverviewTrendPoint[];
  /** The buckets of the trend. */
  trendHistogram: HistogramBuckets;
}

export interface ApplicationOverviewResponse {
  overview: ApplicationOverview;
  /**
   * The environments this application reported in the time range, whatever the `environment`
   * filter, for the picker. Each environment field (`service.environment` and
   * `deployment.environment.name`) keeps its 100 most used, so up to 200 in total. Names longer than
   * the route accepts are left out.
   */
  environments: string[];
  /**
   * The values of each filter with their page loads in the time range and environment, narrowed
   * by the other selected filters; each filter lists its ten most used.
   */
  filters: OverviewFilterOptions;
}

/**
 * The Overview's KPI row: each value over the time range against the period of equal length
 * before it. A value is `null` without the data to compute it.
 */
export interface ApplicationOverviewKpisResponse {
  /** The percentile of the load time, 75 unless the request asked for another. */
  percentile: OverviewPercentile;
  /** Sessions with any event in the period. */
  sessions: ComparedValue;
  /** The share of the sessions without a JS error or a failed HTTP request, from 0 to 1. */
  errorFreeSessions: ComparedValue;
  pageLoads: ComparedValue;
  /** The load time at `percentile`, in milliseconds. */
  loadTime: ComparedValue;
  jsErrors: ComparedValue;
  /** The share of the HTTP requests with a known outcome that failed, from 0 to 1. */
  failedHttpRequests: ComparedValue;
  /** The average duration of the HTTP requests, in milliseconds. */
  requestLatency: ComparedValue;
  /** The current period's counts that the tooltips name. */
  counts: {
    sessionsWithErrors: number;
    loadTimeSamples: number;
    httpRequests: number;
    failedHttpRequests: number;
  };
}
