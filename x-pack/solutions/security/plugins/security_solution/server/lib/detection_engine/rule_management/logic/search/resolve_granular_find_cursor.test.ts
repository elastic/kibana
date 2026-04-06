/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  encodeFindRulesWithFacetsCursor,
  FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
} from '../../../../../../common/api/detection_engine/rule_management';
import { resolveGranularFindCursor } from './resolve_granular_find_cursor';

describe('resolveGranularFindCursor', () => {
  it('returns empty resolution when cursor is absent', () => {
    expect(resolveGranularFindCursor(undefined, 'name', 'asc')).toEqual({ ok: true });
  });

  it('fails when cursor is invalid', () => {
    const r = resolveGranularFindCursor('not-json', 'name', 'asc');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.length).toBeGreaterThan(0);
    }
  });

  it('fails when cursor is present but sort is missing', () => {
    const cursor = encodeFindRulesWithFacetsCursor({
      v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
      searchAfter: ['x'],
    });
    expect(resolveGranularFindCursor(cursor, undefined, undefined)).toEqual({
      ok: false,
      error:
        'cursor requires sort; pass the same sort tokens as the request that produced the cursor (e.g. sort=name:asc)',
    });
  });

  it('returns searchAfter and pit when decode succeeds', () => {
    const cursor = encodeFindRulesWithFacetsCursor({
      v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
      searchAfter: ['a', 1],
      pit: { id: 'pit-1', keepAlive: '5m' },
    });
    expect(resolveGranularFindCursor(cursor, 'name', 'desc')).toEqual({
      ok: true,
      searchAfter: ['a', 1],
      pit: { id: 'pit-1', keepAlive: '5m' },
    });
  });
});
