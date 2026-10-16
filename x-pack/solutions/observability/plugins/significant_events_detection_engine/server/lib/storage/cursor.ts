/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { DetectionEngineError } from '../errors';

/** Opaque page cursor: the sort values of the last item, so pages stay stable under writes. */
export function encodeCursor(sort: estypes.SortResults | undefined): string | undefined {
  return sort ? Buffer.from(JSON.stringify(sort)).toString('base64url') : undefined;
}

export function decodeCursor(cursor: string | undefined): estypes.SortResults | undefined {
  if (!cursor) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(parsed)) {
      return parsed as estypes.SortResults;
    }
  } catch (error) {
    // Falls through to the error below; a cursor is never partially trusted.
  }
  throw new DetectionEngineError('The page cursor is not valid', 400);
}
