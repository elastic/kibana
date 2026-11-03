/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mergeFunnelResponses,
  mergePatternResponses,
  mergeSessionListResponses,
} from './rum_sessions_merge';
import type { SessionFunnelResponse } from './session_funnel';
import type { SessionPatternsResponse } from './session_patterns';
import type { RumSessionSummary, SessionListResponse } from './session_replay';

const step = (value: string, count: number): SessionFunnelResponse['steps'][number] => ({
  label: value,
  type: 'page',
  value,
  count,
  conversionFromStart: 0,
  conversionFromPrevious: 0,
  dropOffCount: 0,
  sampleDroppedSessionIds: [],
});

describe('mergeFunnelResponses', () => {
  it('adds step counts and recomputes conversion', () => {
    const merged = mergeFunnelResponses(
      { sessionsConsidered: 10, steps: [step('a', 8), step('b', 4)] },
      { sessionsConsidered: 5, steps: [step('a', 2), step('b', 1)] }
    );
    expect(merged.sessionsConsidered).toBe(15);
    expect(merged.steps[0].count).toBe(10);
    expect(merged.steps[1].count).toBe(5);
    expect(merged.steps[1].conversionFromStart).toBe(0.5);
    expect(merged.steps[1].dropOffCount).toBe(5);
  });
});

const emptyFacets = {
  browsers: [] as Array<{ key: string; count: number }>,
  os: [],
  countries: [],
  users: [],
  hasReplay: 0,
  hasErrors: 0,
  hasRage: 0,
  hasBounced: 0,
};

const summary = (sessionId: string): RumSessionSummary => ({
  sessionId,
  startTime: null,
  endTime: null,
  eventCount: 1,
  errorCount: 0,
  actionCount: 0,
  rageClickCount: 0,
  deadClickCount: 0,
  errorGroups: [],
  activeMs: 0,
  durationMs: 0,
  pageCount: 1,
  entryPage: null,
  exitPage: null,
  pagePath: [],
  activityPath: [],
  sparkline: [],
  user: { id: null, email: null, name: null },
  client: {
    browser: null,
    os: null,
    device: null,
    mobile: null,
    country: null,
    countryIso: null,
    breakpoint: null,
    connection: null,
  },
  hasReplay: false,
  replayEventCount: 0,
});

describe('mergeSessionListResponses', () => {
  it('prepends new tail rows and sums disjoint totals', () => {
    const settled: SessionListResponse = {
      sessions: [summary('a'), summary('b')],
      total: 20,
      facets: { ...emptyFacets, hasReplay: 3 },
      stats: {
        total: 20,
        withReplay: 3,
        withErrors: 1,
        rageClicks: 2,
        medianDurationMs: 1000,
        bounced: 4,
        viewed: 16,
      },
    };
    const live: SessionListResponse = {
      sessions: [summary('c'), summary('d')],
      total: 2,
      facets: { ...emptyFacets, hasReplay: 1 },
      stats: {
        total: 2,
        withReplay: 1,
        withErrors: 0,
        rageClicks: 0,
        medianDurationMs: 10,
        bounced: 1,
        viewed: 2,
      },
    };
    const merged = mergeSessionListResponses(settled, live, 25);
    expect(merged.sessions.map((session) => session.sessionId)).toEqual(['c', 'd', 'a', 'b']);
    expect(merged.total).toBe(22);
    expect(merged.facets.hasReplay).toBe(4);
    expect(merged.stats.medianDurationMs).toBe(1000);
    expect(merged.stats.bounced).toBe(5);
    expect(merged.stats.viewed).toBe(18);
  });
});

const emptyPatterns = (): SessionPatternsResponse => ({
  sessionsConsidered: 0,
  journeys: [],
  activities: [],
  exits: [],
  friction: [],
});

describe('mergePatternResponses', () => {
  it('combines journeys that share a path', () => {
    const settled: SessionPatternsResponse = {
      ...emptyPatterns(),
      sessionsConsidered: 8,
      journeys: [
        {
          kind: 'page',
          steps: ['catalog', 'cart'],
          sessionCount: 6,
          share: 0.75,
          errorSessionCount: 1,
          rageSessionCount: 0,
          sampleSessionIds: ['s1'],
        },
      ],
    };
    const live: SessionPatternsResponse = {
      ...emptyPatterns(),
      sessionsConsidered: 2,
      journeys: [
        {
          kind: 'page',
          steps: ['catalog', 'cart'],
          sessionCount: 2,
          share: 1,
          errorSessionCount: 0,
          rageSessionCount: 1,
          sampleSessionIds: ['s2'],
        },
      ],
    };
    const merged = mergePatternResponses(settled, live);
    expect(merged.sessionsConsidered).toBe(10);
    expect(merged.journeys[0].sessionCount).toBe(8);
    expect(merged.journeys[0].share).toBe(0.8);
    expect(merged.journeys[0].sampleSessionIds).toEqual(['s1', 's2']);
  });
});
