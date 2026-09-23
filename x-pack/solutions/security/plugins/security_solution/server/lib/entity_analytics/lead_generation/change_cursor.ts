/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CursorPayload {
  version: 1;
  // Epoch millis of the `changed_at` field of the last returned doc.
  changedAt: number;
  // Document `_id` of the last returned doc. Breaks ties when docs share the same `changed_at`.
  docId: string;
}

/** Encodes a (changed_at epoch ms, doc id) tuple as an opaque base64url cursor. */
export const encodeCursor = (changedAt: number, docId: string): string => {
  const payload: CursorPayload = { version: 1, changedAt, docId };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

/** Decodes an opaque cursor string. Throws if the token is malformed or has an unsupported version. */
export const decodeCursor = (encoded: string): CursorPayload => {
  let parsed: Partial<CursorPayload>;
  try {
    parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as Partial<CursorPayload>;
  } catch {
    throw new Error('Invalid cursor: failed to decode');
  }

  if (
    parsed.version !== 1 ||
    typeof parsed.changedAt !== 'number' ||
    typeof parsed.docId !== 'string'
  ) {
    throw new Error(`Invalid or unsupported cursor: ${JSON.stringify(parsed)}`);
  }

  return parsed as CursorPayload;
};
