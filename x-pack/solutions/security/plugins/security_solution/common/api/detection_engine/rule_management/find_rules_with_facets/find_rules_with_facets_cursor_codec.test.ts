/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  decodeFindRulesWithFacetsCursor,
  encodeFindRulesWithFacetsCursor,
  FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
} from './find_rules_with_facets_cursor_codec';

describe('findRulesWithFacetsCursorCodec', () => {
  it('round-trips search_after values', () => {
    const payload = {
      v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
      searchAfter: ['alert.id', 'rule-1'],
    } as const;
    const encoded = encodeFindRulesWithFacetsCursor(payload);
    const decoded = decodeFindRulesWithFacetsCursor(encoded);
    expect(decoded).toEqual({ ok: true, value: payload });
  });

  it('rejects empty cursor', () => {
    expect(decodeFindRulesWithFacetsCursor('')).toEqual({
      ok: false,
      error: 'cursor must be a non-empty string',
    });
  });

  it('rejects invalid JSON payload', () => {
    const encoded = Buffer.from('not-json').toString('base64');
    expect(decodeFindRulesWithFacetsCursor(encoded)).toEqual({
      ok: false,
      error: 'cursor payload is not valid JSON',
    });
  });

  it('rejects wrong schema version', () => {
    const encoded = Buffer.from(JSON.stringify({ v: 99, searchAfter: [] })).toString('base64');
    expect(decodeFindRulesWithFacetsCursor(encoded)).toEqual({
      ok: false,
      error: 'unsupported cursor schema version',
    });
  });

  it('rejects non-array searchAfter', () => {
    const encoded = Buffer.from(
      JSON.stringify({ v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION, searchAfter: 'x' })
    ).toString('base64');
    expect(decodeFindRulesWithFacetsCursor(encoded)).toEqual({
      ok: false,
      error: 'cursor.searchAfter must be an array',
    });
  });

  it('round-trips numeric and null sort values', () => {
    const payload = {
      v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
      searchAfter: ['rule-name', 42, null, false],
    } as const;
    const decoded = decodeFindRulesWithFacetsCursor(encodeFindRulesWithFacetsCursor(payload));
    expect(decoded).toEqual({ ok: true, value: payload });
  });

  it('rejects empty searchAfter', () => {
    const encoded = Buffer.from(
      JSON.stringify({ v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION, searchAfter: [] })
    ).toString('base64');
    expect(decodeFindRulesWithFacetsCursor(encoded)).toEqual({
      ok: false,
      error: 'cursor.searchAfter must be non-empty',
    });
  });

  it('rejects object entries in searchAfter', () => {
    const encoded = Buffer.from(
      JSON.stringify({
        v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
        searchAfter: [{}],
      })
    ).toString('base64');
    expect(decodeFindRulesWithFacetsCursor(encoded).ok).toBe(false);
  });

  it('round-trips optional pit', () => {
    const payload = {
      v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
      searchAfter: ['x'],
      pit: { id: 'pit-1', keepAlive: '5m' },
    } as const;
    expect(decodeFindRulesWithFacetsCursor(encodeFindRulesWithFacetsCursor(payload))).toEqual({
      ok: true,
      value: payload,
    });
  });
});
