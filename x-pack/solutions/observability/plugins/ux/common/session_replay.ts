/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SESSION_REPLAY_INDEX = 'logs-rum.replay-*';

/** Traces + app logs that carry EDOT Browser session identifiers. */
export const RUM_SESSION_SOURCE_INDEX = 'traces-*.otel-*,logs-*.otel-*';

export const SESSION_ID_FIELDS = [
  'attributes.session.id',
  'attributes.rum.sessionId',
  'attributes.rum.session.id',
] as const;

export interface SessionUser {
  id: string | null;
  email: string | null;
  name: string | null;
}

export interface SessionClient {
  browser: string | null;
  os: string | null;
  device: string | null;
  mobile: boolean | null;
  country: string | null;
}

/** One activity slot for the per-row sparkline. */
export interface SessionActivityBucket {
  count: number;
  hasError: boolean;
}

export interface RumSessionSummary {
  sessionId: string;
  startTime: string | null;
  endTime: string | null;
  /** Span/log docs for this session (not rrweb events). */
  eventCount: number;
  errorCount: number;
  actionCount: number;
  rageClickCount: number;
  /** Milliseconds with activity (gaps > idle threshold excluded). */
  activeMs: number;
  /** Wall-clock duration (end - start) in ms. */
  durationMs: number;
  pageCount: number;
  /** First page path (or hash route) seen in the session. */
  entryPage: string | null;
  /** Last page path seen in the session. */
  exitPage: string | null;
  /** Ordered unique page paths for the visit (A → B → C). */
  pagePath: string[];
  /**
   * SPA / interaction trail when routes don't change (e.g. Add to cart → Checkout).
   * Derived from click target ids / xpaths.
   */
  activityPath: string[];
  /** Coarse activity histogram for a sparkline. */
  sparkline: SessionActivityBucket[];
  user: SessionUser;
  client: SessionClient;
  hasReplay: boolean;
  /** rrweb event docs when hasReplay is true. */
  replayEventCount: number;
}

/** @deprecated Use RumSessionSummary — kept for older call sites during the POC. */
export type SessionReplaySessionSummary = RumSessionSummary;

export type SessionSortField =
  | 'startTime'
  | 'durationMs'
  | 'errorCount'
  | 'actionCount'
  | 'pageCount'
  | 'rageClickCount';

export type SessionSortDirection = 'asc' | 'desc';

export interface SessionFacetBucket {
  key: string;
  count: number;
}

/** Available filter values + counts, computed over the search-filtered set. */
export interface SessionListFacets {
  browsers: SessionFacetBucket[];
  os: SessionFacetBucket[];
  hasReplay: number;
  hasErrors: number;
  hasRage: number;
}

/** Aggregate KPIs for the current (filtered) result set. */
export interface SessionListStats {
  total: number;
  withReplay: number;
  withErrors: number;
  rageClicks: number;
  medianDurationMs: number;
}

export interface SessionListResponse {
  sessions: RumSessionSummary[];
  /** Total sessions after search + filters (for pagination). */
  total: number;
  facets: SessionListFacets;
  stats: SessionListStats;
}

export interface SessionAction {
  /** ms offset from session start. */
  offsetMs: number;
  timestamp: string;
  kind: 'click' | 'navigation' | 'error' | 'load';
  label: string;
  detail: string | null;
}

export interface SessionWebVitals {
  lcp: number | null;
  fcp: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
}

export interface PageVisit {
  index: number;
  path: string;
  url: string | null;
  startTime: string;
  endTime: string;
  durationMs: number;
  actionCount: number;
  errorCount: number;
  actions: SessionAction[];
  webVitals: SessionWebVitals;
}

export interface RumSessionDetail {
  sessionId: string;
  startTime: string | null;
  endTime: string | null;
  durationMs: number;
  eventCount: number;
  errorCount: number;
  actionCount: number;
  rageClickCount: number;
  pageCount: number;
  user: SessionUser;
  client: SessionClient;
  webVitals: SessionWebVitals;
  hasReplay: boolean;
  replayEventCount: number;
  pageVisits: PageVisit[];
}

export interface SessionReplayEventsResponse {
  sessionId: string;
  events: unknown[];
  total: number;
}
