/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CURSOR_VERSION = 1;

export interface PrebuiltReviewCursorPayload {
  v: typeof CURSOR_VERSION;
  /** Start offset into the sorted candidate id list */
  i: number;
}

export const encodePrebuiltReviewCursor = (startIndex: number): string => {
  const payload: PrebuiltReviewCursorPayload = { v: CURSOR_VERSION, i: startIndex };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

export const decodePrebuiltReviewCursor = (
  cursor: string | undefined
): { ok: true; startIndex: number } | { ok: false; error: string } => {
  if (cursor == null || cursor.trim() === '') {
    return { ok: true, startIndex: 0 };
  }
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as PrebuiltReviewCursorPayload;
    if (
      parsed?.v !== CURSOR_VERSION ||
      typeof parsed.i !== 'number' ||
      !Number.isFinite(parsed.i)
    ) {
      return { ok: false, error: 'invalid cursor payload' };
    }
    if (parsed.i < 0) {
      return { ok: false, error: 'cursor index must be non-negative' };
    }
    return { ok: true, startIndex: Math.floor(parsed.i) };
  } catch {
    return { ok: false, error: 'malformed cursor' };
  }
};
