/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rumPerformanceScore } from './rum_performance_score';
import { resolveRumAppPlatform, type RumAppPlatform } from './rum_platform';

export type { RumAppPlatform };

export interface RumAppInventoryRow {
  name: string;
  platform: RumAppPlatform;
  sessions: number;
  pageViews: number;
  errorSessions: number;
  errorRate: number;
  p75Lcp: number | null;
  p75Inp: number | null;
  p75Cls: number | null;
  p75Fcp: number | null;
  p75Ttfb: number | null;
  score: number | null;
  scoreTrend: number[];
  environments: string[];
  scoreDelta: number | null;
  sessionsDelta: number | null;
  errorRateDelta: number | null;
  opportunity: number | null;
  trend: number[];
}

export type RumAppsQueryStage = 'index' | 'remainder';

export interface RumAppsResponse {
  apps: RumAppInventoryRow[];
  sessionTraffic: RumSessionTrafficPoint[];
  /** `sessions` = ux-rum-sessions dest; `raw` = OTel traces/logs. */
  source: 'sessions' | 'raw';
  /** Client should fetch `stage=remainder` for the open tail. */
  remainder: boolean;
}

export interface RumSessionTrafficPoint {
  timestamp: number;
  sessions: number;
}

export interface RumAppBucketInput {
  name: string;
  sessions: number;
  pageViews: number;
  errorSessions: number;
  p75Lcp: number | null;
  p75Inp?: number | null;
  p75Cls?: number | null;
  p75Fcp?: number | null;
  p75Ttfb?: number | null;
  trend?: number[];
  scoreTrend?: number[];
  environments?: string[];
  platformKeys: string[];
}

export interface RumAppsInventoryKpis {
  applications: number;
  sessions: number;
  pageViews: number;
  errorRate: number;
  poorScoreApps: number;
  firingAlertApps: number;
}

export const rumMetricDelta = (current: number | null, previous: number | null): number | null => {
  if (current == null || previous == null) {
    return null;
  }
  return current - previous;
};

/** Traffic-weighted room to 100 (Sentry-style opportunity). */
export const rumAppOpportunity = (
  sessions: number,
  score: number | null,
  fleetSessions: number
): number | null => {
  if (score == null || fleetSessions <= 0 || sessions <= 0) {
    return null;
  }
  return Math.round((sessions / fleetSessions) * (100 - score));
};

export const rumAppFromBucket = ({
  name,
  sessions,
  pageViews,
  errorSessions,
  p75Lcp,
  p75Inp = null,
  p75Cls = null,
  p75Fcp = null,
  p75Ttfb = null,
  trend = [],
  scoreTrend = [],
  environments = [],
  platformKeys,
}: RumAppBucketInput): RumAppInventoryRow => ({
  name,
  platform: resolveRumAppPlatform(platformKeys),
  sessions,
  pageViews,
  errorSessions,
  errorRate: sessions > 0 ? errorSessions / sessions : 0,
  p75Lcp,
  p75Inp,
  p75Cls,
  p75Fcp,
  p75Ttfb,
  score: rumPerformanceScore({
    lcp: p75Lcp,
    inp: p75Inp,
    cls: p75Cls,
    fcp: p75Fcp,
    ttfb: p75Ttfb,
    errorRate: sessions > 0 ? errorSessions / sessions : null,
  }),
  scoreTrend,
  environments,
  scoreDelta: null,
  sessionsDelta: null,
  errorRateDelta: null,
  opportunity: null,
  trend,
});

/** Attach previous-period deltas and fleet opportunity after rows are merged. */
export const enrichRumAppInventory = (
  current: RumAppInventoryRow[],
  previous: RumAppInventoryRow[]
): RumAppInventoryRow[] => {
  const prevByName = new Map(previous.map((app) => [app.name, app]));
  const fleetSessions = current.reduce((sum, app) => sum + app.sessions, 0);
  return current.map((app) => {
    const prev = prevByName.get(app.name);
    return {
      ...app,
      scoreDelta: rumMetricDelta(app.score, prev?.score ?? null),
      sessionsDelta: rumMetricDelta(app.sessions, prev?.sessions ?? null),
      errorRateDelta: rumMetricDelta(app.errorRate, prev?.errorRate ?? null),
      opportunity: rumAppOpportunity(app.sessions, app.score, fleetSessions),
    };
  });
};

/** Prefer OTel buckets when the same service name appears on both fields. */
export const mergeRumAppRows = (
  otelApps: RumAppInventoryRow[],
  classicApps: RumAppInventoryRow[]
): RumAppInventoryRow[] => {
  const otelNames = new Set(otelApps.map((app) => app.name));
  const merged = [...otelApps];
  for (const app of classicApps) {
    if (otelNames.has(app.name)) {
      continue;
    }
    merged.push(app);
  }
  return merged.sort((a, b) => {
    if (b.sessions !== a.sessions) {
      return b.sessions - a.sessions;
    }
    return a.name.localeCompare(b.name);
  });
};

export const rumAppsInventoryKpis = (
  apps: RumAppInventoryRow[],
  firingNames: ReadonlySet<string> = new Set()
): RumAppsInventoryKpis => {
  let sessions = 0;
  let pageViews = 0;
  let errorSessions = 0;
  let poorScoreApps = 0;
  let firingAlertApps = 0;
  for (const app of apps) {
    sessions += app.sessions;
    pageViews += app.pageViews;
    errorSessions += app.errorSessions;
    if (app.score != null && app.score < 50) {
      poorScoreApps += 1;
    }
    if (firingNames.has(app.name)) {
      firingAlertApps += 1;
    }
  }
  return {
    applications: apps.length,
    sessions,
    pageViews,
    errorRate: sessions > 0 ? errorSessions / sessions : 0,
    poorScoreApps,
    firingAlertApps,
  };
};

interface SessionTrafficBucket {
  key?: string | number;
  doc_count?: number;
  sessions?: { value?: number };
}

/** Unique sessions per auto_date_histogram bucket for the fleet chart. */
export const parseRumSessionTraffic = (agg: unknown): RumSessionTrafficPoint[] => {
  const buckets = (agg as { buckets?: SessionTrafficBucket[] } | undefined)?.buckets;
  if (!Array.isArray(buckets)) {
    return [];
  }
  const points: RumSessionTrafficPoint[] = [];
  for (const bucket of buckets) {
    const timestamp = typeof bucket.key === 'number' ? bucket.key : Number(bucket.key);
    if (!Number.isFinite(timestamp)) {
      continue;
    }
    const value = bucket.sessions?.value;
    const fromCard = typeof value === 'number' && Number.isFinite(value) ? value : null;
    const fromDocs =
      typeof bucket.doc_count === 'number' && Number.isFinite(bucket.doc_count)
        ? bucket.doc_count
        : 0;
    points.push({
      timestamp,
      sessions: fromCard ?? fromDocs,
    });
  }
  return points;
};

const pickVital = (indexed: number | null, live: number | null): number | null => indexed ?? live;

const mergeInventoryRow = (
  indexed: RumAppInventoryRow,
  live: RumAppInventoryRow
): RumAppInventoryRow => {
  const sessions = indexed.sessions + live.sessions;
  const pageViews = indexed.pageViews + live.pageViews;
  const errorSessions = indexed.errorSessions + live.errorSessions;
  const merged = rumAppFromBucket({
    name: indexed.name,
    sessions,
    pageViews,
    errorSessions,
    p75Lcp: pickVital(indexed.p75Lcp, live.p75Lcp),
    p75Inp: pickVital(indexed.p75Inp, live.p75Inp),
    p75Cls: pickVital(indexed.p75Cls, live.p75Cls),
    p75Fcp: pickVital(indexed.p75Fcp, live.p75Fcp),
    p75Ttfb: pickVital(indexed.p75Ttfb, live.p75Ttfb),
    trend: indexed.trend.length > 0 ? indexed.trend : live.trend,
    scoreTrend: indexed.scoreTrend.length > 0 ? indexed.scoreTrend : live.scoreTrend,
    environments: [...new Set([...indexed.environments, ...live.environments])],
    platformKeys: [indexed.platform],
  });
  return {
    ...merged,
    scoreDelta: indexed.scoreDelta,
    sessionsDelta:
      indexed.sessionsDelta != null ? indexed.sessionsDelta + live.sessions : live.sessionsDelta,
    errorRateDelta: indexed.errorRateDelta,
  };
};

export const mergeRumSessionTraffic = (
  left: RumSessionTrafficPoint[],
  right: RumSessionTrafficPoint[]
): RumSessionTrafficPoint[] => {
  const byTs = new Map<number, number>();
  for (const point of [...left, ...right]) {
    byTs.set(point.timestamp, (byTs.get(point.timestamp) ?? 0) + point.sessions);
  }
  return [...byTs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, sessions]) => ({ timestamp, sessions }));
};

/** Add open-tail rows onto a sessions-index inventory without replacing indexed vitals. */
export const mergeRumAppsResponses = (
  indexed: RumAppsResponse,
  live: RumAppsResponse
): RumAppsResponse => {
  const byName = new Map(indexed.apps.map((app) => [app.name, app]));
  for (const row of live.apps) {
    const current = byName.get(row.name);
    byName.set(row.name, current ? mergeInventoryRow(current, row) : row);
  }
  const apps = [...byName.values()].sort((a, b) => {
    if (b.sessions !== a.sessions) {
      return b.sessions - a.sessions;
    }
    return a.name.localeCompare(b.name);
  });
  const fleetSessions = apps.reduce((sum, app) => sum + app.sessions, 0);
  return {
    apps: apps.map((app) => ({
      ...app,
      opportunity: rumAppOpportunity(app.sessions, app.score, fleetSessions),
    })),
    sessionTraffic: mergeRumSessionTraffic(indexed.sessionTraffic, live.sessionTraffic),
    source: indexed.source,
    remainder: false,
  };
};
