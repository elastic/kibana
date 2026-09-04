/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FUNNEL_SESSION_SAMPLE_SIZE } from './session_funnel';

export const PATTERN_LIMIT = 10;
export const FRICTION_LIMIT = 8;

export interface PatternSession {
  sessionId: string;
  pagePath: string[];
  activityPath: string[];
  errorCount: number;
  rageClickCount: number;
}

export type PathPatternKind = 'page' | 'activity';

export interface PathPattern {
  kind: PathPatternKind;
  steps: string[];
  sessionCount: number;
  share: number;
  errorSessionCount: number;
  rageSessionCount: number;
  sampleSessionIds: string[];
}

export interface ExitPattern {
  kind: PathPatternKind;
  step: string;
  sessionCount: number;
  share: number;
  sampleSessionIds: string[];
}

export interface FrictionPattern {
  kind: 'errors' | 'rage';
  step: string;
  sessionCount: number;
  share: number;
  sampleSessionIds: string[];
}

export interface SessionPatternsResponse {
  sessionsConsidered: number;
  journeys: PathPattern[];
  activities: PathPattern[];
  exits: ExitPattern[];
  friction: FrictionPattern[];
}

const pathKey = (steps: string[]): string => steps.join('\u0001');

const clusterPaths = (
  sessions: PatternSession[],
  getSteps: (session: PatternSession) => string[],
  kind: PathPatternKind,
  limit: number
): PathPattern[] => {
  const groups = new Map<string, PatternSession[]>();
  const stepsByKey = new Map<string, string[]>();
  for (const session of sessions) {
    const steps = getSteps(session).filter((step) => step.length > 0);
    if (steps.length === 0) {
      continue;
    }
    const key = pathKey(steps);
    const existing = groups.get(key);
    if (existing) {
      existing.push(session);
    } else {
      groups.set(key, [session]);
      stepsByKey.set(key, steps);
    }
  }

  const total = sessions.length;
  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit)
    .map(([key, grouped]) => ({
      kind,
      steps: stepsByKey.get(key) ?? [],
      sessionCount: grouped.length,
      share: total === 0 ? 0 : grouped.length / total,
      errorSessionCount: grouped.filter((session) => session.errorCount > 0).length,
      rageSessionCount: grouped.filter((session) => session.rageClickCount > 0).length,
      sampleSessionIds: grouped
        .map((session) => session.sessionId)
        .slice(0, FUNNEL_SESSION_SAMPLE_SIZE),
    }));
};

const clusterLastStep = (
  sessions: PatternSession[],
  getSteps: (session: PatternSession) => string[],
  kind: PathPatternKind,
  limit: number
): ExitPattern[] => {
  const groups = new Map<string, PatternSession[]>();
  for (const session of sessions) {
    const steps = getSteps(session);
    const last = steps[steps.length - 1];
    if (!last) {
      continue;
    }
    const existing = groups.get(last);
    if (existing) {
      existing.push(session);
    } else {
      groups.set(last, [session]);
    }
  }

  const total = sessions.length;
  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit)
    .map(([step, grouped]) => ({
      kind,
      step,
      sessionCount: grouped.length,
      share: total === 0 ? 0 : grouped.length / total,
      sampleSessionIds: grouped
        .map((session) => session.sessionId)
        .slice(0, FUNNEL_SESSION_SAMPLE_SIZE),
    }));
};

const lastPageOrActivity = (session: PatternSession): string | null =>
  session.pagePath[session.pagePath.length - 1] ??
  session.activityPath[session.activityPath.length - 1] ??
  null;

const clusterFriction = (sessions: PatternSession[]): FrictionPattern[] => {
  const total = sessions.length;
  const group = (subset: PatternSession[], kind: FrictionPattern['kind']): FrictionPattern[] => {
    const groups = new Map<string, PatternSession[]>();
    for (const session of subset) {
      const step = lastPageOrActivity(session);
      if (!step) {
        continue;
      }
      const existing = groups.get(step);
      if (existing) {
        existing.push(session);
      } else {
        groups.set(step, [session]);
      }
    }
    return [...groups.entries()].map(([step, grouped]) => ({
      kind,
      step,
      sessionCount: grouped.length,
      share: total === 0 ? 0 : grouped.length / total,
      sampleSessionIds: grouped
        .map((session) => session.sessionId)
        .slice(0, FUNNEL_SESSION_SAMPLE_SIZE),
    }));
  };

  return [
    ...group(
      sessions.filter((session) => session.errorCount > 0),
      'errors'
    ),
    ...group(
      sessions.filter((session) => session.rageClickCount > 0),
      'rage'
    ),
  ]
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, FRICTION_LIMIT);
};

/** Group sampled sessions into recurring journeys, exits, and friction. */
export const computePatterns = (sessions: PatternSession[]): SessionPatternsResponse => ({
  sessionsConsidered: sessions.length,
  journeys: clusterPaths(sessions, (session) => session.pagePath, 'page', PATTERN_LIMIT),
  activities: clusterPaths(sessions, (session) => session.activityPath, 'activity', PATTERN_LIMIT),
  exits: clusterLastStep(sessions, (session) => session.pagePath, 'page', PATTERN_LIMIT),
  friction: clusterFriction(sessions),
});
