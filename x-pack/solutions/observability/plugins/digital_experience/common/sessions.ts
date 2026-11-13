/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreWebVital } from './core_web_vitals';
import { OTEL_LOGS_INDEX, OTEL_TRACES_INDEX } from './otel_data';

/** Bump when the summary document or its mappings change. */
export const SESSIONS_VERSION = 1;
export const SESSIONS_MANAGED_BY = 'digital_experience';

export const SESSIONS_SOURCE_INDICES = [OTEL_TRACES_INDEX, OTEL_LOGS_INDEX] as const;
const SESSIONS_INDEX_PREFIX = 'digital-experience-sessions-';
/** Matches the session summaries of every platform; the documented index privileges name it. */
export const ALL_SESSIONS_INDEX_PATTERN = `${SESSIONS_INDEX_PREFIX}*`;
const BROWSER_SESSIONS_INDEX_PREFIX = `${SESSIONS_INDEX_PREFIX}browser-`;
/** The browser session summaries. */
export const SESSIONS_INDEX = `${BROWSER_SESSIONS_INDEX_PREFIX}${SESSIONS_VERSION}`;
/** The browser session summaries of every version: what the readers and the template cover. */
export const SESSIONS_INDEX_PATTERN = `${BROWSER_SESSIONS_INDEX_PREFIX}*`;
/** Kept from before the browser prefix, so enabling replaces that template's overlapping pattern. */
export const SESSIONS_INDEX_TEMPLATE_NAME = 'digital-experience-sessions';

export const SESSIONS_LOOKBACK_DAYS = 30;

export const SESSION_SORT_FIELDS = [
  'start_time',
  'duration_ms',
  'page_view_count',
  'click_count',
  'error_count',
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

export interface SessionsStatus {
  /** True once sessions are set up: the sessions index exists. */
  installed: boolean;
}

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
  clickCount: number;
  errorCount: number;
  bounced: boolean;
  entryPage: string | null;
  exitPage: string | null;
  journey: string[];
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
  sessionsWithErrors: number;
  webVitals: SessionWebVitals;
}

export interface SessionListResponse {
  sessions: SessionSummary[];
  total: number;
  page: number;
  perPage: number;
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
 * or fragment. Checked against `PAGE_PATH_CASES`.
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
