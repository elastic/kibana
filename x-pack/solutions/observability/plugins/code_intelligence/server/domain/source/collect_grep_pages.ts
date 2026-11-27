/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationError } from '../models/operation_result';
import type { GrepMatch, GrepRequest, SourceReader } from '../ports/source_reader';

/** Returns all successfully read grep hits plus any failure that made coverage incomplete. */
export interface CollectedGrepPages {
  readonly error?: OperationError;
  readonly failureKind?: 'grep' | 'pagination';
  readonly items: readonly GrepMatch[];
}

/** Reads every grep page while rejecting missing or repeated continuation cursors. */
export const collectGrepPages = async ({
  invalidCursorMessage,
  reader,
  request,
}: {
  readonly invalidCursorMessage: (cursor: string) => string;
  readonly reader: SourceReader;
  readonly request: Omit<GrepRequest, 'cursor'>;
}): Promise<CollectedGrepPages> => {
  /** Retains partial successful hits so callers can preserve diagnostics and independent evidence. */
  const items: GrepMatch[] = [];
  /** Tracks continuation tokens to prevent adapters from creating an infinite page loop. */
  const cursors = new Set<string>();
  /** Is absent for the first request and supplied only after verified progress. */
  let cursor: string | undefined;
  for (;;) {
    /** Requests one immutable source page with the caller's unchanged search scope. */
    const page = await reader.grep({
      ...request,
      ...(cursor === undefined ? {} : { cursor }),
    });
    if (page.status === 'failure') {
      return { error: page.error, failureKind: 'grep', items };
    }
    items.push(...page.items);
    if (page.status === 'complete') return { items };
    /** Missing or repeated cursors make complete source coverage unprovable. */
    const nextCursor = page.nextCursor;
    if (nextCursor.length === 0 || cursors.has(nextCursor)) {
      return {
        error: {
          code: 'invalid_grep_cursor',
          message: invalidCursorMessage(nextCursor),
          retryable: false,
        },
        failureKind: 'pagination',
        items,
      };
    }
    cursors.add(nextCursor);
    cursor = nextCursor;
  }
};
