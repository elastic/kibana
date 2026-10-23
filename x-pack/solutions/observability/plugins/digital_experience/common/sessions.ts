/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Bump when the transform pivot, dest pipeline, or dest mappings change. */
export const SESSIONS_VERSION = 1;
export const SESSIONS_MANAGED_BY = 'digital_experience';

export const SESSIONS_SOURCE_INDICES = ['traces-*.otel-*', 'logs-*.otel-*'] as const;
export const SESSIONS_TRANSFORM_ID = `digital-experience-sessions-${SESSIONS_VERSION}`;
export const SESSIONS_INDEX = `digital-experience-sessions-${SESSIONS_VERSION}`;
export const SESSIONS_INDEX_PATTERN = 'digital-experience-sessions-*';
export const SESSIONS_INDEX_TEMPLATE_NAME = 'digital-experience-sessions';
export const SESSIONS_PIPELINE_NAME = `digital-experience-sessions-${SESSIONS_VERSION}`;

export const SESSIONS_FREQUENCY = '1m';
export const SESSIONS_SYNC_DELAY = '60s';
export const SESSIONS_LOOKBACK_DAYS = 30;
/** Max page views kept, in order, for the session journey. */
export const SESSIONS_JOURNEY_SIZE = 10;

/** EDOT Browser re-stamps `session.id` on every span and log after rotation. */
export const SOURCE_SESSION_ID_FIELD = 'attributes.session.id';
export const SOURCE_SERVICE_NAME_FIELD = 'resource.attributes.service.name';
export const SOURCE_URL_FIELD = 'attributes.url.full';

export const SESSION_SORT_FIELDS = [
  'start_time',
  'duration_ms',
  'page_view_count',
  'click_count',
  'error_count',
] as const;
export type SessionSortField = (typeof SESSION_SORT_FIELDS)[number];

export const WEB_VITAL_NAMES = ['lcp', 'inp', 'cls', 'fcp', 'ttfb'] as const;
export type WebVitalName = (typeof WEB_VITAL_NAMES)[number];
export type SessionWebVitals = Record<WebVitalName, number | null>;

export type SessionsTransformHealth = 'missing' | 'healthy' | 'degraded' | 'outdated';

export interface SessionsStatus {
  installed: boolean;
  health: SessionsTransformHealth;
  state: string | null;
  installedVersion: number | null;
  currentVersion: number;
  needsUpdate: boolean;
  reason: string | null;
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

/** Page label used for journeys: the hash route when present, else the URL path. */
export const toPagePath = (raw: string | null | undefined): string | null => {
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw, 'http://localhost');
    const route = url.hash.replace(/^#/, '').split('?')[0];
    return route.startsWith('/') ? route : url.pathname || '/';
  } catch {
    return raw.split(/[?#]/)[0] || null;
  }
};
