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

/** Dest/raw rows with no page, click, error, or replay — typically resource-timing heartbeats. */
export const isHeartbeatOnlySession = (session: {
  pageCount: number;
  actionCount: number;
  errorCount: number;
  hasReplay: boolean;
}): boolean =>
  session.pageCount === 0 &&
  session.actionCount === 0 &&
  session.errorCount === 0 &&
  !session.hasReplay;

/** Classic bounce: exactly one page view. Zero-page API slices are not bounces. */
export const isBouncedSession = (pageCount: number): boolean => pageCount === 1;

/** Bounced / viewed. Viewed is sessions with at least one page view. */
export const bounceRate = (bouncedSessions: number, viewedSessions: number): number | null =>
  viewedSessions > 0 ? bouncedSessions / viewedSessions : null;

export const sessionBounceCounts = (
  sessions: Array<{ pageCount: number }>
): { bounced: number; viewed: number } => {
  let bounced = 0;
  let viewed = 0;
  for (const { pageCount } of sessions) {
    if (pageCount < 1) {
      continue;
    }
    viewed += 1;
    if (pageCount === 1) {
      bounced += 1;
    }
  }
  return { bounced, viewed };
};

export interface SessionUser {
  id: string | null;
  email: string | null;
  name: string | null;
}

/** Map a session-index `user.key` onto the fields the table and detail page share. */
export const sessionUserFromKey = (key: string | null): SessionUser => {
  if (!key) {
    return { id: null, email: null, name: null };
  }
  if (key.includes('@')) {
    return { id: key, email: key, name: null };
  }
  return { id: key, email: null, name: key };
};

export interface SessionClient {
  browser: string | null;
  os: string | null;
  device: string | null;
  mobile: boolean | null;
  country: string | null;
  /** ISO-3166 alpha-2 (`client.geo.country_iso_code`) for map / location filters. */
  countryIso: string | null;
  breakpoint: string | null;
  connection: string | null;
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
  deadClickCount: number;
  /** Exception group keys seen in the sampled hits. */
  errorGroups: string[];
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
  /** Country ISO codes with session counts. */
  countries: SessionFacetBucket[];
  /** Identified users (name, email, or id) with session counts. */
  users: SessionFacetBucket[];
  hasReplay: number;
  hasErrors: number;
  hasRage: number;
  hasBounced: number;
}

/** Aggregate KPIs for the current (filtered) result set. */
export interface SessionListStats {
  total: number;
  withReplay: number;
  withErrors: number;
  rageClicks: number;
  medianDurationMs: number;
  bounced: number;
  viewed: number;
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
  kind: 'click' | 'navigation' | 'error' | 'load' | 'http' | 'inp' | 'longtask';
  label: string;
  detail: string | null;
  traceId?: string | null;
  spanId?: string | null;
  errorGroup?: string | null;
  graphqlOperation?: string | null;
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
  /** Highest complete `rr-web.event` key in this response (or prior cursor). */
  lastCompleteEvent: number | null;
  /** ES hits in this page (chunks, not assembled events). */
  hitCount: number;
  /** True when this page filled `size` — more documents may exist. */
  truncated: boolean;
}

export interface LiveReplaySession {
  sessionId: string;
  lastSeen: string | null;
  eventCount: number;
  serviceName: string | null;
}

export interface LiveReplaySessionsResponse {
  sessions: LiveReplaySession[];
  lookbackSeconds: number;
}
