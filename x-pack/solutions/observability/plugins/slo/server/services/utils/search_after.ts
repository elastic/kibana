/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsCompositeAggregateKey,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';

type SearchAfterCursor = AggregationsCompositeAggregateKey | SortResults;

export const encodeSearchAfter = (cursor: SearchAfterCursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64');

export function decodeSearchAfter<T extends SearchAfterCursor = AggregationsCompositeAggregateKey>(
  token: string
): T | undefined {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as T;
  } catch {
    return undefined;
  }
}
