/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewFilterOptions, OverviewPercentile } from '../overview_filters';
import type { HttpRequests, WebVitals } from './applications';

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
  /** Page loads that reported a load event, which the percentile is taken over. */
  sampleCount: number;
}

/** One EDOT Browser application over the requested time range and environment. */
export interface ApplicationOverview {
  serviceName: string;
  /** The percentile of the load time and its trend, 75 unless the request asked for another. */
  percentile: OverviewPercentile;
  pageLoads: { count: number };
  loadTime: LoadTime;
  jsErrors: { count: number };
  httpRequests: HttpRequests;
  webVitals: WebVitals;
  /** The same buckets over the whole time range; empty ones included. */
  trend: OverviewTrendPoint[];
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
