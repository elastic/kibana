/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ReportCursorPayload {
  version: 1;
  /** Primary sort value and document `_id` tiebreak from the last returned hit. */
  sortValues: [string | number | null, string];
}

/** Encodes a `[primarySort, docId]` tuple as an opaque base64url cursor. */
export const encodeCursor = (sortValues: [string | number | null, string]): string => {
  const payload: ReportCursorPayload = { version: 1, sortValues };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

/** Decodes an opaque cursor string. Throws if the token is malformed or has an unsupported version. */
export const decodeCursor = (encoded: string): ReportCursorPayload => {
  let parsed: Partial<ReportCursorPayload>;
  try {
    parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as Partial<ReportCursorPayload>;
  } catch {
    throw new Error('Invalid cursor: failed to decode');
  }

  if (
    parsed.version !== 1 ||
    !Array.isArray(parsed.sortValues) ||
    parsed.sortValues.length !== 2 ||
    typeof parsed.sortValues[1] !== 'string'
  ) {
    throw new Error(`Invalid or unsupported cursor: ${JSON.stringify(parsed)}`);
  }

  const primary = parsed.sortValues[0];
  if (primary !== null && typeof primary !== 'string' && typeof primary !== 'number') {
    throw new Error(`Invalid or unsupported cursor: ${JSON.stringify(parsed)}`);
  }

  return {
    version: 1,
    sortValues: [primary, parsed.sortValues[1]],
  };
};
