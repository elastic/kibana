/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_SOURCE,
  HAS_DATA_STATE,
  MIXED_STATE,
  NO_DATA_STATE,
  SAMPLE_EVENT_SOURCE,
  SEARCH_SOURCE,
  SEARCH_STATE,
} from './components/shared/test_helpers';
import { getEventSources, getGateAudience, resolveJourney, toEventsState } from './journey';

describe('getGateAudience', () => {
  it('addresses events only when analytics was asked for', () => {
    expect(getGateAudience('analytics')).toBe('events');
    expect(getGateAudience('search')).toBe('all');
    expect(getGateAudience(undefined)).toBe('all');
  });
});

describe('resolveJourney', () => {
  it('resolves nothing while the cluster holds no data', () => {
    expect(resolveJourney(NO_DATA_STATE, 'analytics')).toBeUndefined();
  });

  it('follows the data when there is one kind, whatever was picked', () => {
    expect(resolveJourney(HAS_DATA_STATE, 'search')).toEqual({
      journey: 'analytics',
      alternative: undefined,
    });
    expect(resolveJourney(SEARCH_STATE, 'analytics')).toEqual({
      journey: 'search',
      alternative: undefined,
    });
  });

  it("defaults mixed data to the journey of the user's largest own source", () => {
    expect(resolveJourney(MIXED_STATE, undefined)).toEqual({
      journey: 'analytics',
      alternative: 'search',
    });
    expect(
      resolveJourney({ journey: 'mixed', sources: [SEARCH_SOURCE, EVENT_SOURCE] }, undefined)
    ).toEqual({ journey: 'search', alternative: 'analytics' });
    expect(
      resolveJourney({ journey: 'mixed', sources: [SAMPLE_EVENT_SOURCE, SEARCH_SOURCE] }, undefined)
    ).toEqual({ journey: 'search', alternative: 'analytics' });
  });

  it("uses the largest sample when no source is the user's own", () => {
    expect(
      resolveJourney(
        {
          journey: 'mixed',
          sources: [SAMPLE_EVENT_SOURCE, { ...SEARCH_SOURCE, isSampleData: true }],
        },
        undefined
      )
    ).toEqual({ journey: 'analytics', alternative: 'search' });
  });

  it('lets the picked journey win for mixed data', () => {
    expect(resolveJourney(MIXED_STATE, 'search')).toEqual({
      journey: 'search',
      alternative: 'analytics',
    });
  });

  it.each(['analytics', 'mixed'] as const)(
    'falls back to search when the %s journey has no listed event source',
    (journey) => {
      expect(resolveJourney({ journey, sources: [SEARCH_SOURCE] }, 'analytics')).toEqual({
        journey: 'search',
        alternative: undefined,
      });
    }
  );
});

describe('toEventsState', () => {
  it('returns the state untouched when it lists no search source', () => {
    expect(toEventsState(HAS_DATA_STATE)).toBe(HAS_DATA_STATE);
  });

  it('keeps event sources only and counts their documents when every source is listed', () => {
    const state = toEventsState(MIXED_STATE);

    expect(state.sources).toEqual([EVENT_SOURCE]);
    expect(getEventSources(MIXED_STATE.sources)).toEqual([EVENT_SOURCE]);
    expect(state.totalSources).toBe(1);
    expect(state.documentsCount).toBe(EVENT_SOURCE.documentsCount);
  });

  it('subtracts the listed search sources when more sources exist than are listed', () => {
    const state = toEventsState({ ...MIXED_STATE, totalSources: 9, documentsCount: 5_000_000 });

    expect(state.totalSources).toBe(8);
    expect(state.documentsCount).toBe(5_000_000 - 48_000);
  });

  it('reports no count when a count is unknown', () => {
    expect(
      toEventsState({
        ...MIXED_STATE,
        sources: [{ ...EVENT_SOURCE, documentsCount: null }, SEARCH_SOURCE],
      }).documentsCount
    ).toBeNull();
  });
});
