/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreWebVital } from './core_web_vitals';
import { OTEL_LOGS_INDEX, OTEL_TRACES_INDEX } from './otel_data';

/**
 * Bump when the summary document or its mappings change: the summaries task then rebuilds every
 * session into a new index and deletes the older one.
 */
export const SESSIONS_VERSION = 1;
export const SESSIONS_MANAGED_BY = 'digital_experience';

export const SESSIONS_SOURCE_INDICES = [OTEL_TRACES_INDEX, OTEL_LOGS_INDEX] as const;
export const SESSIONS_INDEX = `digital-experience-sessions-${SESSIONS_VERSION}`;
export const SESSIONS_INDEX_PATTERN = 'digital-experience-sessions-*';
export const SESSIONS_INDEX_TEMPLATE_NAME = 'digital-experience-sessions';

export const SESSIONS_TASK_TYPE = 'digital_experience:sessions-summaries';
export const SESSIONS_TASK_ID = 'digital_experience:sessions-summaries';

/** How often the summaries task runs by default. */
export const SESSIONS_DEFAULT_FREQUENCY = '1m';
/** Summary queries the task runs at once by default, and at most. */
export const SESSIONS_DEFAULT_CONCURRENCY = 2;
export const SESSIONS_MAX_CONCURRENCY = 8;
/** Events this recent are left for the next run, as they may still be arriving. */
export const SESSIONS_SYNC_DELAY_SECONDS = 60;
/** Sessions are built from, and kept for, this many days of events. */
export const SESSIONS_LOOKBACK_DAYS = 30;
/**
 * The longest session: EDOT Browser ends one after 4 hours by default and 24 hours at most, so a
 * changed session is rebuilt from this far back.
 */
export const SESSIONS_MAX_SESSION_HOURS = 24;
/** Max page views kept, in order, for the session journey. */
export const SESSIONS_JOURNEY_SIZE = 10;
/**
 * Page-view URLs collected per session to build the journey. Higher than the journey size, as
 * URLs that differ only in their query or hash collapse into one page.
 */
export const SESSIONS_JOURNEY_URL_CANDIDATES = 3 * SESSIONS_JOURNEY_SIZE;

export const SESSION_SORT_FIELDS = [
  'start_time',
  'duration_ms',
  'page_view_count',
  'click_count',
  'js_error_count',
  'http_failed_request_count',
] as const;
export type SessionSortField = (typeof SESSION_SORT_FIELDS)[number];

// The sessions list API's limits, which the app also keeps its URL and inputs to.
export const SESSIONS_LIST_DEFAULT_PER_PAGE = 25;
export const SESSIONS_LIST_MAX_PER_PAGE = 100;
/** The last page, counted from 0. */
export const SESSIONS_LIST_MAX_PAGE = 1000;
/** A week; longer sessions only match a lower bound. */
export const SESSIONS_LIST_MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSIONS_LIST_MAX_SEARCH_LENGTH = 256;
/** The longest value of each facet filter. */
export const SESSIONS_LIST_MAX_FACET_LENGTHS = {
  browser: 256,
  os: 256,
  country: 16,
  entryPage: 1024,
} as const;

export type SessionWebVitals = Record<CoreWebVital, number | null>;

export type SessionsHealth = 'missing' | 'healthy' | 'lagging' | 'degraded';

export interface SessionsSettings {
  /** How often the summaries task runs, as a time value such as `1m`. */
  frequency: string;
}

export interface SessionsRunError {
  message: string;
  at: string;
}

export interface SessionsStatus {
  /** True once sessions are enabled: the summaries task is scheduled. */
  installed: boolean;
  health: SessionsHealth;
  /** Version of the summaries the task writes, and of this Kibana's. */
  installedVersion: number | null;
  currentVersion: number;
  /**
   * True until the task has caught up since sessions were enabled or their version changed: the
   * sessions index is being built, from up to `SESSIONS_LOOKBACK_DAYS` of data, oldest first.
   */
  rebuilding: boolean;
  /**
   * True when the task's API key was invalidated or expired: it can't run until a user with the
   * manage sessions privilege enables sessions again.
   */
  apiKeyInvalid: boolean;
  reason: string | null;
  /** How far the summaries are behind, in seconds: every event before `summarizedUntil` is in. */
  lagSeconds: number | null;
  summarizedUntil: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  /** The last run's failure, until a run succeeds. */
  lastError: SessionsRunError | null;
  /** Who last enabled sessions: the task runs with an API key granted on their behalf. */
  enabledBy: string | null;
  /** Sessions are kept for this many days, so older time ranges have none. */
  retentionDays: number;
}

const TIME_VALUE = /^([1-9][0-9]*)(s|m|h)$/;
const SECONDS_PER_UNIT: Record<string, number> = { s: 1, m: 60, h: 3600 };

/** Seconds in an Elasticsearch time value such as `90s`, `5m` or `1h`, or null if invalid. */
export const timeValueSeconds = (value: string | null | undefined): number | null => {
  const match = value ? TIME_VALUE.exec(value) : null;
  return match ? Number(match[1]) * SECONDS_PER_UNIT[match[2]] : null;
};

/**
 * Lag after which the summaries count as lagging: three missed runs plus the sync delay, and never
 * less than five minutes.
 */
export const sessionsLagThresholdSeconds = (frequency: string | null | undefined): number =>
  Math.max(300, 3 * (timeValueSeconds(frequency) ?? 60) + SESSIONS_SYNC_DELAY_SECONDS);

export interface SessionUserAgent {
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  device: string | null;
}

export interface SessionGeo {
  countryIso: string | null;
  region: string | null;
  city: string | null;
}

export interface SessionSummary {
  sessionId: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  eventCount: number;
  pageViewCount: number;
  /** Full page loads, as the applications list counts them; page views add in-app navigations. */
  pageLoadCount: number;
  clickCount: number;
  jsErrorCount: number;
  httpRequestCount: number;
  failedRequestCount: number;
  bounced: boolean;
  entryPage: string | null;
  exitPage: string | null;
  journey: string[];
  environment: string | null;
  user: string | null;
  userAgent: SessionUserAgent;
  geo: SessionGeo;
  webVitals: SessionWebVitals;
}

export interface FacetBucket {
  key: string;
  count: number;
}

export interface SessionListFacets {
  browsers: FacetBucket[];
  os: FacetBucket[];
  countries: FacetBucket[];
  entryPages: FacetBucket[];
}

export interface SessionListKpis {
  totalSessions: number;
  medianDurationMs: number | null;
  avgPageViews: number | null;
  bounceRate: number | null;
  sessionsWithJsErrors: number;
  sessionsWithFailedRequests: number;
  webVitals: SessionWebVitals;
}

export interface SessionListResponse {
  sessions: SessionSummary[];
  total: number;
  page: number;
  perPage: number;
  /** Sessions are kept for this many days, so older time ranges have none. */
  retentionDays: number;
  facets: SessionListFacets;
  kpis: SessionListKpis;
}

export type SessionTimelineEventKind =
  | 'page_view'
  | 'click'
  | 'error'
  | 'web_vital'
  | 'span'
  | 'log';

export interface SessionTimelineEvent {
  kind: SessionTimelineEventKind;
  name: string;
  timestamp: string;
  offsetMs: number;
  durationMs: number | null;
  page: string | null;
  detail: string | null;
  traceId: string | null;
  spanId: string | null;
}

export interface SessionPageVisit {
  page: string;
  url: string | null;
  startTime: string;
  endTime: string;
  durationMs: number;
  clickCount: number;
  errorCount: number;
  webVitals: SessionWebVitals;
}

export interface SessionDetailResponse {
  session: SessionSummary;
  timeline: SessionTimelineEvent[];
  timelineTruncated: boolean;
  pageVisits: SessionPageVisit[];
}

export const emptyWebVitals = (): SessionWebVitals => ({
  lcp: null,
  inp: null,
  cls: null,
  fcp: null,
  ttfb: null,
});

/**
 * Page label used for journeys: the hash route when present, else the URL path, without query
 * or fragment. The summaries and the detail both label a URL with it, checked against
 * `PAGE_PATH_CASES`.
 */
export const toPagePath = (raw: string | null | undefined): string | null => {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === 'null') {
    return null;
  }
  let path = trimmed;
  const hash = path.indexOf('#');
  if (hash >= 0) {
    const route = path.substring(hash + 1);
    if (route.startsWith('/')) {
      const routeQuery = route.indexOf('?');
      return routeQuery >= 0 ? route.substring(0, routeQuery) : route;
    }
    path = path.substring(0, hash);
  }
  const query = path.indexOf('?');
  if (query >= 0) {
    path = path.substring(0, query);
  }
  const scheme = path.indexOf('://');
  if (scheme >= 0) {
    const slash = path.indexOf('/', scheme + 3);
    path = slash >= 0 ? path.substring(slash) : '/';
  }
  return path === '' ? '/' : path;
};
