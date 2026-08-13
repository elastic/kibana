/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computePatterns, type PatternSession } from './session_patterns';

const session = (partial: Partial<PatternSession> & { sessionId: string }): PatternSession => ({
  pagePath: [],
  activityPath: [],
  errorCount: 0,
  rageClickCount: 0,
  ...partial,
});

describe('computePatterns', () => {
  it('ranks recurring page journeys and activity sequences', () => {
    const result = computePatterns([
      session({
        sessionId: 'a',
        pagePath: ['#catalog', '#cart'],
        activityPath: ['Add to cart', 'Checkout'],
      }),
      session({
        sessionId: 'b',
        pagePath: ['#catalog', '#cart'],
        activityPath: ['Add to cart'],
      }),
      session({
        sessionId: 'c',
        pagePath: ['#catalog'],
        activityPath: [],
        errorCount: 2,
      }),
    ]);

    expect(result.sessionsConsidered).toBe(3);
    expect(result.journeys[0].steps).toEqual(['#catalog', '#cart']);
    expect(result.journeys[0].sessionCount).toBe(2);
    expect(result.journeys[0].share).toBeCloseTo(2 / 3);
    expect(result.activities[0].steps).toEqual(['Add to cart', 'Checkout']);
    expect(result.exits[0].step).toBe('#cart');
    expect(result.friction[0]).toMatchObject({ kind: 'errors', step: '#catalog', sessionCount: 1 });
  });

  it('returns empty groups when there are no sessions', () => {
    const result = computePatterns([]);
    expect(result).toEqual({
      sessionsConsidered: 0,
      journeys: [],
      activities: [],
      exits: [],
      friction: [],
    });
  });
});
