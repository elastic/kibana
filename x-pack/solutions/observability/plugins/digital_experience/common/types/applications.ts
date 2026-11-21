/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The data model of an application: `otel` is EDOT data (Browser, Android and iOS), `classic` is
 * the RUM agent's.
 */
export type ApplicationSource = 'otel' | 'classic';

/** The mobile platforms, from the resource `os.name` of the EDOT Android and iOS data. */
export const MOBILE_PLATFORMS = ['android', 'ios'] as const;

export type MobilePlatform = (typeof MOBILE_PLATFORMS)[number];

/** What an application is: a web one (EDOT Browser or Classic RUM) or a mobile one. */
export const APPLICATION_TYPES = ['web', 'mobile'] as const;

export type ApplicationType = (typeof APPLICATION_TYPES)[number];

/**
 * The tabs of an application's page, in display order. The Overview is the page at the
 * application's own path; the others are below it, named after the tab.
 */
export const APPLICATION_TAB_IDS = [
  'overview',
  'sessions',
  'errors',
  'network',
  'reports',
] as const;

export type ApplicationTabId = (typeof APPLICATION_TAB_IDS)[number];

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

/** One web application of one source, over the requested time range and environment. */
export interface WebApplicationSummary {
  serviceName: string;
  source: ApplicationSource;
  applicationType: 'web';
  /** Environments the application reported in the time range, up to 10; empty when none is set. */
  environments: string[];
  pageLoads: { count: number };
  /**
   * Sessions that started in the time range, as `ApplicationsResponse.sessionsOverTime` counts
   * them, `null` when the source doesn't count them. Only the sessions index does: the raw events
   * and Classic RUM don't.
   */
  sessions: { count: number } | null;
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

/** A value of the current period against the previous period of equal length. */
export interface ComparedValue {
  /** `null` when there is not enough data. */
  value: number | null;
  previous: number | null;
  /** `value - previous`, `null` when either is missing. */
  delta: number | null;
}

/**
 * One mobile application (EDOT Android or iOS, React Native on top), keyed on `service.name`, so a
 * React Native app is one application on both platforms.
 */
export interface MobileApplicationSummary {
  serviceName: string;
  /** EDOT data, as mobile applications are OpenTelemetry only. */
  source: 'otel';
  applicationType: 'mobile';
  /** The platforms it reported on in the time range, sorted. */
  platforms: MobilePlatform[];
  environments: string[];
  /**
   * The newest `service.version` in the last 24 hours, compared as versions (2.10.0 after 2.9.0),
   * any platform; `null` if none.
   */
  latestRelease: string | null;
  sessions: { count: number };
  /** Distinct `app.installation.id`. */
  users: { count: number };
  /** Share of sessions without a crash, 0 to 1; `null` until a crash is defined (#64). */
  crashFreeSessions: ComparedValue;
  /** Exceptions per session, `null` without sessions. */
  errorRate: number | null;
  lastSeen: string | null;
}

export type ApplicationSummary = WebApplicationSummary | MobileApplicationSummary;

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
   * The EDOT Browser sessions that started in each bucket of the time range in the selected
   * environment, in the same buckets as `pageLoadsOverTime`. `null` when the sessions index did not
   * answer, as the raw events and Classic RUM don't count sessions.
   */
  sessionsOverTime: TimeSeriesPoint[] | null;
  /** Sources whose search failed while others loaded, so their rows are missing; empty when none. */
  unavailableSources: ApplicationSource[];
  /**
   * Sources that loaded but whose indices the user can't all read, so rows may be missing; empty
   * when none. A source in `unavailableSources` is never listed here.
   */
  partiallyAvailableSources: ApplicationSource[];
  /**
   * Whether the mobile applications loaded: `unavailable` when their search failed while others
   * loaded, `partial` when the user can't read every OTel index, else `complete`. Apart from the
   * sources, as mobile applications are EDOT (`otel`) data on a mobile platform.
   */
  mobileAvailability: MobileAvailability;
}

export type MobileAvailability = 'complete' | 'partial' | 'unavailable';

/** The documents in one bucket of a histogram over the time range. */
export interface TimeSeriesPoint {
  /** Start of the bucket, in epoch milliseconds. */
  timestamp: number;
  count: number;
}

/** The width of a histogram bucket: seconds, or a calendar day, week, month or year. */
export interface HistogramInterval {
  value: number;
  unit: 's' | 'd' | 'w' | 'M' | 'y';
}

/** The buckets of a histogram response: their width and the time range they cover. */
export interface HistogramBuckets {
  /** The width of every bucket. */
  interval: HistogramInterval;
  /** The queried time range in epoch milliseconds, which the edge buckets may cover only part of. */
  start: number;
  end: number;
}

/** Both sources use the same buckets; a source that isn't queried has none. */
export interface PageLoadsOverTime {
  otel: TimeSeriesPoint[];
  classic: TimeSeriesPoint[];
  histogram: HistogramBuckets;
}
