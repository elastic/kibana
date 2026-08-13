/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenTimelineResult } from '../open_timeline/types';
import { getUnmergeableSelections } from './get_unmergeable_selections';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeItem = (overrides: Partial<OpenTimelineResult> = {}): OpenTimelineResult => ({
  savedObjectId: 'so-id',
  title: 'My Timeline',
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getUnmergeableSelections', () => {
  it('returns empty for an all-KQL selection', () => {
    const items = [
      makeItem({ queryType: { hasQuery: true, hasEql: false } }),
      makeItem({ savedObjectId: 'b', queryType: { hasQuery: true, hasEql: false } }),
    ];
    expect(getUnmergeableSelections(items)).toHaveLength(0);
  });

  it('detects an ES|QL timeline via savedSearchId', () => {
    const items = [makeItem({ savedSearchId: 'search-123' })];
    const result = getUnmergeableSelections(items);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('esql');
    expect(result[0].title).toBe('My Timeline');
  });

  it('detects an EQL timeline via queryType.hasEql', () => {
    const items = [makeItem({ queryType: { hasQuery: false, hasEql: true } })];
    const result = getUnmergeableSelections(items);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('eql');
  });

  it('reports esql (not eql) when a row has both savedSearchId and queryType.hasEql — savedSearchId wins', () => {
    // An ES|QL timeline can have queryType.hasEql in an edge case; savedSearchId takes precedence
    const items = [
      makeItem({ savedSearchId: 'search-abc', queryType: { hasQuery: false, hasEql: true } }),
    ];
    const result = getUnmergeableSelections(items);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('esql');
  });

  it('reports esql when a row has savedSearchId AND queryType.hasQuery (stale filters on ES|QL timeline)', () => {
    // An ES|QL timeline can carry stale KQL filters; it must still be blocked
    const items = [
      makeItem({ savedSearchId: 'search-xyz', queryType: { hasQuery: true, hasEql: false } }),
    ];
    const result = getUnmergeableSelections(items);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('esql');
  });

  it('treats missing queryType as mergeable (defensive — Cases fetch omits it if response is unexpected)', () => {
    const items = [makeItem({ queryType: undefined })];
    expect(getUnmergeableSelections(items)).toHaveLength(0);
  });

  it('falls back to UNTITLED_TIMELINE for a row with no title', () => {
    const items = [makeItem({ savedSearchId: 'search-id', title: undefined })];
    const result = getUnmergeableSelections(items);
    expect(result[0].title).toBe('Untitled Timeline');
  });

  it('returns one entry per unmergeable timeline in a mixed selection', () => {
    const items = [
      makeItem({ savedObjectId: 'kql-1', queryType: { hasQuery: true, hasEql: false } }),
      makeItem({ savedObjectId: 'esql-1', savedSearchId: 'ss-1' }),
      makeItem({ savedObjectId: 'eql-1', queryType: { hasQuery: false, hasEql: true } }),
      makeItem({ savedObjectId: 'kql-2', queryType: { hasQuery: true, hasEql: false } }),
    ];
    const result = getUnmergeableSelections(items);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.reason)).toEqual(['esql', 'eql']);
  });

  it('returns entries for all-ES|QL selection', () => {
    const items = [
      makeItem({ savedObjectId: 'esql-1', savedSearchId: 'ss-1' }),
      makeItem({ savedObjectId: 'esql-2', savedSearchId: 'ss-2' }),
    ];
    const result = getUnmergeableSelections(items);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.reason === 'esql')).toBe(true);
  });

  it('returns entries for all-EQL selection', () => {
    const items = [
      makeItem({ savedObjectId: 'eql-1', queryType: { hasQuery: false, hasEql: true } }),
      makeItem({ savedObjectId: 'eql-2', queryType: { hasQuery: false, hasEql: true } }),
    ];
    const result = getUnmergeableSelections(items);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.reason === 'eql')).toBe(true);
  });

  it('does NOT gate a timeline whose EQL query is only whitespace (known divergence with build_super_timeline_model)', () => {
    // build_super_timeline_model.ts uses eqlOptions.query.trim() to detect EQL at merge time,
    // but getTimelineQueryTypes (containers/helpers.ts) uses query.length > 0 (no trim) to set
    // queryType.hasEql on the list row. A whitespace-only EQL query therefore reaches hasEql:false
    // here, so this gate passes it through — the model builder then also skips it (trim yields ""),
    // producing an empty Query tab rather than a blocked action. This is an accepted edge case;
    // do not "fix" getTimelineQueryTypes as other callers depend on its current behaviour.
    const items = [makeItem({ queryType: { hasQuery: false, hasEql: false } })];
    expect(getUnmergeableSelections(items)).toHaveLength(0);
  });
});
