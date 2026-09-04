/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FUNNEL_SESSION_SAMPLE_SIZE, type SessionFunnelResponse } from './session_funnel';
import type {
  ExitPattern,
  FrictionPattern,
  PathPattern,
  SessionPatternsResponse,
} from './session_patterns';
import type {
  SessionFacetBucket,
  SessionListFacets,
  SessionListResponse,
  SessionListStats,
} from './session_replay';

export const mergeFunnelResponses = (
  settled: SessionFunnelResponse,
  live: SessionFunnelResponse
): SessionFunnelResponse => {
  const length = Math.max(settled.steps.length, live.steps.length);
  const steps = Array.from({ length }, (_, index) => {
    const left = settled.steps[index];
    const right = live.steps[index];
    const count = (left?.count ?? 0) + (right?.count ?? 0);
    const prevCount =
      index === 0
        ? count
        : (settled.steps[index - 1]?.count ?? 0) + (live.steps[index - 1]?.count ?? 0);
    const start = (settled.steps[0]?.count ?? 0) + (live.steps[0]?.count ?? 0);
    return {
      label: left?.label ?? right?.label ?? '',
      type: left?.type ?? right?.type ?? 'page',
      value: left?.value ?? right?.value ?? '',
      count,
      conversionFromStart: start === 0 ? 0 : count / start,
      conversionFromPrevious: prevCount === 0 ? 0 : count / prevCount,
      dropOffCount: index === 0 ? 0 : Math.max(0, prevCount - count),
      sampleDroppedSessionIds: [
        ...(left?.sampleDroppedSessionIds ?? []),
        ...(right?.sampleDroppedSessionIds ?? []),
      ].slice(0, FUNNEL_SESSION_SAMPLE_SIZE),
    };
  });
  return {
    sessionsConsidered: settled.sessionsConsidered + live.sessionsConsidered,
    steps,
  };
};

const mergeFacetBuckets = (
  left: SessionFacetBucket[],
  right: SessionFacetBucket[]
): SessionFacetBucket[] => {
  const counts = new Map<string, number>();
  for (const bucket of [...left, ...right]) {
    counts.set(bucket.key, (counts.get(bucket.key) ?? 0) + bucket.count);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
};

const mergeFacets = (left: SessionListFacets, right: SessionListFacets): SessionListFacets => ({
  browsers: mergeFacetBuckets(left.browsers, right.browsers),
  os: mergeFacetBuckets(left.os, right.os),
  countries: mergeFacetBuckets(left.countries, right.countries),
  users: mergeFacetBuckets(left.users, right.users),
  hasReplay: left.hasReplay + right.hasReplay,
  hasErrors: left.hasErrors + right.hasErrors,
  hasRage: left.hasRage + right.hasRage,
  hasBounced: left.hasBounced + right.hasBounced,
});

const mergeStats = (left: SessionListStats, right: SessionListStats): SessionListStats => ({
  total: left.total + right.total,
  withReplay: left.withReplay + right.withReplay,
  withErrors: left.withErrors + right.withErrors,
  rageClicks: left.rageClicks + right.rageClicks,
  medianDurationMs: left.medianDurationMs,
  bounced: left.bounced + right.bounced,
  viewed: left.viewed + right.viewed,
});

/** Live must already be S_new (IDs not in the session index). Totals add. */
export const mergeSessionListResponses = (
  settled: SessionListResponse,
  live: SessionListResponse,
  perPage: number
): SessionListResponse => {
  const seen = new Set(live.sessions.map((session) => session.sessionId));
  return {
    sessions: [
      ...live.sessions,
      ...settled.sessions.filter((session) => !seen.has(session.sessionId)),
    ].slice(0, perPage),
    total: settled.total + live.total,
    facets: mergeFacets(settled.facets, live.facets),
    stats: mergeStats(settled.stats, live.stats),
  };
};

const mergePathPatterns = (
  left: PathPattern[],
  right: PathPattern[],
  total: number
): PathPattern[] => {
  const groups = new Map<string, PathPattern>();
  for (const row of [...left, ...right]) {
    const key = `${row.kind}:${row.steps.join('\u0001')}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...row, sampleSessionIds: [...row.sampleSessionIds] });
      continue;
    }
    existing.sessionCount += row.sessionCount;
    existing.errorSessionCount += row.errorSessionCount;
    existing.rageSessionCount += row.rageSessionCount;
    existing.sampleSessionIds = [...existing.sampleSessionIds, ...row.sampleSessionIds].slice(
      0,
      FUNNEL_SESSION_SAMPLE_SIZE
    );
  }
  return [...groups.values()]
    .map((row) => ({ ...row, share: total === 0 ? 0 : row.sessionCount / total }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 10);
};

const mergeExits = (left: ExitPattern[], right: ExitPattern[], total: number): ExitPattern[] => {
  const groups = new Map<string, ExitPattern>();
  for (const row of [...left, ...right]) {
    const key = `${row.kind}:${row.step}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...row, sampleSessionIds: [...row.sampleSessionIds] });
      continue;
    }
    existing.sessionCount += row.sessionCount;
    existing.sampleSessionIds = [...existing.sampleSessionIds, ...row.sampleSessionIds].slice(
      0,
      FUNNEL_SESSION_SAMPLE_SIZE
    );
  }
  return [...groups.values()]
    .map((row) => ({ ...row, share: total === 0 ? 0 : row.sessionCount / total }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 10);
};

const mergeFriction = (
  left: FrictionPattern[],
  right: FrictionPattern[],
  total: number
): FrictionPattern[] => {
  const groups = new Map<string, FrictionPattern>();
  for (const row of [...left, ...right]) {
    const key = `${row.kind}:${row.step}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...row, sampleSessionIds: [...row.sampleSessionIds] });
      continue;
    }
    existing.sessionCount += row.sessionCount;
    existing.sampleSessionIds = [...existing.sampleSessionIds, ...row.sampleSessionIds].slice(
      0,
      FUNNEL_SESSION_SAMPLE_SIZE
    );
  }
  return [...groups.values()]
    .map((row) => ({ ...row, share: total === 0 ? 0 : row.sessionCount / total }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 8);
};

export const mergePatternResponses = (
  settled: SessionPatternsResponse,
  live: SessionPatternsResponse
): SessionPatternsResponse => {
  const total = settled.sessionsConsidered + live.sessionsConsidered;
  return {
    sessionsConsidered: total,
    journeys: mergePathPatterns(settled.journeys, live.journeys, total),
    activities: mergePathPatterns(settled.activities, live.activities, total),
    exits: mergeExits(settled.exits, live.exits, total),
    friction: mergeFriction(settled.friction, live.friction, total),
  };
};
