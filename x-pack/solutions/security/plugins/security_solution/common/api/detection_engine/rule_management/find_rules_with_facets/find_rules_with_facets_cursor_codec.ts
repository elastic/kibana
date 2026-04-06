/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Opaque cursor encoding for `_find_with_facets` (base64(JSON), lists-plugin style).
 */
export const FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION = 1 as const;

/** Values compatible with Elasticsearch `search_after` / saved-object `sort` arrays. */
export type FindRulesWithFacetsCursorSortValue = string | number | boolean | null;

export interface FindRulesWithFacetsCursorPit {
  readonly id: string;
  readonly keepAlive?: string;
}

export interface FindRulesWithFacetsCursorPayload {
  readonly v: typeof FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION;
  readonly searchAfter: readonly FindRulesWithFacetsCursorSortValue[];
  readonly pit?: FindRulesWithFacetsCursorPit;
}

export type DecodeFindRulesWithFacetsCursorResult =
  | { readonly ok: true; readonly value: FindRulesWithFacetsCursorPayload }
  | { readonly ok: false; readonly error: string };

const isPlainObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

const isSortValue = (item: unknown): item is FindRulesWithFacetsCursorSortValue =>
  item === null ||
  typeof item === 'string' ||
  typeof item === 'number' ||
  typeof item === 'boolean';

export const encodeFindRulesWithFacetsCursor = (
  payload: FindRulesWithFacetsCursorPayload
): string => {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

export const decodeFindRulesWithFacetsCursor = (
  cursor: string
): DecodeFindRulesWithFacetsCursorResult => {
  if (cursor.length === 0) {
    return { ok: false, error: 'cursor must be a non-empty string' };
  }

  let json: string;
  try {
    json = Buffer.from(cursor, 'base64').toString('utf8');
  } catch {
    return { ok: false, error: 'cursor is not valid base64' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'cursor payload is not valid JSON' };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'cursor payload must be a JSON object' };
  }

  if (parsed.v !== FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION) {
    return { ok: false, error: 'unsupported cursor schema version' };
  }

  if (!Array.isArray(parsed.searchAfter)) {
    return { ok: false, error: 'cursor.searchAfter must be an array' };
  }

  if (!parsed.searchAfter.every(isSortValue)) {
    return {
      ok: false,
      error:
        'cursor.searchAfter values must be string, number, boolean, or null (Elasticsearch sort values)',
    };
  }

  if (parsed.searchAfter.length === 0) {
    return { ok: false, error: 'cursor.searchAfter must be non-empty' };
  }

  let pit: FindRulesWithFacetsCursorPit | undefined;
  if (parsed.pit !== undefined) {
    if (!isPlainObject(parsed.pit) || typeof parsed.pit.id !== 'string') {
      return { ok: false, error: 'cursor.pit must be an object with id: string' };
    }
    const keepAliveRaw = parsed.pit.keepAlive;
    if (
      keepAliveRaw !== undefined &&
      (typeof keepAliveRaw !== 'string' || keepAliveRaw.length === 0)
    ) {
      return { ok: false, error: 'cursor.pit.keepAlive must be a non-empty string when provided' };
    }
    pit = {
      id: parsed.pit.id,
      ...(typeof keepAliveRaw === 'string' ? { keepAlive: keepAliveRaw } : {}),
    };
  }

  return {
    ok: true,
    value: {
      v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
      searchAfter: parsed.searchAfter,
      ...(pit != null ? { pit } : {}),
    },
  };
};
