/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTEL_LOGS_INDEX, OTEL_TRACES_INDEX } from './otel_data';

/** Bump when the transform pivot, dest pipeline, or dest mappings change. */
export const SESSIONS_VERSION = 1;
export const SESSIONS_MANAGED_BY = 'digital_experience';

export const SESSIONS_SOURCE_INDICES = [OTEL_TRACES_INDEX, OTEL_LOGS_INDEX] as const;
export const SESSIONS_TRANSFORM_ID = `digital-experience-sessions-${SESSIONS_VERSION}`;
export const SESSIONS_TRANSFORM_PATTERN = 'digital-experience-sessions-*';
export const SESSIONS_INDEX = `digital-experience-sessions-${SESSIONS_VERSION}`;
export const SESSIONS_INDEX_PATTERN = 'digital-experience-sessions-*';
export const SESSIONS_INDEX_TEMPLATE_NAME = 'digital-experience-sessions';
export const SESSIONS_PIPELINE_NAME = `digital-experience-sessions-${SESSIONS_VERSION}`;

export const SESSIONS_DEFAULT_FREQUENCY = '1m';
export const SESSIONS_SYNC_DELAY = '60s';
/** Changed sessions handled per change-detection round and per composite page. */
export const SESSIONS_MAX_PAGE_SEARCH_SIZE = 5000;
export const SESSIONS_MAX_PARTITIONS = 32;
export const SESSIONS_LOOKBACK_DAYS = 30;
/** Max page views kept, in order, for the session journey. */
export const SESSIONS_JOURNEY_SIZE = 10;
/**
 * Page-view URLs collected per session to build the journey. Higher than the journey size, as
 * URLs that differ only in their query or hash collapse into one page.
 */
export const SESSIONS_JOURNEY_URL_CANDIDATES = 3 * SESSIONS_JOURNEY_SIZE;

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

export type SessionsTransformHealth = 'missing' | 'healthy' | 'lagging' | 'degraded' | 'outdated';

export interface SessionsSettings {
  frequency: string;
  partitions: number;
}

/** Whose credentials a transform runs with, as Elasticsearch recorded them on the last update. */
export interface SessionsTransformAuthorization {
  roles: string[] | null;
  apiKeyName: string | null;
  serviceAccount: string | null;
}

export interface SessionsTransformStatus {
  id: string;
  partition: number | null;
  version: number | null;
  frequency: string | null;
  state: string | null;
  health: SessionsTransformHealth;
  lagSeconds: number | null;
  reason: string | null;
  /** Username of whoever last enabled sessions, as Kibana recorded it. */
  enabledBy: string | null;
  enabledAt: string | null;
  authorization: SessionsTransformAuthorization | null;
}

export interface SessionsStatus {
  installed: boolean;
  /** Worst health across the installed transforms. */
  health: SessionsTransformHealth;
  state: string | null;
  installedVersion: number | null;
  currentVersion: number;
  /** True when a user with the manage sessions privilege must enable sessions again. */
  needsUpdate: boolean;
  reason: string | null;
  /** Largest freshness lag across partitions, in seconds. */
  lagSeconds: number | null;
  configured: SessionsSettings;
  installedPartitions: number;
  /** Who last enabled sessions, and the credentials the transforms run with since. */
  enabledBy: string | null;
  enabledAt: string | null;
  authorization: SessionsTransformAuthorization | null;
  transforms: SessionsTransformStatus[];
}

const TIME_VALUE = /^([1-9][0-9]*)(s|m|h)$/;
const SECONDS_PER_UNIT: Record<string, number> = { s: 1, m: 60, h: 3600 };

/** Seconds in an Elasticsearch time value such as `90s`, `5m` or `1h`, or null if invalid. */
export const timeValueSeconds = (value: string | null | undefined): number | null => {
  const match = value ? TIME_VALUE.exec(value) : null;
  return match ? Number(match[1]) * SECONDS_PER_UNIT[match[2]] : null;
};

/**
 * Lag after which the sessions transform counts as lagging: three missed checkpoints plus the
 * sync delay, and never less than five minutes.
 */
export const sessionsLagThresholdSeconds = (frequency: string | null | undefined): number =>
  Math.max(300, 3 * (timeValueSeconds(frequency) ?? 60) + 60);

/** Transform id of one partition. A single partition keeps the unsuffixed id. */
export const sessionsTransformId = (partition: number, partitions: number): string =>
  partitions === 1
    ? SESSIONS_TRANSFORM_ID
    : `${SESSIONS_TRANSFORM_ID}-p${partition}of${partitions}`;

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
